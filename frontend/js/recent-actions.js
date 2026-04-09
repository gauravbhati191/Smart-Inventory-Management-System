document.addEventListener('DOMContentLoaded', () => {
    loadRecentActions();
});

async function loadRecentActions() {
    const container = document.getElementById('timelineContainer');
    try {
        const res = await apiCall('/reports/recent-actions', 'GET');

        if (res && res.data && res.data.success) {
            const actions = res.data.data;
            container.innerHTML = '';

            if (actions.length === 0) {
                container.innerHTML = '<div class="text-sm text-slate-500 dark:text-slate-400 ml-6">No recent actions found.</div>';
                return;
            }

            actions.forEach(action => {
                const date = new Date(action.timestamp);
                const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let title = '';
                let desc = '';
                let colorClass = 'bg-slate-500'; // default

                if (action.type === 'product' && action.action === 'added') {
                    title = 'Product Added';
                    desc = `Added "${action.name}" to inventory.`;
                    colorClass = 'bg-emerald-500';
                } else if (action.type === 'product' && action.action === 'edited') {
                    title = 'Product Edited';
                    desc = `Updated details for "${action.name}".`;
                    colorClass = 'bg-blue-500';
                } else if (action.type === 'category' && action.action === 'added') {
                    title = 'Category Added';
                    desc = `Created new category "${action.name}".`;
                    colorClass = 'bg-purple-500';
                } else if (action.type === 'category' && action.action === 'edited') {
                    title = 'Category Edited';
                    desc = `Updated category "${action.name}".`;
                    colorClass = 'bg-indigo-500';
                }

                const itemHtml = `
                <div class="relative pl-6 pb-8 border-l border-slate-200 dark:border-slate-700 last:pb-0 last:border-transparent group">
                    <div class="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${colorClass} ring-4 ring-white dark:ring-slate-800 group-hover:scale-125 transition-transform"></div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-semibold text-slate-900 dark:text-white">${title}</span>
                        <span class="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full font-medium tracking-wide shadow-sm flex items-center gap-1"><i class="ph ph-clock"></i> ${timeString}</span>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-400">${desc}</p>
                </div>
                `;
                container.innerHTML += itemHtml;
            });
        } else {
            container.innerHTML = '<div class="text-sm text-red-500 ml-6">Failed to load recent actions.</div>';
        }
    } catch (error) {
        console.error('Error fetching recent actions:', error);
        container.innerHTML = '<div class="text-sm text-red-500 ml-6">Server connection failed.</div>';
    }
}
