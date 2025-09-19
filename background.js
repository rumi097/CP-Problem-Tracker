// ** NEW: This function runs once a day to update the highest streak **
function updateHighestStreak() {
    chrome.storage.local.get('streakData', (result) => {
        let streak = result.streakData || { currentStreak: 0, highestStreak: 0, lastStreakDate: null };

        // If the current streak is higher than the highest, update the highest.
        if (streak.currentStreak > streak.highestStreak) {
            streak.highestStreak = streak.currentStreak;
            chrome.storage.local.set({ streakData: streak });
        }
    });
}

// This function resets the countdown timer.
function resetCountdownTarget() {
    const now = new Date();
    // Set the target to midnight of the *next* day.
    const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0); 
    chrome.storage.local.set({ countdownTarget: targetTime.getTime() });
    
    // When the countdown resets, check and update the highest streak.
    updateHighestStreak();
}

// This function runs every second to update the remaining time.
function updateRemainingTime() {
    chrome.storage.local.get('countdownTarget', (result) => {
        if (!result.countdownTarget) {
            resetCountdownTarget();
            return;
        }
        const remaining = result.countdownTarget - Date.now();
        if (remaining <= 0) {
            resetCountdownTarget();
        } else {
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