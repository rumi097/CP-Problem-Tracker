// This function now correctly calculates the next midnight and sets it as the new target.
function resetCountdownTarget() {
    const now = new Date();
    // Set the target to midnight of the *next* day.
    const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0); 
    chrome.storage.local.set({ countdownTarget: targetTime.getTime() });
}

// This function runs every second to update the remaining time.
function updateRemainingTime() {
    chrome.storage.local.get('countdownTarget', (result) => {
        // If there's no target, set one. This handles the very first run.
        if (!result.countdownTarget) {
            resetCountdownTarget();
            return;
        }

        const remaining = result.countdownTarget - Date.now();
        
        // When the countdown finishes, reset it for the next 24 hours.
        if (remaining <= 0) {
            resetCountdownTarget();
        } else {
            // Store the remaining time so the popup can read it.
            chrome.storage.local.set({ remainingTime: remaining });
        }
    });
}

// When the extension is installed or updated, start the countdown process.
chrome.runtime.onInstalled.addListener(() => {
    resetCountdownTarget();
    // Create an alarm that fires every second to update the timer.
    chrome.alarms.create('countdownTimer', {
        periodInMinutes: 1 / 60 
    });
});

// Listen for the alarm and run the update function.
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'countdownTimer') {
        updateRemainingTime();
    }
});