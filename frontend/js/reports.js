let allSales = [];

document.addEventListener('DOMContentLoaded', () => {
    // Set User Info
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, options);

    loadSales();
});

async function loadSales() {
    const res = await apiCall('/sales', 'GET');
    if (res.data.success) {
        allSales = res.data.data;
        renderSales(allSales);
    } else {
        showToast('Failed to load sales data', 'error');
    }
}

function renderSales(sales) {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-slate-500">No sales history found.</td></tr>';
        return;
    }

    sales.forEach(s => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group";
        const date = new Date(s.sale_date).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap font-mono text-sm text-slate-600 dark:text-slate-400">#${String(s.id).padStart(5, '0')}</td>
            <td class="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-white font-medium">${s.cashier || 'System'}</td>
            <td class="px-6 py-4 whitespace-nowrap font-medium text-emerald-600 dark:text-emerald-400">${formatCurrency(s.total_amount)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-sm">${date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
                <button 
                    class="px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-800/50 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2" 
                    onclick="viewSaleDetails(${s.id})">
                    <i class="ph ph-receipt"></i> Details
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function viewSaleDetails(id) {
    const res = await apiCall(`/sales/${id}`, 'GET');

    if (res.data.success) {
        const sale = res.data.data;
        document.getElementById('detailSaleId').textContent = sale.id;
        document.getElementById('detailSaleTotal').textContent = '$' + parseFloat(sale.total_amount).toFixed(2);

        const tbody = document.getElementById('saleItemsBody');
        tbody.innerHTML = '';

        sale.items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap font-medium text-slate-900 dark:text-white">${item.product_name}</td>
                <td class="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">${item.quantity}</td>
                <td class="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400"></td>
                <td class="px-4 py-3 whitespace-nowrap text-right font-medium text-slate-900 dark:text-white"></td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('saleModal').classList.remove('hidden');
    } else {
        showToast('Could not fetch sale details', 'error');
    }
}

function closeSaleModal() {
    document.getElementById('saleModal').classList.add('hidden');
}

function exportCSV() {
    if (allSales.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Sale ID,Cashier,Total Amount,Date\n";

    allSales.forEach(s => {
        const row = [
            s.id,
            s.cashier || 'System',
            parseFloat(s.total_amount).toFixed(2),
            new Date(s.sale_date).toLocaleString().replace(/,/g, '')
        ].join(",");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
