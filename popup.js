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

    // === Helper Functions ===
    const formatDateToKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getLocalDateKey = () => formatDateToKey(new Date());

    const formatDate = () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleString('en-US', options);
    };
    
    const formatTime = (ms) => {
        if (ms < 0) ms = 0;
        const totalSeconds = Math.floor(ms / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.remainingTime) {
            countdownDisplay.textContent = formatTime(changes.remainingTime.newValue);
        }
    });
    chrome.storage.local.get('remainingTime', (result) => {
        if (result.remainingTime) {
            countdownDisplay.textContent = formatTime(result.remainingTime);
        }
    });

    // === Core Application Logic ===
    const updateUI = () => {
        chrome.storage.local.get('problemData', (result) => {
            const data = result.problemData || {};
            const todayKey = getLocalDateKey();
            const todayCount = data[todayKey] || 0;

            dateDisplay.textContent = formatDate();
            countDisplay.textContent = todayCount;
            renderFullHistory(data);
        });
    };
    
    // FINAL UPDATED RENDER HISTORY FUNCTION
    const renderFullHistory = (data) => {
        if (!fullHistoryContainer) return;
        fullHistoryContainer.innerHTML = '';
        const totalCountDisplay = document.getElementById('totalCountDisplay');

        const savedDates = Object.keys(data);
        if (savedDates.length === 0) {
            if (totalCountDisplay) totalCountDisplay.textContent = 'Total Problems Solved: 0';
            fullHistoryContainer.innerHTML = '<p>No history yet. Solve a problem to begin!</p>';
            return;
        }

        // ** NEW ROBUST LOGIC TO FILL GAPS **
        const allDatesData = {};
        // Use a regex to properly parse YYYY-MM-DD and avoid timezone issues
        const firstDateStr = savedDates.sort()[0];
        const parts = firstDateStr.split('-').map(Number);
        const firstDate = new Date(parts[0], parts[1] - 1, parts[2]);

        const today = new Date();
        // Set today to the end of the day to ensure the loop includes it
        today.setHours(23, 59, 59, 999); 
        
        // Loop from the first recorded day until today
        for (let day = new Date(firstDate); day <= today; day.setDate(day.getDate() + 1)) {
            const dayKey = formatDateToKey(day);
            // Use saved count if it exists, otherwise default to 0
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
            const data = result.problemData || {};
            let currentCount = data[todayKey] || 0;
            if (currentCount + amount < 0) return;
            data[todayKey] = currentCount + amount;
            chrome.storage.local.set({ problemData: data }, updateUI);
        });
    };

    // === Event Listeners (Unchanged) ===
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

    // === Initial Load ===
    updateUI();
});