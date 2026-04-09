// frontend/js/api.js
const API_BASE = `http://${window.location.hostname}:5000/api`;

// Base fetch wrapper
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        // Handle unauthorized (token expired, etc.)
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
                window.location.href = 'login.html';
            }
        }

        return { status: response.status, data };
    } catch (error) {
        console.error('API Call Error:', error);
        return { status: 500, data: { success: false, message: 'Network error occurred' } };
    }
}

// Toast Notification Utility
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 translate-y-8 opacity-0 pointer-events-auto border';

    let icon = '<i class="ph-fill ph-info text-blue-500 text-xl"></i>';
    toast.classList.add('bg-white', 'dark:bg-slate-800', 'border-slate-200', 'dark:border-slate-700', 'text-slate-900', 'dark:text-white');

    if (type === 'success') {
        icon = '<i class="ph-fill ph-check-circle text-emerald-500 text-xl"></i>';
        toast.className = toast.className.replace('bg-white', 'bg-emerald-50').replace('dark:bg-slate-800', 'bg-emerald-50 dark:bg-emerald-900/30').replace('border-slate-200', 'border-emerald-200').replace('dark:border-slate-700', 'border-emerald-200 dark:border-emerald-800/30').replace('text-slate-900', 'text-emerald-800').replace('dark:text-white', 'text-emerald-800 dark:text-emerald-400');
    } else if (type === 'error') {
        icon = '<i class="ph-fill ph-x-circle text-red-500 text-xl"></i>';
        toast.className = toast.className.replace('bg-white', 'bg-red-50').replace('dark:bg-slate-800', 'bg-red-50 dark:bg-red-900/30').replace('border-slate-200', 'border-red-200').replace('dark:border-slate-700', 'border-red-200 dark:border-red-800/30').replace('text-slate-900', 'text-red-800').replace('dark:text-white', 'text-red-800 dark:text-red-400');
    } else if (type === 'warning') {
        icon = '<i class="ph-fill ph-warning text-amber-500 text-xl"></i>';
        toast.className = toast.className.replace('bg-white', 'bg-amber-50').replace('dark:bg-slate-800', 'bg-amber-50 dark:bg-amber-900/30').replace('border-slate-200', 'border-amber-200').replace('dark:border-slate-700', 'border-amber-200 dark:border-amber-800/30').replace('text-slate-900', 'text-amber-800').replace('dark:text-white', 'text-amber-800 dark:text-amber-400');
    }

    toast.innerHTML = `<div class="shrink-0 flex">${icon}</div><div class="text-sm font-medium">${message}</div>`;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-8', 'opacity-0');
    });

    // Animate out
    setTimeout(() => {
        toast.classList.add('translate-y-8', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


// Currency Logic
function getCurrencySymbol() {
    const c = localStorage.getItem('appCurrency') || 'USD';
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥' };
    return symbols[c] || '$';
}

function formatCurrency(amount) {
    return getCurrencySymbol() + Number(amount).toFixed(2);
}

function changeCurrency(val) {
    localStorage.setItem('appCurrency', val);
    window.location.reload();
}

async function checkGlobalLowStock() {
    const token = localStorage.getItem('token');
    // Don't auto-fetch if we're on a public page and not logged in yet
    if (!token && (window.location.pathname.includes('login.html') || window.location.pathname.includes('landing.html'))) {
        return;
    }

    try {
        const res = await apiCall('/reports/dashboard', 'GET');
        if (res && res.data && res.data.success) {
            if (res.data.data.lowStockCount > 0) {
                const badges = document.querySelectorAll('#navAlertCount');
                badges.forEach(b => b.classList.remove('hidden'));
            }
        }
    } catch (e) { }
}

function loadUserProfileUI() {
    const defaultLogo = 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff';
    const profileName = localStorage.getItem('profileName') || 'Administrator';
    const companyName = localStorage.getItem('companyName') || 'SmartStock Inc.';
    const profileLogo = localStorage.getItem('profileLogo') || defaultLogo;

    const nameEls = document.querySelectorAll('.sidebarProfileName');
    const compEls = document.querySelectorAll('.sidebarCompanyName');
    const logoEls = document.querySelectorAll('.sidebarProfileLogo');
    const headerCompanyEls = document.querySelectorAll('#headerCompanyName');

    nameEls.forEach(el => el.textContent = profileName);
    compEls.forEach(el => el.textContent = companyName);
    headerCompanyEls.forEach(el => el.textContent = companyName);
    logoEls.forEach(el => el.src = profileLogo);
}

document.addEventListener('DOMContentLoaded', () => {
    // Populate current date globally
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const globalDateStr = new Date().toLocaleDateString(undefined, dateOptions);
    document.querySelectorAll('#currentDate').forEach(el => el.textContent = globalDateStr);

    loadUserProfileUI();
    checkGlobalLowStock();
    const sel = document.getElementById('globalCurrencySelect');
    const currency = localStorage.getItem('appCurrency') || 'USD';
    if (sel) sel.value = currency;

    const iconEl = document.getElementById('dashboardCurrencyIcon');
    if (iconEl) {
        // Remove existing icon class
        iconEl.classList.remove('ph-currency-dollar', 'ph-currency-eur', 'ph-currency-gbp', 'ph-currency-inr', 'ph-currency-jpy');
        // Add new icon class based on selection
        const iconClasses = {
            'USD': 'ph-currency-dollar',
            'EUR': 'ph-currency-eur',
            'GBP': 'ph-currency-gbp',
            'INR': 'ph-currency-inr',
            'JPY': 'ph-currency-jpy'
        };
        const activeClass = iconClasses[currency] || 'ph-currency-dollar';
        iconEl.classList.add(activeClass);
    }

    const currSymEls = document.querySelectorAll('.currency-symbol');
    currSymEls.forEach(el => el.textContent = getCurrencySymbol());
});
