import os
import sys
import time
import signal
import subprocess
import urllib.request
import urllib.error

def wait_for_service(url: str, name: str, timeout: int = 30) -> bool:
    """
    Polls a local web service URL until it responds with any HTTP status code,
    indicating that the server is successfully listening for connections.
    """
    print(f"🔄 Waiting for {name} to become responsive at {url}...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=2) as response:
                print(f"✅ {name} is fully operational!")
                return True
        except urllib.error.HTTPError:
            print(f"✅ {name} is fully operational!")
            return True
        except Exception:
            pass
        time.sleep(1)
    print(f"❌ {name} failed to respond within {timeout} seconds.")
    return False

def ensure_playwright_installed():
    """
    Dynamically checks for Playwright. If missing, automatically installs
    the python package and Chromium browser binaries for zero-configuration UI automation.
    """
    try:
        # pyrefly: ignore [missing-import]
        import playwright
        print("✅ Playwright library found.")
    except ImportError:
        print("📦 Playwright not found. Auto-installing playwright for visible UI automation...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "playwright"], check=True)
            subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=True)
            print("✨ Playwright successfully installed!")
        except Exception as e:
            print(f"❌ Failed to auto-install Playwright: {e}")
            print("Falling back to standard browser without automated clicking.")
            return False
    return True

def run_automated_ui(url: str):
    """
    Uses Playwright to visibly open Chromium, search/add courses, set preferences,
    and submit the schedule generation request live.
    """
    # pyrefly: ignore [missing-import]
    from playwright.sync_api import sync_playwright

    print("\n🤖 Initiating Playwright UI Automation Pilot...")
    with sync_playwright() as p:
        # Launch visible browser with smooth slow_mo so the user can comfortably watch the interactions
        browser = p.chromium.launch(headless=False, slow_mo=400)
        page = browser.new_page()
        print(f"🌐 Navigating to {url}...")
        page.goto(url)

        # 1. Search and select courses
        target_courses = ["61763", "61776", "61179", "61180", "61773"]
        search_input = page.locator("div.input-base input[type='text']")
        first_option = page.locator("div.absolute.top-full div.cursor-pointer").first

        for cid in target_courses:
            print(f"🔍 Searching for course ID '{cid}'...")
            search_input.wait_for(state="visible")
            search_input.click()
            search_input.fill(cid)
            page.wait_for_timeout(600)  # Allow React filtering animation to complete

            first_option.wait_for(state="visible")
            first_option.click()
            print(f"✅ Added course '{cid}'.")
            page.wait_for_timeout(400)

        # 2. Configure preferences (Switch to Specific Days mode and exclude Monday/Tuesday)
        print("⚙️ Configuring preferences: Switching to 'Specific Days' mode...")
        page.locator("button:has-text('ימים ספציפיים')").click()
        page.wait_for_timeout(500)

        print("🚫 Setting constraints: Excluding Monday (שני) and Tuesday (שלישי)...")
        page.locator("button:has-text('שני')").click()
        page.wait_for_timeout(300)
        page.locator("button:has-text('שלישי')").click()
        page.wait_for_timeout(500)

        # 4. Trigger schedule generation
        print("⏳ Waiting for automated security verification check...")
        generate_btn = page.locator("button:has-text('צור מערכת שעות אופטימלית')")
        # Playwright automatically waits for the button to become enabled
        generate_btn.click()
        print("🚀 Generated Schedule request submitted successfully!")

        print("\n✨ UI automation sequence completed! The optimal schedule results are loading.")
        print("💡 The browser window will remain open so you can view and evaluate the results table.")
        print("🛑 Press Ctrl+C in this terminal at any time to close the browser and stop both servers cleanly.")

        # Keep browser alive until user exits via Ctrl+C
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nClosing automated browser session...")
            browser.close()

def run_e2e_test():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(root_dir, 'backend')
    frontend_dir = os.path.join(root_dir, 'frontend')

    print("🚀 Starting End-to-End Local Environment Test Setup with UI Automation...")

    # Ensure dependencies available
    has_playwright = ensure_playwright_installed()
    
    # 1. Start Backend Server
    print("\n📦 [1/4] Launching FastAPI Backend Server...")
    backend_env = os.environ.copy()
    backend_env['PORT'] = '8000'
    
    backend_process = subprocess.Popen(
        [sys.executable, 'app.py'],
        cwd=backend_dir,
        env=backend_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        preexec_fn=os.setsid
    )

    if not wait_for_service("http://localhost:8000/api/courses", "Backend API Server"):
        print("💥 Exiting due to Backend failure.")
        try:
            os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
        except Exception:
            pass
        sys.exit(1)

    # 2. Rebuild Frontend Targeting Local Backend
    print("\n🏗️ [2/4] Building Frontend for Preview Mode (Targeting Local Backend)...")
    frontend_env = os.environ.copy()
    frontend_env['VITE_API_BASE_URL'] = 'http://localhost:8000'
    
    build_res = subprocess.run(
        ['npm', 'run', 'build'],
        cwd=frontend_dir,
        env=frontend_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    if build_res.returncode != 0:
        print("❌ Frontend Build failed! Please ensure TypeScript checks pass.")
        try:
            os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
        except Exception:
            pass
        sys.exit(1)
    print("✅ Frontend build successful!")

    # 3. Start Frontend Preview Server
    print("\n🌐 [3/4] Launching Vite Preview Server...")
    preview_process = subprocess.Popen(
        ['npm', 'run', 'preview'],
        cwd=frontend_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        preexec_fn=os.setsid
    )

    if not wait_for_service("http://localhost:4173", "Frontend Preview Server"):
        print("💥 Exiting due to Preview Server failure.")
        try:
            os.killpg(os.getpgid(preview_process.pid), signal.SIGTERM)
        except Exception:
            pass
        try:
            os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
        except Exception:
            pass
        sys.exit(1)

    # 4. Open Browser & Control Elements
    print("\n✨ [4/4] Controlling browser elements to search courses and build a schedule...")
    
    preview_url = "http://localhost:4173"
    
    try:
        if has_playwright:
            run_automated_ui(preview_url)
        else:
            import webbrowser
            webbrowser.open(preview_url)
            print("\n🎉 Browser launched manually. (Playwright automation skipped)")
            print("🛑 Press Ctrl+C in this terminal to stop both servers cleanly.")
            while True:
                time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        print("\n\n🛑 Stopping backend and frontend services gracefully...")
        try:
            os.killpg(os.getpgid(preview_process.pid), signal.SIGTERM)
        except Exception:
            pass
        try:
            os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
        except Exception:
            pass
        print("👋 Services stopped. Goodbye!")

if __name__ == "__main__":
    run_e2e_test()
