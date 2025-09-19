document.addEventListener('DOMContentLoaded', () => {
    // === Get DOM Elements ===
    const mainView = document.getElementById('mainView');
    const historyView = document.getElementById('historyView');
    const dateDisplay = document.getElementById('dateDisplay');
    const countDisplay = document.getElementById('countDisplay');
    const incrementBtn = document.getElementById('incrementBtn');
    const decrementBtn = document.getElementById('decrementBtn');
    const historyBtn = document.getElementById('historyBtn');
    const backBtn = document.getElementById('backBtn');
    const fullHistoryContainer = document.getElementById('fullHistoryContainer');
    const countdownDisplay = document.getElementById('countdownDisplay');
    const currentStreakDisplay = document.getElementById('currentStreak');
    const highestStreakDisplay = document.getElementById('highestStreak');

    // === Helper Functions ===
    const formatDateToKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const getLocalDateKey = () => formatDateToKey(new Date());
    const formatDate = () => new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formatTime = (ms) => {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    // === Real-time Current Streak Logic ===
    function updateStreak(currentProblemCount) {
        const todayKey = getLocalDateKey();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = formatDateToKey(yesterday);
        chrome.storage.local.get(['streakData', 'problemData'], (result) => {
            let streak = result.streakData || { currentStreak: 0, highestStreak: 0, lastStreakDate: null };
            const problemData = result.problemData || {};
            const yesterdayCount = problemData[yesterdayKey] || 0;
            const wasStreakDayYesterday = streak.lastStreakDate === yesterdayKey && yesterdayCount >= 4;
            if (streak.lastStreakDate !== todayKey && !wasStreakDayYesterday) {
                streak.currentStreak = 0;
            }
            const hasMetThresholdToday = currentProblemCount >= 4;
            const wasStreakDayToday = streak.lastStreakDate === todayKey;
            if (hasMetThresholdToday && !wasStreakDayToday) {
                streak.currentStreak += 1;
                streak.lastStreakDate = todayKey;
            } else if (!hasMetThresholdToday && wasStreakDayToday) {
                streak.currentStreak -= 1;
                streak.lastStreakDate = wasStreakDayYesterday ? yesterdayKey : null;
            }
            if (streak.currentStreak > streak.highestStreak) {
                streak.highestStreak = streak.currentStreak;
            }
            chrome.storage.local.set({ streakData: streak });
        });
    }

    // === Listeners ===
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.remainingTime) countdownDisplay.textContent = formatTime(changes.remainingTime.newValue);
        if (changes.streakData) updateStreakDisplays(changes.streakData.newValue);
    });
    chrome.storage.local.get(['remainingTime', 'streakData'], (result) => {
        if (result.remainingTime) countdownDisplay.textContent = formatTime(result.remainingTime);
        if (result.streakData) updateStreakDisplays(result.streakData);
    });

    function updateStreakDisplays(streakData) {
        if (!streakData) streakData = { currentStreak: 0, highestStreak: 0 };
        currentStreakDisplay.textContent = streakData.currentStreak || 0;
        highestStreakDisplay.textContent = streakData.highestStreak || 0;
    }

    // === Core Application Logic ===
    const updateUI = () => {
        chrome.storage.local.get(['problemData', 'streakData'], (result) => {
            const data = result.problemData || {};
            const todayKey = getLocalDateKey();
            const todayCount = data[todayKey] || 0;
            dateDisplay.textContent = formatDate();
            countDisplay.textContent = todayCount;
            renderFullHistory(data);
            updateStreakDisplays(result.streakData);
        });
    };
    
    // FINAL UPDATED RENDER HISTORY FUNCTION
    const renderFullHistory = (data) => {
        if (!fullHistoryContainer) return;
        fullHistoryContainer.innerHTML = '';
        const totalCountDisplay = document.getElementById('totalCountDisplay');
        const savedDates = Object.keys(data);

        // If there's no data at all, show the empty message.
        if (savedDates.length === 0) {
            if (totalCountDisplay) totalCountDisplay.textContent = 'Total Problems Solved: 0';
            fullHistoryContainer.innerHTML = '<p>No history yet. Solve a problem to begin!</p>';
            return;
        }

        const allDatesData = {};
        const firstDateStr = savedDates.sort()[0];
        const parts = firstDateStr.split('-').map(Number);
        const firstDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        for (let day = new Date(firstDate); day <= today; day.setDate(day.getDate() + 1)) {
            const dayKey = formatDateToKey(day);
            allDatesData[dayKey] = data[dayKey] || 0;
        }
        
        const allDates = Object.keys(allDatesData);
        const totalCount = Object.values(allDatesData).reduce((sum, count) => sum + count, 0);

        if (totalCountDisplay) {
            totalCountDisplay.textContent = `Total Problems Solved: ${totalCount}`;
        }
        
        allDates.reverse().forEach((date, index) => {
            const count = allDatesData[date];
            const dayNumber = allDates.length - index;
            const entryDiv = document.createElement('div');
            entryDiv.className = 'history-entry';
            entryDiv.innerHTML = `
                <span class="history-date">
                    <strong>Day ${dayNumber}</strong> (${date})
                </span>
                <span class="history-count">${count} problem(s)</span>
            `;
            fullHistoryContainer.appendChild(entryDiv);
        });
    };

    const modifyCount = (amount) => {
        const todayKey = getLocalDateKey();
        chrome.storage.local.get('problemData', (result) => {
            const data = (result.problemData && typeof result.problemData === 'object') ? result.problemData : {};
            let currentCount = data[todayKey] || 0;
            if (currentCount + amount < 0) return;
            const newCount = currentCount + amount;
            data[todayKey] = newCount;
            chrome.storage.local.set({ problemData: data }, () => {
                updateUI();
                updateStreak(newCount);
            });
        });
    };

    // ... Event Listeners ...
    if (incrementBtn) incrementBtn.addEventListener('click', () => modifyCount(1));
    if (decrementBtn) decrementBtn.addEventListener('click', () => modifyCount(-1));
    if (historyBtn) historyBtn.addEventListener('click', () => {
        if (mainView && historyView) {
            mainView.classList.add('hidden');
            historyView.classList.remove('hidden');
        }
    });
    if (backBtn) backBtn.addEventListener('click', () => {
        if (mainView && historyView) {
            historyView.classList.add('hidden');
            mainView.classList.remove('hidden');
        }
    });

    updateUI();
});