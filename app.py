import eel
import threading
import time
import datetime
import webbrowser
import subprocess
import json
import os
import ctypes
import pygetwindow as gw

eel.init('web')

looper_active = False
looper_thread = None

current_user_id = None

@eel.expose
def init_session(user_id):
    global current_user_id
    current_user_id = user_id
    print(f"User connected session ID: {user_id}")
    return True

@eel.expose
def start_ghost_loop(url, start_time_str, end_time_str, interval_mins):
    global looper_active, looper_thread
    if looper_active:
        return "Looper is already active."
    
    looper_active = True
    looper_thread = threading.Thread(target=ghost_loop, args=(url, start_time_str, end_time_str, interval_mins), daemon=True)
    looper_thread.start()
    return "Looper activated."

@eel.expose
def stop_ghost_loop():
    global looper_active
    looper_active = False
    return "Looper deactivated."

def ghost_loop(url, start_time_str, end_time_str, interval_mins):
    global looper_active
    print(f"Ghost loop started: {url} from {start_time_str} to {end_time_str} ({interval_mins} mins)")
    
    def parse_time(time_str):
        now = datetime.datetime.now()
        t = datetime.datetime.strptime(time_str, "%H:%M").time()
        return datetime.datetime.combine(now.date(), t)

    try:
        start_dt = parse_time(start_time_str)
        end_dt = parse_time(end_time_str)
        
        if end_dt < start_dt:
            end_dt += datetime.timedelta(days=1)
            
    except Exception as e:
        print("Invalid time format. Please use HH:MM (24-hour).", e)
        looper_active = False
        return

    while looper_active:
        now = datetime.datetime.now()
        if start_dt <= now <= end_dt:
            print(f"Opening Zoom: {url}")
            webbrowser.open(url)
            
            # Wait for Zoom to launch
            time.sleep(15) 
            
            wait_seconds = int(interval_mins) * 60
            elapsed = 0
            
            while elapsed < wait_seconds and looper_active:
                if datetime.datetime.now() > end_dt:
                    print("End time reached. Stopping ghost loop.")
                    looper_active = False
                    break
                    
                # Active Meeting Monitoring
                if elapsed > 20: # Give Zoom extra buffer to fully connect
                    try:
                        windows = gw.getWindowsWithTitle("Zoom Meeting")
                        if len(windows) == 0:
                            print("Zoom Meeting window missing! Host likely ended meeting. Breaking loop.")
                            break
                    except Exception as e:
                        print(f"Error checking windows: {e}")
                
                time.sleep(5)
                elapsed += 5
            
            if looper_active:
                print("Killing Zoom.exe...")
                subprocess.run(["taskkill", "/F", "/IM", "Zoom.exe"], capture_output=True)
                time.sleep(5) # buffer before restarting loop
        else:
            time.sleep(10)

@eel.expose
def save_tasks(tasks):
    global current_user_id
    if not current_user_id:
        return False
        
    # Create a safe filename tied to the user
    safe_uid = "".join(x for x in current_user_id if x.isalnum())
    filename = f"tasks_{safe_uid}.json"
    
    try:
        with open(filename, "w") as f:
            json.dump(tasks, f)
        return True
    except Exception as e:
        print(f"Error saving tasks: {e}")
        return False

@eel.expose
def load_tasks():
    global current_user_id
    if not current_user_id:
        return []

    safe_uid = "".join(x for x in current_user_id if x.isalnum())
    filename = f"tasks_{safe_uid}.json"
    
    if os.path.exists(filename):
        try:
            with open(filename, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return []

@eel.expose
def get_classroom_assignments():
    return [
        {
            "id": 1,
            "title": "Physics: Quantum Mechanics Quiz",
            "course": "Advanced Physics II",
            "due": "Due Today",
            "urgent": True
        },
        {
            "id": 2,
            "title": "Calculus: Integration Problems",
            "course": "Mathematics",
            "due": "Due Tomorrow",
            "urgent": False
        },
        {
            "id": 3,
            "title": "English: Essay Draft Review",
            "course": "Literature",
            "due": "Due in 3 days",
            "urgent": False
        }
    ]

def center_window():
    time.sleep(0.3) # Wait for Chrome window to spawn
    try:
        # Chrome might append padding to the title, but we search for substring or exact title
        windows = gw.getWindowsWithTitle('Zoom Killer Desktop')
        if windows:
            win = windows[0]
            
            user32 = ctypes.windll.user32
            screen_width = user32.GetSystemMetrics(0)
            screen_height = user32.GetSystemMetrics(1)
            
            pos_x = (screen_width // 2) - (400 // 2)
            pos_y = (screen_height // 2) - (300 // 2)
            
            win.moveTo(pos_x, pos_y)
    except Exception as e:
        print(f"Centering failed: {e}")

if __name__ == '__main__':
    # Calculate screen center coordinates
    user32 = ctypes.windll.user32
    screen_width = user32.GetSystemMetrics(0)
    screen_height = user32.GetSystemMetrics(1)
    
    window_width = 400
    window_height = 300
    
    pos_x = (screen_width // 2) - (window_width // 2)
    pos_y = (screen_height // 2) - (window_height // 2)

    # Start independent thread to physically move the window once OS maps it
    threading.Thread(target=center_window, daemon=True).start()

    # Use chrome in app mode for a native window feel
    # Launch small 400x300 splash screen first
    eel.start('index.html', 
        size=(window_width, window_height), 
        position=(pos_x, pos_y),
        mode='chrome', 
        cmdline_args=[
            '--app=http://localhost:8000/index.html',
            f'--window-size={window_width},{window_height}',
            '--user-data-dir=app_profile',
            '--disable-extensions',
            '--disable-features=Translate'
        ]
    )
