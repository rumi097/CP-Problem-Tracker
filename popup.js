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

    // === Helper Functions ===
    
    // NEW FUNCTION: This correctly gets the date based on your local timezone.
    const getLocalDateKey = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDate = () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleString('en-US', options);
    };

    // === Core Application Logic ===
    const updateUI = () => {
        chrome.storage.local.get('problemData', (result) => {
            const data = result.problemData || {};
            const todayKey = getLocalDateKey(); // Use the new local date function
            const todayCount = data[todayKey] || 0;

            dateDisplay.textContent = formatDate();
            countDisplay.textContent = todayCount;
            renderFullHistory(data);
        });
    };

    const renderFullHistory = (data) => {
        if (!fullHistoryContainer) return;
        fullHistoryContainer.innerHTML = '';
        const dates = Object.keys(data).filter(date => data[date] > 0).sort();
        const totalCount = dates.reduce((sum, date) => sum + data[date], 0);
        const totalCountDisplay = document.getElementById('totalCountDisplay');
        if (totalCountDisplay) {
            totalCountDisplay.textContent = `Total Problems Solved: ${totalCount}`;
        }
        if (dates.length === 0) {
            fullHistoryContainer.innerHTML = '<p>No history yet. Solve a problem to begin!</p>';
            return;
        }
        dates.reverse().forEach((date, index) => {
            const count = data[date];
            const dayNumber = dates.length - index;
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
        const todayKey = getLocalDateKey(); // Use the new local date function
        chrome.storage.local.get('problemData', (result) => {
            const data = result.problemData || {};
            let currentCount = data[todayKey] || 0;
            if (currentCount + amount < 0) return;
            data[todayKey] = currentCount + amount;
            chrome.storage.local.set({ problemData: data }, updateUI);
        });
    };

    // === Event Listeners ===
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