import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Provider with Classroom Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
provider.addScope('https://www.googleapis.com/auth/classroom.coursework.me.readonly');

// --- ROUTING & ANIMATIONS ---
const screens = {
    welcome: document.getElementById('welcome-screen'),
    login: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard-screen')
};

function triggerAnimations(screenElement) {
    const animatedElements = screenElement.querySelectorAll('.animate-up');
    animatedElements.forEach(el => {
        el.classList.remove('show');
        // Small timeout to allow DOM to render before adding class
        setTimeout(() => el.classList.add('show'), 50);
    });
}

function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        if(screen) {
            screen.classList.remove('active-screen');
            screen.classList.add('hidden-screen');
        }
    });
    if(screens[screenName]) {
        screens[screenName].classList.remove('hidden-screen');
        screens[screenName].classList.add('active-screen');
        triggerAnimations(screens[screenName]);
    }
}

// --- THEME INITIALIZATION ---
const themeSelector = document.getElementById('theme-selector');

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}

const savedTheme = localStorage.getItem('theme') || 'system';
applyTheme(savedTheme);
if (themeSelector) themeSelector.value = savedTheme;

themeSelector?.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

// --- SPLASH BOOT SEQUENCE & ROUTING ---
let isAppBooted = false;
let authCheckComplete = false;
let pendingAuthUser = null;

// The 5-Second Splash Boot Sequence
setTimeout(() => {
    // 1. Resize window to main app size
    window.resizeTo(1280, 720);
    // 2. Center window on monitor
    const screenX = Math.max(0, (window.screen.width - 1280) / 2);
    const screenY = Math.max(0, (window.screen.height - 720) / 2);
    window.moveTo(screenX, screenY);
    
    // 3. Fade out splash screen
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
        }, 1000); // Wait for CSS fade transition to finish
    }
    
    isAppBooted = true;
    
    // 4. Trigger routing if auth state has returned from Firebase
    if (authCheckComplete) {
        routeUser(pendingAuthUser);
    }
}, 5000);

function routeUser(user) {
    if (user) {
        // Automatically route to dashboard if already logged in
        const storedToken = localStorage.getItem('gapiAccessToken');
        if (storedToken) {
            gapiAccessToken = storedToken;
        }
        handleSuccessfulLogin(user);
    } else {
        // Smart Routing for logged out users
        if (sessionStorage.getItem('firstTimeSetup') === 'true') {
            showScreen('login');
        } else {
            showScreen('welcome');
        }
    }
}

onAuthStateChanged(auth, (user) => {
    pendingAuthUser = user;
    authCheckComplete = true;
    
    // Only route dynamically if the 5s splash sequence is already done
    if (isAppBooted) {
        routeUser(user);
    }
});

document.getElementById('btn-nav-login')?.addEventListener('click', () => {
    sessionStorage.setItem('firstTimeSetup', 'true');
    showScreen('login');
});
document.getElementById('btn-get-started')?.addEventListener('click', () => {
    sessionStorage.setItem('firstTimeSetup', 'true');
    showScreen('login');
});

// --- AUTHENTICATION ---
let gapiAccessToken = null;

document.getElementById('btn-google-signin')?.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        gapiAccessToken = credential.accessToken; // Store token for Classroom API
        localStorage.setItem('gapiAccessToken', gapiAccessToken); // Persist token
        const user = result.user;
        handleSuccessfulLogin(user);
    } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed. Check console or scopes.");
    }
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('gapiAccessToken'); // Clear token
    gapiAccessToken = null;
    
    // Complete Data Wipe
    if (classroomPollingInterval) {
        clearInterval(classroomPollingInterval);
    }
    classroomData = { pending: [], missing: [] };
    const cc = document.getElementById('classroom-container');
    if (cc) cc.innerHTML = '';
    const cb = document.getElementById('classroom-badge');
    if (cb) cb.textContent = 'Syncing...';
    
    document.getElementById('profile-modal').classList.add('hidden');
    showScreen('login');
});

function handleSuccessfulLogin(user) {
    const displayName = user.displayName || 'Student';
    document.getElementById('user-display-name').textContent = displayName;
    document.getElementById('modal-user-name').textContent = displayName;
    
    // Auto-fetch profile picture
    if (user.photoURL) {
        const dashAv = document.getElementById('dashboard-user-avatar');
        const dashIcon = document.getElementById('dashboard-user-icon');
        const setAv = document.getElementById('settings-user-avatar');
        const setIcon = document.getElementById('settings-user-icon');
        
        if(dashAv) { dashAv.src = user.photoURL; dashAv.classList.remove('hidden'); }
        if(dashIcon) { dashIcon.classList.add('hidden'); }
        
        if(setAv) { setAv.src = user.photoURL; setAv.classList.remove('hidden'); }
        if(setIcon) { setIcon.classList.add('hidden'); }
    }
    
    
    // Wipe DOM to prevent visual leaks from previous sessions
    const cCont = document.getElementById('classroom-container');
    if (cCont) cCont.innerHTML = '<p class="text-sm text-center text-slate-500 mt-4">Loading Classroom Data...</p>';
    const cBadge = document.getElementById('classroom-badge');
    if (cBadge) cBadge.textContent = 'Syncing...';
    
    showScreen('dashboard');
    
    // Notify Eel backend
    if (window.eel !== undefined) {
        window.eel.init_session(user.uid)();
    }
    
    // Immediate fetch Classroom Data on login
    fetchGoogleClassroomData();
    
    // Start 15-second polling for Classroom
    if (classroomPollingInterval) {
        clearInterval(classroomPollingInterval);
    }
    classroomPollingInterval = setInterval(() => {
        if (gapiAccessToken) {
            fetchGoogleClassroomData();
        }
    }, 15000);
}

// --- PROFILE MODAL & SETTINGS ---
const btnAvatar = document.getElementById('btn-avatar-modal');
const profileModal = document.getElementById('profile-modal');
const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');

btnAvatar?.addEventListener('click', () => {
    profileModal.classList.toggle('hidden');
});

btnSettings?.addEventListener('click', () => {
    // Hide profile drop-down
    profileModal.classList.add('hidden');
    
    // Populate settings data
    const currentName = document.getElementById('user-display-name').textContent;
    document.getElementById('settings-user-name').textContent = currentName;

    // Show settings modal
    settingsModal.classList.remove('hidden');
});

btnCloseSettings?.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

btnSaveSettings?.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

// Close profile modal if clicked outside
document.addEventListener('click', (e) => {
    if (!profileModal.contains(e.target) && !btnAvatar.contains(e.target)) {
        profileModal.classList.add('hidden');
    }
});

// --- TOOL 1: THE GHOST LOOP ---
let looperActive = false;
const btnLooper = document.getElementById('btn-toggle-looper');
const looperText = document.getElementById('looper-btn-text');
const looperStatus = document.getElementById('looper-status');

btnLooper?.addEventListener('click', async () => {
    if (!looperActive) {
        const url = document.getElementById('zoom-url').value;
        const start = document.getElementById('zoom-start').value;
        const end = document.getElementById('zoom-end').value;
        const intervalMins = document.getElementById('zoom-interval').value;
        
        if (!url || !start || !end || !intervalMins) {
            alert("Please fill out URL, Start Time, End Time, and Loop Interval");
            return;
        }

        if (window.eel) {
            const res = await window.eel.start_ghost_loop(url, start, end, parseInt(intervalMins, 10))();
            console.log(res);
        }
        
        looperActive = true;
        btnLooper.classList.replace('bg-primary', 'bg-red-500');
        btnLooper.classList.replace('text-background-dark', 'text-white');
        looperText.textContent = "Stop Looper";
        looperStatus.classList.remove('hidden');
    } else {
        if (window.eel) {
            const res = await window.eel.stop_ghost_loop()();
            console.log(res);
        }
        
        looperActive = false;
        btnLooper.classList.replace('bg-red-500', 'bg-primary');
        btnLooper.classList.replace('text-white', 'text-background-dark');
        looperText.textContent = "Activate Looper";
        looperStatus.classList.add('hidden');
    }
});

// --- TOOL 2: GOOGLE CLASSROOM API SYNC ---
let activeTab = 'pending'; // 'pending' or 'missing'
let classroomData = { pending: [], missing: [] };
let classroomPollingInterval; // Global polling var

const tabPending = document.getElementById('tab-classroom-pending');
const tabMissing = document.getElementById('tab-classroom-missing');

tabPending?.addEventListener('click', () => {
    activeTab = 'pending';
    tabPending.className = "flex-1 py-1.5 text-sm font-bold rounded-md bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 transition-colors";
    tabMissing.className = "flex-1 py-1.5 text-sm font-bold rounded-md text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors";
    renderClassroomData();
});

tabMissing?.addEventListener('click', () => {
    activeTab = 'missing';
    tabMissing.className = "flex-1 py-1.5 text-sm font-bold rounded-md bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 transition-colors";
    tabPending.className = "flex-1 py-1.5 text-sm font-bold rounded-md text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors";
    renderClassroomData();
});

async function fetchGoogleClassroomData() {
    const container = document.getElementById('classroom-container');
    const badge = document.getElementById('classroom-badge');
    
    if (!gapiAccessToken) {
        return;
    }

    try {
        // 1. Fetch user's courses
        const coursesRes = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
            headers: { Authorization: `Bearer ${gapiAccessToken}` }
        });
        const coursesData = await coursesRes.json();
        
        if (!coursesData.courses || coursesData.courses.length === 0) {
            container.innerHTML = '<p class="text-sm text-center text-slate-500 mt-4">No active courses found.</p>';
            badge.textContent = '0 Due';
            return;
        }

        // 2. Fetch assignments (courseWork) and student submissions for each course
        let allPending = [];
        let allMissing = [];
        const now = new Date();

        const coursePromises = coursesData.courses.map(async (course) => {
            // Fetch CourseWork
            const hwRes = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`, {
                headers: { Authorization: `Bearer ${gapiAccessToken}` }
            });
            const hwData = await hwRes.json();
            
            if (hwData.courseWork) {
                for (const work of hwData.courseWork) {
                    const dueDate = work.dueDate ? new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day) : null;
                    
                    // Fetch Student Submissions to check state
                    const subRes = await fetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${work.id}/studentSubmissions`, {
                         headers: { Authorization: `Bearer ${gapiAccessToken}` }
                    });
                    const subData = await subRes.json();
                    
                    let isTurnedIn = false;
                    let isMissing = false;
                    
                    if (subData.studentSubmissions && subData.studentSubmissions.length > 0) {
                        const sub = subData.studentSubmissions[0];
                        isTurnedIn = sub.state === 'TURNED_IN' || sub.state === 'RETURNED';
                    }

                    if (!isTurnedIn) {
                        if (dueDate) {
                            if (dueDate >= now) {
                                // Pending
                                allPending.push({
                                    title: work.title,
                                    course: course.name,
                                    dueDate: dueDate,
                                    url: work.alternateLink
                                });
                            } else {
                                // Missing
                                allMissing.push({
                                    title: work.title,
                                    course: course.name,
                                    dueDate: dueDate,
                                    url: work.alternateLink
                                });
                            }
                        } else {
                            // No exact due date, treat as pending if not turned in
                            allPending.push({
                                title: work.title,
                                course: course.name,
                                dueDate: new Date(now.getTime() + 86400000 * 365), // throw way in future for sorting
                                url: work.alternateLink,
                                noDueDate: true
                            });
                        }
                    }
                }
            }
        });

        await Promise.all(coursePromises);

        // Sort data
        classroomData.pending = allPending.sort((a,b) => a.dueDate - b.dueDate);
        classroomData.missing = allMissing.sort((a,b) => b.dueDate - a.dueDate); // Most recent missing first

        renderClassroomData();
        
    } catch (e) {
        console.error("Classroom API Error", e);
        if (container.innerHTML.includes('refresh')) {
            container.innerHTML = '<p class="text-sm text-center text-red-500 mt-4">Error fetching classroom data.</p>';
        }
    }
}

function renderClassroomData() {
    const container = document.getElementById('classroom-container');
    const badge = document.getElementById('classroom-badge');
    const now = new Date();
    
    container.innerHTML = '';
    const renderingData = activeTab === 'pending' ? classroomData.pending : classroomData.missing;
    
    // Update Badge
    if (activeTab === 'pending') {
        badge.textContent = `${renderingData.length} Due Soon`;
        badge.className = "text-xs bg-slate-200 dark:bg-slate-800 px-2 flex items-center justify-center rounded-full font-bold";
    } else {
        badge.textContent = `${renderingData.length} Missing`;
        badge.className = "text-xs bg-red-500/10 text-red-500 px-2 flex items-center justify-center rounded-full font-bold";
    }

    if (renderingData.length === 0) {
        container.innerHTML = `<p class="text-sm text-center text-slate-500 mt-4">${activeTab === 'pending' ? 'All caught up!' : 'No missing assignments!'}</p>`;
        return;
    }

    renderingData.forEach((task, i) => {
        let dateText = "";
        let urgentBadge = "";
        
        if (activeTab === 'pending') {
            if (task.noDueDate) {
                dateText = "No due date";
            } else {
                const daysDiff = Math.ceil((task.dueDate - now) / (1000 * 60 * 60 * 24));
                dateText = `Due in ${daysDiff} days`;
                if (daysDiff <= 2) urgentBadge = `<span class="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded font-bold uppercase">Urgent</span>`;
            }
        } else {
            // Missing
            const formattedDate = task.dueDate ? task.dueDate.toLocaleDateString() : 'Unknown';
            dateText = `Was due ${formattedDate}`;
            urgentBadge = `<span class="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold uppercase">Missing</span>`;
        }

        container.innerHTML += `
            <a href="${task.url}" target="_blank" class="block p-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors group animate-up delay-${Math.min((i+1)*100, 500)} show">
                <div class="flex justify-between items-start">
                    <div class="flex gap-3">
                        <div class="mt-1">
                            <span class="material-symbols-outlined ${activeTab === 'missing' ? 'text-red-400 group-hover:text-red-500' : 'text-slate-300 group-hover:text-primary'}">assignment</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold">${task.title}</p>
                            <p class="text-xs text-slate-500">${task.course} • ${dateText}</p>
                        </div>
                    </div>
                    ${urgentBadge}
                </div>
            </a>
        `;
    });
}

// No mock implementation available.

// --- TOOL 3: DYNAMIC FOCUS MODE TIMER ---
let timerInterval;
let timeLeft = 25 * 60; // default 25 mins
let totalTime = 25 * 60;
let timerRunning = false;

const timerInputM = document.getElementById('timer-input-m');
const timerDisplayS = document.getElementById('timer-display-s');
const timerRing = document.getElementById('timer-ring');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const btnTimerReset = document.getElementById('btn-timer-reset');
const focusPulse = document.getElementById('focus-pulse');
const totalDash = 283; // 2 * pi * radius (45) of the 100x100 viewBox

function syncTimeFromInput() {
    if(timerRunning) return; // don't sync while running
    let m = parseInt(timerInputM.value) || 25;
    if (m < 1) m = 1;
    if (m > 120) m = 120;
    timerInputM.value = m;
    totalTime = m * 60;
    timeLeft = totalTime;
    timerDisplayS.textContent = "00";
    timerRing.style.strokeDashoffset = 0;
}

// Ensure the new dashboard timer default input updates the actual timer when not running
const dashboardTimerDefault = document.getElementById('dashboard-timer-default');
dashboardTimerDefault?.addEventListener('change', (e) => {
    if(timerRunning) return;
    let m = parseInt(e.target.value) || 25;
    if (m < 1) m = 1;
    if (m > 120) m = 120;
    e.target.value = m;
    timerInputM.value = m;
    syncTimeFromInput();
});

// Listen to changes on the input
timerInputM.addEventListener('change', syncTimeFromInput);
timerInputM.addEventListener('blur', syncTimeFromInput);

window.addEventListener('keydown', (e) => {
   if(e.key === 'Enter' && document.activeElement === timerInputM) {
       syncTimeFromInput();
       timerInputM.blur();
   }
});

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString();
    const s = (timeLeft % 60).toString().padStart(2, '0');
    
    // Only update input visually if running to avoid interrupting
    if(timerRunning) timerInputM.value = m;
    timerDisplayS.textContent = s;
    
    const percent = timeLeft / totalTime;
    timerRing.style.strokeDashoffset = totalDash - (percent * totalDash);
}

btnTimerToggle?.addEventListener('click', () => {
    if (timerRunning) {
        // Pause
        clearInterval(timerInterval);
        timerRunning = false;
        btnTimerToggle.textContent = "Resume Session";
        focusPulse.classList.add('hidden');
        timerInputM.disabled = false;
    } else {
        // Start or Resume
        syncTimeFromInput(); // ensure we have newest value
        timerInputM.disabled = true; // prevent editing while running
        timerRunning = true;
        btnTimerToggle.textContent = "Pause Session";
        focusPulse.classList.remove('hidden');
        
        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                btnTimerToggle.textContent = "Start Session";
                focusPulse.classList.add('hidden');
                timerInputM.disabled = false;
                timeLeft = 0;
                updateTimerDisplay();
                alert("Focus session complete! Take a break.");
            } else {
                updateTimerDisplay();
            }
        }, 1000);
    }
});

btnTimerReset?.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerRunning = false;
    syncTimeFromInput();
    timerInputM.disabled = false;
    btnTimerToggle.textContent = "Start Session";
    focusPulse.classList.add('hidden');
    updateTimerDisplay();
});

