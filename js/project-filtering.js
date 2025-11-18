
document.addEventListener('DOMContentLoaded', () => {
    const filterContainer = document.querySelector('.f1-filter-scroll');
    const projectEntries = document.querySelectorAll('.f1-driver-entry');
    const podiumItems = document.querySelectorAll('.f1-podium-item');
    
    if (!filterContainer || !projectEntries.length) return;

    // 1. Extract unique tags
    const tags = new Set();
    projectEntries.forEach(entry => {
        const tagString = entry.dataset.tags;
        if (tagString) {
            tagString.split(',').forEach(tag => tags.add(tag.trim()));
        }
    });

    // 2. Generate Filter Buttons
    const sortedTags = Array.from(tags).sort();
    sortedTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'f1-filter-pill';
        btn.textContent = tag;
        btn.dataset.filter = tag;
        filterContainer.appendChild(btn);
    });

    // 3. Handle Click Events
    filterContainer.addEventListener('click', (e) => {
        if (!e.target.classList.contains('f1-filter-pill')) return;
        
        const selectedTag = e.target.dataset.filter;
        
        // Update Active State
        document.querySelectorAll('.f1-filter-pill').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Filter Projects
        filterProjects(selectedTag);
    });

    // Check URL params for initial filter
    const urlParams = new URLSearchParams(window.location.search);
    const initialTag = urlParams.get('tag');
    if (initialTag) {
        const btn = document.querySelector(`.f1-filter-pill[data-filter="${initialTag}"]`);
        if (btn) {
            btn.click();
        } else {
            filterProjects(initialTag); // Try filtering even if button doesn't exist (e.g. hidden tag)
        }
    }

    function filterProjects(tag) {
        let visibleCount = 0;

        // Filter Leaderboard Entries
        projectEntries.forEach(entry => {
            const entryTags = entry.dataset.tags ? entry.dataset.tags.split(',').map(t => t.trim()) : [];
            const isVisible = tag === 'all' || entryTags.includes(tag);
            
            entry.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });

        // Filter Podium Items (Match by project name or ID if possible, but podium items don't have data-tags in HTML yet)
        // We need to map podium items to projects. 
        // Podium items have onclick with project URL. We can match that.
        podiumItems.forEach(item => {
            const onclick = item.getAttribute('onclick');
            // Find corresponding driver entry to check tags
            const matchingEntry = Array.from(projectEntries).find(entry => entry.getAttribute('onclick') === onclick);
            
            if (matchingEntry) {
                const entryTags = matchingEntry.dataset.tags ? matchingEntry.dataset.tags.split(',').map(t => t.trim()) : [];
                const isVisible = tag === 'all' || entryTags.includes(tag);
                item.style.display = isVisible ? '' : 'none';
            }
        });

        // Restart Race with visible cars
        // We need to access the race instance. 
        // Since f1-racing.js is an IIFE, we can't access it directly unless we expose it or trigger a re-init.
        // However, f1-racing.js reads the DOM on init.
        // If we clear the track and re-run the init logic?
        // The simplest way is to reload the page with a query param, but that's slow.
        // Better: Dispatch a custom event that f1-racing.js listens to?
        // Or just modify f1-racing.js to export a restart function.
        
        // For now, let's assume the race keeps running with hidden cars (which might look weird if they are hidden in DOM but JS still animates them).
        // If we hide the .f1-driver-entry, collectDrivers might not see them if we re-run it.
        
        // Let's try to reload the race if possible.
        const trackContainer = document.getElementById('f1-track-container');
        if (trackContainer) {
             // Dispatch event for f1-racing.js to handle
             window.dispatchEvent(new CustomEvent('f1-filter-change'));
        }
    }
});
