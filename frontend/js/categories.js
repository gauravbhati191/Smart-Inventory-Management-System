// frontend/js/categories.js
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    document.getElementById('categoryForm').addEventListener('submit', saveCategory);
    document.getElementById('catSearchInput').addEventListener('input', filterCategories);
});

let allCategories = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentFilteredCategories = [];

async function loadCategories() {
    try {
        const [catRes, prodRes] = await Promise.all([
            apiCall('/products/categories/all', 'GET'),
            apiCall('/products', 'GET')
        ]);
        if (catRes.data.success && prodRes.data.success) {
            allCategories = catRes.data.data;
            const allProducts = prodRes.data.data;

            allCategories.forEach(c => {
                c.productCount = allProducts.filter(p => p.category_id === c.id || p.category_name === c.name).length;
            });


            renderCategories(allCategories);
        } else {
            showToast('Failed to load categories', 'error');
        }
    } catch (e) {
        showToast('Server error', 'error');
    }
}

function filterCategories(e) {
    const term = e.target.value.toLowerCase();
    const filtered = allCategories.filter(c => c.name.toLowerCase().includes(term));
    currentPage = 1;
    renderCategories(filtered);
}

function renderCategories(categories) {
    if (categories) {
        currentFilteredCategories = categories;
    }

    const totalItems = currentFilteredCategories.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedItems = currentFilteredCategories.slice(startIndex, endIndex);

    const tbody = document.getElementById('categoriesBody');
    tbody.innerHTML = '';

    const selectAllCategoriesEl = document.getElementById('selectAllCategories');
    if (selectAllCategoriesEl) {
        selectAllCategoriesEl.checked = false;
    }
    updateSelectedCategoryCount();

    // Update pagination UI
    const pageStartEl = document.getElementById('pageStart');
    const pageEndEl = document.getElementById('pageEnd');
    const totalItemsEl = document.getElementById('totalItems');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (pageStartEl) {
        pageStartEl.textContent = totalItems === 0 ? 0 : startIndex + 1;
        pageEndEl.textContent = endIndex;
        totalItemsEl.textContent = totalItems;

        const firstBtn = document.getElementById('firstPageBtn');
        const lastBtn = document.getElementById('lastPageBtn');

        prevBtn.disabled = currentPage === 1 || totalItems === 0;
        nextBtn.disabled = currentPage === totalPages || totalItems === 0;

        if (firstBtn) firstBtn.disabled = currentPage === 1 || totalItems === 0;
        if (lastBtn) lastBtn.disabled = currentPage === totalPages || totalItems === 0;
    }

    if (paginatedItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-slate-500">No categories found.</td></tr>';
        return;
    }

    paginatedItems.forEach(c => {
        tbody.innerHTML += `
        <tr onclick="window.location.href='category-products.html?category=${encodeURIComponent(c.name)}'" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
            <td class="px-6 py-4 whitespace-nowrap" onclick="event.stopPropagation()">
                <input type="checkbox" value="${c.id}" class="category-checkbox w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" onchange="updateSelectedCategoryCount()">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-500">
                        <i class="ph ph-folder text-xl"></i>
                    </div>
                    <span class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-semibold tooltip" title="View all products in ${c.name}">
                        ${c.name}
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <span class="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">${c.productCount || 0} Items</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end gap-2 transition-opacity" onclick="event.stopPropagation()">
                    <button onclick="editCategory(${c.id}, '${c.name}')" class="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors" title="Edit Category">
                        <i class="ph ph-pencil-simple text-lg"></i>
                    </button>
                    <button onclick="deleteCategory(${c.id})" class="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete Category">
                        <i class="ph ph-trash text-lg"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    });
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCategories();
    }
}

function nextPage() {
    const totalPages = Math.ceil(currentFilteredCategories.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderCategories();
    }
}

function firstPage() {
    if (currentPage !== 1) {
        currentPage = 1;
        renderCategories();
    }
}

function lastPage() {
    const totalPages = Math.ceil(currentFilteredCategories.length / itemsPerPage);
    if (currentPage !== totalPages && totalPages > 0) {
        currentPage = totalPages;
        renderCategories();
    }
}

function openCategoryModal() {
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.querySelector('#categoryModal h2').textContent = 'Create New Category';
    document.getElementById('categoryModal').classList.remove('hidden');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
}

function editCategory(id, name) {
    document.getElementById('categoryId').value = id;
    document.getElementById('categoryName').value = name;
    document.querySelector('#categoryModal h2').textContent = 'Edit Category';
    document.getElementById('categoryModal').classList.remove('hidden');
}

async function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category? It will fail if products are currently using it.')) {
        try {
            const res = await apiCall(`/products/categories/${id}`, 'DELETE');
            if (res.data.success) {
                showToast('Category deleted successfully', 'success');
                loadCategories();
            } else {
                showToast(res.data.message || 'Failed to delete category', 'error');
            }
        } catch (error) {
            showToast('Server connection failed', 'error');
        }
    }
}

function toggleSelectAllCategories() {
    const selectAllCheckbox = document.getElementById('selectAllCategories');
    const checkboxes = document.querySelectorAll('.category-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
    });
    updateSelectedCategoryCount();
}

function updateSelectedCategoryCount() {
    const checkboxes = document.querySelectorAll('.category-checkbox:checked');
    const dBtn = document.getElementById('deleteSelectedBtn');
    if (dBtn) {
        if (checkboxes.length > 0) {
            dBtn.classList.remove('hidden');
        } else {
            dBtn.classList.add('hidden');
        }
    }
}

async function deleteSelectedCategories() {
    const checkboxes = document.querySelectorAll('.category-checkbox:checked');
    if (checkboxes.length === 0) return;

    if (confirm(`Are you sure you want to delete ${checkboxes.length} categories? Products using them might cause deletion to fail.`)) {
        let successCount = 0;
        let failCount = 0;

        for (const cb of Array.from(checkboxes)) {
            try {
                const res = await apiCall(`/products/categories/${cb.value}`, 'DELETE');
                if (res.data.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }
        }

        if (successCount > 0) {
            showToast(`${successCount} category(s) deleted successfully.`, 'success');
        }
        if (failCount > 0) {
            showToast(`${failCount} category(s) failed to delete (likely in use).`, 'error');
        }

        loadCategories();
        const selectAllCheckbox = document.getElementById('selectAllCategories');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        updateSelectedCategoryCount();
    }
}

async function saveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value.trim();

    if (!name) return showToast('Category name is required', 'warning');

    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `/products/categories/${id}` : '/products/categories';

    try {
        const res = await apiCall(endpoint, method, { name });
        if (res.data.success) {
            showToast(`Category ${id ? 'updated' : 'created'} successfully`, 'success');
            closeCategoryModal();
            loadCategories();
        } else {
            showToast(res.data.message || 'Error saving category', 'error');
        }
    } catch (error) {
        showToast('Server connection failed', 'error');
    }
}

async function exportCategories() {
    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        showToast('Processing export...', 'info');

        const response = await fetch(`${API_BASE}/products/categories/export`, {
            method: 'GET',
            headers
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'inventory_categories.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('Export successful!', 'success');
        } else {
            showToast('Export failed', 'error');
        }
    } catch (error) {
        showToast('Export error', 'error');
    }
}

async function importCategories(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        showToast('Processing import...', 'info');

        const response = await fetch(`${API_BASE}/products/categories/import`, {
            method: 'POST',
            headers,
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            showToast(data.message || 'Import successful!', 'success');
            loadCategories();
        } else {
            showToast(data.message || 'Import failed', 'error');
        }
    } catch (error) {
        showToast('Import error', 'error');
    } finally {
        event.target.value = ''; // Reset file input
    }
}
