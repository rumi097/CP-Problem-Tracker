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
    const getTodayKey = () => new Date().toISOString().split('T')[0];

    const formatDate = () => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    };

    // === Core Application Logic ===
    
    // This single function reads data from storage and updates ALL parts of the UI
    const updateUI = () => {
        chrome.storage.local.get('problemData', (result) => {
            const data = result.problemData || {};
            const todayKey = getTodayKey();
            const todayCount = data[todayKey] || 0;

            // 1. Update main view
            dateDisplay.textContent = formatDate();
            countDisplay.textContent = todayCount;

            // 2. Update the full history page (even if it's hidden)
            renderFullHistory(data);
        });
    };
// Replace the old renderFullHistory function with this new one
const renderFullHistory = (data) => {
    if (!fullHistoryContainer) return;

    fullHistoryContainer.innerHTML = ''; // Clear old entries
    const dates = Object.keys(data).filter(date => data[date] > 0).sort(); // Get only dates with solves, and sort oldest first

    // Calculate the total count
    const totalCount = dates.reduce((sum, date) => sum + data[date], 0);
    const totalCountDisplay = document.getElementById('totalCountDisplay');
    if (totalCountDisplay) {
        totalCountDisplay.textContent = `Total Problems Solved: ${totalCount}`;
    }
    
    if (dates.length === 0) {
        fullHistoryContainer.innerHTML = '<p>No history yet. Solve a problem to begin!</p>';
        return;
    }

    // Reverse the array for display (newest first) but keep the day count correct
    dates.reverse().forEach((date, index) => {
        const count = data[date];
        const dayNumber = dates.length - index; // Calculate day number

        const entryDiv = document.createElement('div');
        entryDiv.className = 'history-entry';
        
        // Use innerHTML to easily structure the entry with the new "Day" count
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
        const todayKey = getTodayKey();
        chrome.storage.local.get('problemData', (result) => {
            const data = result.problemData || {};
            let currentCount = data[todayKey] || 0;
            
            // Prevent count from going below zero
            if (currentCount + amount < 0) {
                return;
            }
            
            data[todayKey] = currentCount + amount;

            // Save the new data, and once saved, update the UI
            chrome.storage.local.set({ problemData: data }, updateUI);
        });
    };

    // === Event Listeners ===
    incrementBtn.addEventListener('click', () => modifyCount(1));
    decrementBtn.addEventListener('click', () => modifyCount(-1));

    historyBtn.addEventListener('click', () => {
        mainView.classList.add('hidden');
        historyView.classList.remove('hidden');
    });

    backBtn.addEventListener('click', () => {
        historyView.classList.add('hidden');
        mainView.classList.remove('hidden');
    });

    // === Initial Load ===
    // This is the first thing that runs, populating the extension when it opens.
    updateUI();
});