// Your web app's Firebase configuration is now included
const firebaseConfig = {
    apiKey: "AIzaSyBNHDe4YJZpNE5ZFO1zq6Sb2Owaqvzxd8o",
    authDomain: "shared-timer-app-cfcc0.firebaseapp.com",
    databaseURL: "https://shared-timer-app-cfcc0-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "shared-timer-app-cfcc0",
    storageBucket: "shared-timer-app-cfcc0.firebasestorage.app",
    messagingSenderId: "821327547235",
    appId: "1:821327547235:web:01c1b0d8de315fd2af6156"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// GET REFERENCES TO HTML ELEMENTS
const timerDisplay = document.getElementById('timer-display');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const resetButton = document.getElementById('reset-button');
const durationInput = document.getElementById('duration-input');

let countdownInterval;
let localEndTime; // Keep a local copy of endTime to calculate remaining time

// --- LOGIC TO CONTROL THE TIMER ---

// START button
startButton.addEventListener('click', () => {
    const durationMinutes = parseInt(durationInput.value);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
        alert("Please enter a valid number of minutes.");
        return;
    }
    const endTime = Date.now() + durationMinutes * 60 * 1000;

    // Send the state to Firebase
    database.ref('timer').set({
        endTime: endTime,
        isPaused: false,
        remainingTime: durationMinutes * 60 * 1000
    });
});

// PAUSE/RESUME button
pauseButton.addEventListener('click', () => {
    database.ref('timer').once('value', (snapshot) => {
        const timerState = snapshot.val();
        if (!timerState || !timerState.endTime) return; // Can't pause if not running

        if (timerState.isPaused) {
            // --- RESUME ---
            const newEndTime = Date.now() + timerState.remainingTime;
            // The FIX is here: We update the document title immediately on resume
            document.title = "Resuming..."; 
            database.ref('timer').update({
                endTime: newEndTime,
                isPaused: false
            });
        } else {
            // --- PAUSE ---
            const remainingTime = timerState.endTime - Date.now();
            database.ref('timer').update({
                isPaused: true,
                remainingTime: remainingTime > 0 ? remainingTime : 0
            });
        }
    });
});

// RESET button
resetButton.addEventListener('click', () => {
    database.ref('timer').set(null); // Clear the timer state in Firebase
});


// --- LISTEN FOR CHANGES FROM FIREBASE TO KEEP EVERYTHING IN SYNC ---
database.ref('timer').on('value', (snapshot) => {
    const timerState = snapshot.val();
    clearInterval(countdownInterval); // Clear any existing local timer

    if (!timerState) {
        // --- STOPPED/RESET STATE ---
        const defaultMinutes = String(durationInput.value).padStart(2, '0');
        timerDisplay.textContent = `${defaultMinutes}:00`;
        document.title = "Syncd Timer";
        pauseButton.textContent = "Pause";
        startButton.style.display = 'inline-block';
        resetButton.style.display = 'none';
        durationInput.disabled = false;
        return;
    }

    // --- RUNNING OR PAUSED STATE ---
    localEndTime = timerState.endTime;
    startButton.style.display = 'none';
    resetButton.style.display = 'inline-block';
    durationInput.disabled = true;

    if (timerState.isPaused) {
        // --- PAUSED STATE ---
        displayTime(timerState.remainingTime);
        pauseButton.textContent = "Resume";
        document.title = "Paused";
    } else {
        // --- RUNNING STATE ---
        pauseButton.textContent = "Pause";
        countdownInterval = setInterval(() => {
            const distance = localEndTime - Date.now();
            if (distance < 0) {
                clearInterval(countdownInterval);
                displayTime(0);
                document.title = "Time's Up!";
            } else {
                displayTime(distance);
            }
        }, 500);
    }
});

// --- HELPER FUNCTION to display time ---
function displayTime(milliseconds) {
    if (milliseconds < 0) milliseconds = 0;
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const formattedTime = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    
    timerDisplay.textContent = formattedTime;
    // This logic is now simpler and works correctly with the fix
    if (document.title !== "Time's Up!") {
        document.title = formattedTime;
    }
}