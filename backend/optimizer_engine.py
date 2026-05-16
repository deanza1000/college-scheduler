import random
import math
from typing import Dict, List, Any, Tuple

import copy

class CourseSchedulerSA:
    def __init__(self, courses_data: Dict[str, Dict[str, Dict[str, List[Dict[str, Any]]]]], weights: Dict[str, float], selected_course_ids: List[str] = None, exclude_days: List[str] = None, preferred_num_days: int = None, preferred_start_times: Dict[str, str] = None):
        """
        Initialize the Simulated Annealing engine.
        
        :param courses_data: Dictionary mapping course_id -> activity_type -> instance_id -> list of sessions
                             Each session must have: 'start_time' (HH:MM), 'end_time' (HH:MM), 'day'
        :param weights: User-defined weights for soft constraints.
        :param selected_course_ids: Optional list of course IDs to schedule. If None, schedules all courses in courses_data.
        :param exclude_days: Optional list of day strings to penalize (e.g. ["א", "ה"]).
        :param preferred_num_days: Optional target number of active campus days.
        :param preferred_start_times: Optional mapping of day string to preferred start time (HH:MM).
        """
        if selected_course_ids:
            self.courses_data = {k: v for k, v in courses_data.items() if k in selected_course_ids}
        else:
            self.courses_data = courses_data
            
        self.weights = weights
        self.exclude_days = exclude_days or []
        self.preferred_num_days = preferred_num_days
        self.preferred_start_times = preferred_start_times or {}
        self.course_ids = list(self.courses_data.keys())

    def time_to_minutes(self, t_str: str) -> int:
        """Convert HH:MM to minutes since midnight."""
        h, m = map(int, t_str.split(':'))
        return h * 60 + m

    def get_overlap(self, s1: Dict[str, Any], s2: Dict[str, Any]) -> int:
        """Calculate overlap in minutes between two sessions."""
        if s1['day'] != s2['day']:
            return 0
        start1 = self.time_to_minutes(s1['start_time'])
        end1 = self.time_to_minutes(s1['end_time'])
        start2 = self.time_to_minutes(s2['start_time'])
        end2 = self.time_to_minutes(s2['end_time'])
        
        latest_start = max(start1, start2)
        earliest_end = min(end1, end2)
        overlap = earliest_end - latest_start
        return max(0, overlap)

    def generate_initial_state(self) -> Dict[str, Dict[str, str]]:
        """Generate a random initial schedule mapping course_id -> activity_type -> random instance_id."""
        state = {}
        for course_id, activities in self.courses_data.items():
            state[course_id] = {}
            for activity_type, instances in activities.items():
                state[course_id][activity_type] = random.choice(list(instances.keys()))
        return state

    def calculate_energy(self, state: Dict[str, Dict[str, str]]) -> Tuple[float, bool]:
        """
        Calculate total energy (cost) of the given state.
        Returns (total_energy, has_hard_violations)
        """
        hard_penalty = 0
        has_hard_violations = False
        
        # Collect all active sessions
        active_sessions = []
        for course_id, activities in state.items():
            if course_id in self.courses_data:
                for activity_type, instance_id in activities.items():
                    if activity_type in self.courses_data[course_id] and instance_id in self.courses_data[course_id][activity_type]:
                        sessions = self.courses_data[course_id][activity_type][instance_id]
                        active_sessions.extend(sessions)
                    else:
                        hard_penalty += 100000
                        has_hard_violations = True
            else:
                # Mandatory course dropped / invalid state
                hard_penalty += 100000
                has_hard_violations = True

        # Check for overlaps (Hard Constraint - Big M Method)
        for i in range(len(active_sessions)):
            for j in range(i + 1, len(active_sessions)):
                overlap = self.get_overlap(active_sessions[i], active_sessions[j])
                if overlap > 0:
                    hard_penalty += 500000 * overlap
                    has_hard_violations = True

        # Calculate soft constraints (Curved/Quadratic Penalties)
        soft_penalty = 0
        
        daily_schedules = {}
        for s in active_sessions:
            day = s['day']
            if day not in daily_schedules:
                daily_schedules[day] = []
            daily_schedules[day].append((self.time_to_minutes(s['start_time']), self.time_to_minutes(s['end_time'])))
            
        total_gap_minutes = 0
        total_days_on_campus = len(daily_schedules)
        total_start_time_penalty = 0.0
        preferred_times = self.preferred_start_times
        
        for day, times in daily_schedules.items():
            times.sort() # sort by start time
            for i in range(len(times) - 1):
                gap = times[i+1][0] - times[i][1]
                if gap > 0:
                    total_gap_minutes += gap
                    
            if times:
                actual_start = times[0][0]
                preferred_start_str = preferred_times.get(day, "08:30")
                preferred_start = self.time_to_minutes(preferred_start_str)
                
                deviation_hours = (actual_start - preferred_start) / 60.0
                if deviation_hours < 0:
                    total_start_time_penalty += (-deviation_hours) ** 2
                elif deviation_hours > 0:
                    total_start_time_penalty += 0.5 * (deviation_hours ** 2)

        total_gap_hours = total_gap_minutes / 60.0
        if "gaps" in self.weights:
            soft_penalty += self.weights["gaps"] * (total_gap_hours ** 3)
        # Apply days on campus penalty OR preferred num days penalty, but NOT both.
        if self.preferred_num_days is not None and "preferred_num_days" in self.weights:
            deviation = total_days_on_campus - self.preferred_num_days
            soft_penalty += self.weights["preferred_num_days"] * (deviation ** 2)
        elif "days_on_campus" in self.weights:
            # Only minimize days on campus if the user didn't explicitly request a specific number of days
            soft_penalty += self.weights["days_on_campus"] * 500 * (total_days_on_campus ** 3)
        if "start_time_deviation" in self.weights:
            soft_penalty += self.weights["start_time_deviation"] * total_start_time_penalty

        # Excluded-days penalty: penalize each session that falls on an excluded day
        if self.exclude_days and "exclude_days" in self.weights:
            excluded_count = sum(1 for s in active_sessions if s['day'] in self.exclude_days)
            soft_penalty += self.weights["exclude_days"] * (excluded_count ** 2)


        total_energy = hard_penalty + soft_penalty
        return total_energy, has_hard_violations

    def get_neighbor(self, current_state: Dict[str, Dict[str, str]]) -> Dict[str, Dict[str, str]]:
        """
        Generate a random neighbor state. Allows overlaps so the algorithm can traverse them.
        """
        new_state = copy.deepcopy(current_state)
        
        course_to_mutate = random.choice(self.course_ids)
        available_activities = list(self.courses_data[course_to_mutate].keys())
        activity_to_mutate = random.choice(available_activities)
        
        available_instances = list(self.courses_data[course_to_mutate][activity_to_mutate].keys())
        
        if len(available_instances) <= 1:
            return new_state # Can't mutate if only 1 option
            
        current_instance = new_state[course_to_mutate][activity_to_mutate]
        available_instances.remove(current_instance)
        
        # Purely random move (allows overlaps to be traversed)
        new_state[course_to_mutate][activity_to_mutate] = random.choice(available_instances)
                
        return new_state

    def optimize(self, alpha: float = 0.9, T_max: float = 1000.0, T_min: float = 0.1, markov_chain_length: int = 50) -> Tuple[Dict[str, Dict[str, str]], float, bool]:
        """
        Main loop for Simulated Annealing with Geometric Decay cooling schedule.
        """
        current_state = self.generate_initial_state()
        current_energy, current_hard_violations = self.calculate_energy(current_state)
        
        best_state = copy.deepcopy(current_state)
        best_energy = current_energy
        best_hard_violations = current_hard_violations
        
        T_max = self.dynamicInitTemp(current_state, T_max)
        T = T_max
        
        while T > T_min:
            for _ in range(markov_chain_length):
                neighbor_state = self.get_neighbor(current_state)
                neighbor_energy, neighbor_hard_violations = self.calculate_energy(neighbor_state)
                
                # Standard Boltzmann acceptance
                delta = neighbor_energy - current_energy
                
                if delta < 0:
                    current_state = neighbor_state
                    current_energy = neighbor_energy
                    current_hard_violations = neighbor_hard_violations
                else:
                    probability = math.exp(-delta / T)
                    if random.random() < probability:
                        current_state = neighbor_state
                        current_energy = neighbor_energy
                        current_hard_violations = neighbor_hard_violations
                
                # Keep track of global best found
                if current_energy < best_energy:
                    best_energy = current_energy
                    best_state = copy.deepcopy(current_state)
                    best_hard_violations = current_hard_violations
            
            # Geometric Cooling Schedule
            T = T * alpha

        # Revert to best state before quenching
        current_state = copy.deepcopy(best_state)
        current_energy = best_energy

        # Quenching Phase (Hill Climbing)
        improvement = True
        while improvement:
            improvement = False
            
            for course_id in self.course_ids:
                for activity_type, instances in self.courses_data[course_id].items():
                    current_instance = current_state[course_id][activity_type]
                    
                    for candidate_instance in instances.keys():
                        if candidate_instance == current_instance:
                            continue
                            
                        # Try move
                        neighbor_state = copy.deepcopy(current_state)
                        neighbor_state[course_id][activity_type] = candidate_instance
                        
                        neighbor_energy, neighbor_hard_violations = self.calculate_energy(neighbor_state)
                        
                        if not neighbor_hard_violations and neighbor_energy < current_energy:
                            current_state = neighbor_state
                            current_energy = neighbor_energy
                            improvement = True
                            
                            # Keep track of global best found
                            if current_energy < best_energy:
                                best_energy = current_energy
                                best_state = copy.deepcopy(current_state)
                                best_hard_violations = neighbor_hard_violations
                            break # First improvement
                            
                    if improvement:
                        break
                if improvement:
                    break

        return best_state, best_energy, best_hard_violations

    def dynamicInitTemp(self, initial_state: Dict[str, Dict[str, str]], default_t_max: float) -> float:
        total_delta = 0
        worse_moves = 0
        
        current_energy, _ = self.calculate_energy(initial_state)
        
        for _ in range(100):
            # Pass purely random moves
            neighbor_state = self.get_neighbor(initial_state)
            neighbor_energy, _ = self.calculate_energy(neighbor_state)
            
            delta = neighbor_energy - current_energy
            if delta > 0:
                total_delta += delta
                worse_moves += 1
                
        if worse_moves == 0:
            return default_t_max
            
        avg_delta = total_delta / worse_moves
        return -avg_delta / math.log(0.8)

    def format_schedule(self, state: Dict[str, Dict[str, str]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Convert the raw state (course -> activity -> instance) into a day-by-day chronologically ordered schedule.
        """
        schedule = {}
        for course_id, activities in state.items():
            if course_id not in self.courses_data:
                continue
            for activity_type, instance_id in activities.items():
                if activity_type in self.courses_data[course_id] and instance_id in self.courses_data[course_id][activity_type]:
                    sessions = self.courses_data[course_id][activity_type][instance_id]
                    for session in sessions:
                        day = session['day']
                        if not day: 
                            continue
                            
                        if day not in schedule:
                            schedule[day] = []
                            
                        aug_session = copy.deepcopy(session)
                        aug_session['course_id'] = course_id
                        aug_session['activity_type'] = activity_type
                        aug_session['instance_id'] = instance_id
                        schedule[day].append(aug_session)
                        
        for day in schedule:
            schedule[day].sort(key=lambda s: self.time_to_minutes(s['start_time']))
            
        return schedule
