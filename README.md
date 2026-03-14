# 🛡️ Zoom Killer (Crextio)
**The Ultimate Automated Student Life Dashboard**

Zoom Killer is a high-performance desktop application designed to eliminate the administrative friction of online learning. It combines OS-level automation with cloud-based academic tracking to help students reclaim their time and focus.

## 🚀 Key Features
* **The Ghost Loop:** A multithreaded automation engine that joins, monitors, and auto-rejoins Zoom meetings based on custom intervals.
* **Google Classroom Sync:** Real-time integration with the Google Classroom API to display pending and missing assignments.
* **Deep Focus Mode:** A customizable Pomodoro timer to keep you in the zone.

## 🛠️ Technical Stack
* **Backend:** Python (Eel, PyGetWindow, Multithreading)
* **Frontend:** HTML5, Tailwind CSS, JavaScript (ES6+)
* **Authentication:** Firebase v10 (Google Auth & Classroom OAuth)

## 📦 Installation & Setup
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/MahaadKhaan/ZoomKiller.git](https://github.com/MahaadKhaan/ZoomKiller.git)
Install dependencies:

Bash
pip install -r requirements.txt
Configure Firebase:

Add your credentials to the firebaseConfig object in web/main.js.

📖 Usage Guide & Best Practices
To ensure the "Ghost Loop" functions autonomously, please follow these configuration steps:

1. Pre-Launch Configuration (Critical)
Before activating the looper, you must disable the manual joining prompts in Zoom:

Zoom Setup: Join a test meeting, uncheck "Always show this preview when joining", and ensure both Audio and Video are disabled as shown below.

Browser Prompt: When you open a Zoom link for the first time, check the box "Always allow..." so the app can launch meetings without asking for permission.

2. Understanding the Dashboard
Fill in your recurring class details to automate your academic workflow.

URL: Paste your recurring Zoom link.

Start/End: Define your class duration.

Interval: Set to 40 minutes to bypass standard session limits.

📄 License
This project is open-source. Feel free to contribute or adapt it for your own academic needs.