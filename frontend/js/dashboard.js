document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    loadDashboardData();
});

function initCharts() {
    const catCtx = document.getElementById('categoryChart');
    if (catCtx) {
        window.categoryChart = new Chart(catCtx.getContext('2d'), {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'], borderWidth: 0 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return ' ' + context.label + ': ' + formatCurrency(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }

    const statCtx = document.getElementById('statusChart');
    if (statCtx) {
        window.statusChart = new Chart(statCtx.getContext('2d'), {
            type: 'doughnut',
            data: { labels: ['In Stock', 'Low Stock', 'Out of Stock'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return ' ' + context.label + ': ' + context.raw;
                            }
                        }
                    }
                }
            }
        });
    }
}

async function loadDashboardData() {
    try {
        const res = await apiCall('/reports/dashboard', 'GET');

        if (res && res.data && res.data.success) {
            const data = res.data.data;

            // 1. Populate KPI Cards
            const productVal = data.totalProducts.toLocaleString();
            const prodEl = document.getElementById('crdTotalProducts');
            prodEl.textContent = productVal;
            prodEl.title = productVal;

            const inventoryValue = Number(data.totalInventoryValue) || 0;
            const currencyVal = getCurrencySymbol() + inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const valEl = document.getElementById('crdValue');
            valEl.textContent = currencyVal;
            valEl.title = currencyVal;

            const lowStockVal = data.lowStockCount.toString();
            const lowStockEl = document.getElementById('crdLowStock');
            lowStockEl.textContent = lowStockVal;
            lowStockEl.title = lowStockVal;
            const outOfStockVal = data.outOfStockCount.toString();
            const crdOutOfStock = document.getElementById('crdOutOfStock');
            if (crdOutOfStock) {
                crdOutOfStock.textContent = outOfStockVal;
                crdOutOfStock.title = outOfStockVal;
            }
            const suppEl = document.getElementById('crdSuppliers');
            suppEl.textContent = data.totalCategories;
            suppEl.title = data.totalCategories;

            // 2. Nav Alert Badge (Low Stock Sidebar Pill)
            if (data.lowStockCount > 0) {
                const badge = document.getElementById('navAlertCount');
                if (badge) {
                    badge.classList.remove('hidden');
                }
            }

            // 4. Hydrate Chart.js Instances (defined natively in user's index.html)
            hydrateCharts(data);

        } else {
            console.error('Failed to load data from API.');
        }
    } catch (e) {
        console.error('Error loading dashboard data:', e);
    }
}

function hydrateCharts(data) {
    // Wait for the window chart instances to be available
    setTimeout(() => {
        if (window.categoryChart) {
            const totalVal = data.categoryValuation.reduce((acc, c) => acc + Number(c.value), 0);

            // Limit to Top 5 categories, group the rest into 'Others'
            const sortedCats = [...data.categoryValuation].sort((a, b) => Number(b.value) - Number(a.value));

            let finalCategories = [];
            if (sortedCats.length > 5) {
                finalCategories = sortedCats.slice(0, 5);
                const othersValue = sortedCats.slice(5).reduce((acc, c) => acc + Number(c.value), 0);
                if (othersValue > 0) {
                    finalCategories.push({ category: 'Others', value: othersValue });
                }
            } else {
                finalCategories = sortedCats;
            }

            window.categoryChart.data.labels = finalCategories.map(c => {
                const name = c.category || 'Uncategorized';
                const percentage = totalVal > 0 ? ((Number(c.value) / totalVal) * 100).toFixed(1) + '%' : '0%';
                return `${name} (${percentage})`;
            });
            window.categoryChart.data.datasets[0].data = finalCategories.map(c => c.value);
            window.categoryChart.update();
        }

        if (window.statusChart) {
            const totalStatus = data.inStockCount + data.lowStockCount + data.outOfStockCount;
            const inStockPct = totalStatus > 0 ? ((data.inStockCount / totalStatus) * 100).toFixed(1) + '%' : '0%';
            const lowStockPct = totalStatus > 0 ? ((data.lowStockCount / totalStatus) * 100).toFixed(1) + '%' : '0%';
            const outOfStockPct = totalStatus > 0 ? ((data.outOfStockCount / totalStatus) * 100).toFixed(1) + '%' : '0%';

            window.statusChart.data.labels = [
                `In Stock (${inStockPct})`,
                `Low Stock (${lowStockPct})`,
                `Out of Stock (${outOfStockPct})`
            ];
            window.statusChart.data.datasets[0].data = [
                data.inStockCount,
                data.lowStockCount,
                data.outOfStockCount
            ];

            // Update Center text overlay
            const total = data.inStockCount + data.lowStockCount + data.outOfStockCount;
            const healthPercentage = total === 0 ? 0 : Math.round((data.inStockCount / total) * 100);

            const overlayContainer = document.querySelector('#statusChart').nextElementSibling;
            if (overlayContainer) {
                overlayContainer.innerHTML = `
                    <span class="text-2xl font-bold text-slate-800 dark:text-white">${healthPercentage}%</span>
                    <span class="text-xs text-slate-500">Healthy</span>
                `;
            }
            window.statusChart.update();
        }
    }, 100); // 100ms tiny delay to ensure Chart.js initialized from inline script
}
