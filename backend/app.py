import os
import json
import sqlite3
from http.server import SimpleHTTPRequestHandler, HTTPServer
from web_generate_schedule import run_scheduler

PORT = 8000
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

class SchedulerAPIHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/courses':
            try:
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                db_path = os.path.join(base_dir, 'db_service', 'braude.sqlite')
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                # Get distinct courses, ordering by name or id
                cursor.execute("SELECT DISTINCT course_id as id, name FROM courses ORDER BY name")
                rows = cursor.fetchall()
                
                # Format to expected JSON
                courses = [{"id": str(row["id"]), "name": row["name"] or str(row["id"])} for row in rows]
                conn.close()

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(courses, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error_resp = {"error": str(e)}
                self.wfile.write(json.dumps(error_resp).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/schedule':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                year = data.get('year', '2026')
                semester = data.get('semester', 'B')
                course_ids = data.get('course_ids', [])
                exclude_days = data.get('exclude_days', [])
                preferred_num_days = data.get('preferred_num_days', None)

                if preferred_num_days:
                    try:
                        preferred_num_days = int(preferred_num_days)
                    except ValueError:
                        preferred_num_days = None

                result = run_scheduler(
                    year=year,
                    semester=semester,
                    course_ids=course_ids,
                    exclude_days=exclude_days,
                    preferred_num_days=preferred_num_days
                )

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error_resp = {"error": str(e)}
                self.wfile.write(json.dumps(error_resp).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=SchedulerAPIHandler):
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"Starting server on http://localhost:{PORT}")
    print("Serving files from:", STATIC_DIR)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print("Server stopped.")

if __name__ == '__main__':
    run()
