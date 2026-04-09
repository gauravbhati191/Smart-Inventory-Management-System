// frontend/js/settings.js

document.addEventListener('DOMContentLoaded', () => {
    loadSettingsData();

    const form = document.getElementById('profileForm');
    if (form) {
        form.addEventListener('submit', handleProfileSave);
    }
});

let currentLogoData = null;

function loadSettingsData() {
    const profileName = localStorage.getItem('profileName') || 'Administrator';
    const companyName = localStorage.getItem('companyName') || 'SmartStock Inc.';
    const email = localStorage.getItem('profileEmail') || '';
    const logo = localStorage.getItem('profileLogo') || 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff';
    const threshold = localStorage.getItem('defaultLowStockThreshold') || '5';

    document.getElementById('profileNameInput').value = profileName;
    document.getElementById('companyNameInput').value = companyName;
    document.getElementById('emailInput').value = email;
    document.getElementById('settingsProfileLogo').src = logo;
    currentLogoData = logo;

    const thInput = document.getElementById('thresholdInput');
    if (thInput) thInput.value = threshold;
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file.', 'error');
        return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showToast('Image size should be less than 2MB.', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        currentLogoData = e.target.result;
        document.getElementById('settingsProfileLogo').src = currentLogoData;
        showToast('Logo preview updated. Click Save to apply.', 'info');
    };
    reader.readAsDataURL(file);
}

function handleProfileSave(e) {
    e.preventDefault();
    const newName = document.getElementById('profileNameInput').value.trim();
    const newCompany = document.getElementById('companyNameInput').value.trim();
    const newEmail = document.getElementById('emailInput').value.trim();

    if (!newName || !newCompany) {
        showToast('Name and Company are required.', 'error');
        return;
    }

    localStorage.setItem('profileName', newName);
    localStorage.setItem('companyName', newCompany);
    localStorage.setItem('profileEmail', newEmail);
    if (currentLogoData) {
        localStorage.setItem('profileLogo', currentLogoData);
    }

    loadUserProfileUI(); // Call the api.js function to update sidebar immediately
    showToast('Profile updated successfully!', 'success');
}

function savePreferences() {
    const thInput = document.getElementById('thresholdInput');
    if (thInput) {
        let val = parseInt(thInput.value);
        if (isNaN(val) || val < 1) val = 1;
        localStorage.setItem('defaultLowStockThreshold', val);
        showToast('System preferences updated.', 'success');
    }
}

function resetSettings() {
    if (confirm('Are you absolutely sure you want to reset all profile data? This will clear your custom logo, name, and preferences.')) {
        localStorage.removeItem('profileName');
        localStorage.removeItem('companyName');
        localStorage.removeItem('profileEmail');
        localStorage.removeItem('profileLogo');
        localStorage.removeItem('defaultLowStockThreshold');
        // Kept theme and appCurrency on purpose, but can wipe if requested

        loadSettingsData();
        loadUserProfileUI();
        showToast('Profile data reset to defaults.', 'warning');
    }
}
