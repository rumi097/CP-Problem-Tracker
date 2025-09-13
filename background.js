// Function to start the countdown
function startCountdown() {
  chrome.storage.local.get('countdownTarget', (result) => {
    // If no target is set, create one for 24 hours from now
    if (!result.countdownTarget) {
      const now = new Date();
      const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0); // Midnight tomorrow
      chrome.storage.local.set({ countdownTarget: targetTime.getTime() });
    }
  });
}

// Update the stored remaining time every second
function updateRemainingTime() {
  chrome.storage.local.get('countdownTarget', (result) => {
    if (result.countdownTarget) {
      const remaining = result.countdownTarget - Date.now();
      if (remaining <= 0) {
        // If countdown finishes, reset it for the next 24 hours
        startCountdown();
      } else {
        // Store the remaining time so the popup can read it
        chrome.storage.local.set({ remainingTime: remaining });
      }
    }
  });
}

// When the extension is installed or updated, start the countdown
chrome.runtime.onInstalled.addListener(() => {
  startCountdown();
  // Create an alarm that fires every second to update the timer
  chrome.alarms.create('countdownTimer', {
    periodInMinutes: 1 / 60 // Fire every second
  });
});

// Listen for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'countdownTimer') {
    updateRemainingTime();
  }
});