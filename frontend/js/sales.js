let posProducts = [];
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    // Set User Info
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, options);

    loadPosProducts();

    document.getElementById('posSearch').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = posProducts.filter(p => p.name.toLowerCase().includes(term));
        renderPosProducts(filtered);
    });
});

async function loadPosProducts() {
    const res = await apiCall('/products', 'GET');
    if (res.data.success) {
        posProducts = res.data.data;
        renderPosProducts(posProducts);
    } else {
        showToast('Failed to load products', 'error');
    }
}

function renderPosProducts(products) {
    const tbody = document.getElementById('posProductList');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-slate-500">No products found</td></tr>';
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group";
        const inStock = p.stock > 0;

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-slate-900 dark:text-white">${p.name}</div>
                <div class="text-xs text-slate-500 font-mono mt-0.5">${p.barcode || 'NO-SKU'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">${formatCurrency(p.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium ${inStock ? 'text-slate-600 dark:text-slate-400' : 'text-red-500'} bg-slate-50 dark:bg-slate-800/30">
                ${p.stock}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
                <button 
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${inStock ? 'bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-800/50' : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'}" 
                    ${!inStock ? 'disabled' : ''}
                    onclick="addToCart(${p.id})">
                    <i class="ph ph-plus font-bold"></i> Add
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addToCart(id) {
    const product = posProducts.find(p => p.id === id);
    if (!product || product.stock <= 0) return;

    const existing = cart.find(c => c.product_id === id);
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
        } else {
            showToast('Not enough stock!', 'warning');
            return;
        }
    } else {
        cart.push({
            product_id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(c => c.product_id !== id);
    renderCart();
}

function renderCart() {
    const tbody = document.getElementById('cartList');
    const emptyMsg = document.getElementById('emptyCartMsg');
    tbody.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        cart.forEach(c => {
            total += (c.price * c.quantity);
            const tr = document.createElement('tr');
            tr.className = "group";
            tr.innerHTML = `
                <td class="py-3 px-2">
                    <div class="font-medium text-slate-900 dark:text-white">${c.name}</div>
                    <div class="text-xs text-slate-500"> x ${c.quantity}</div>
                </td>
                <td class="py-3 px-2 text-right font-medium text-slate-900 dark:text-white">
                    
                </td>
                <td class="py-3 pl-2 pr-0 text-right w-10">
                    <button class="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1" onclick="removeFromCart(${c.product_id})">
                        <i class="ph ph-trash text-lg"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('cartTotal').textContent = '$' + total.toFixed(2);
}

async function checkout() {
    if (cart.length === 0) {
        showToast('Cart is empty', 'warning');
        return;
    }

    const payload = {
        items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity, price: c.price }))
    };

    const checkoutBtn = document.getElementById('checkoutBtn');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing...';

    const res = await apiCall('/sales', 'POST', payload);

    if (res.data.success) {
        showToast('Sale completed successfully!', 'success');
        cart = []; // clear cart
        renderCart();
        loadPosProducts(); // refresh stock
    } else {
        showToast(res.data.message || 'Error processing sale', 'error');
    }

    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Complete Sale';
}

function printInvoice() {
    if (cart.length === 0) {
        showToast('Cart is empty', 'warning');
        return;
    }

    let printContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Store Invoice</h2>
            <p>Date: ${new Date().toLocaleString()}</p>
            <hr>
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border-bottom: 1px solid #ddd; padding: 8px;">Item</th>
                        <th style="border-bottom: 1px solid #ddd; padding: 8px;">Qty</th>
                        <th style="border-bottom: 1px solid #ddd; padding: 8px;">Price</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let total = 0;
    cart.forEach(c => {
        total += (c.price * c.quantity);
        printContent += `
            <tr>
                <td style="border-bottom: 1px solid #eee; padding: 8px;">${c.name}</td>
                <td style="border-bottom: 1px solid #eee; padding: 8px;">${c.quantity}</td>
                <td style="border-bottom: 1px solid #eee; padding: 8px;"></td>
            </tr>
        `;
    });

    printContent += `
                </tbody>
            </table>
            <h3 style="text-align: right; margin-top: 20px;">Grand Total: </h3>
            <p style="text-align: center; margin-top: 40px; color: #555;">Thank you for your purchase!</p>
        </div>
    `;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Invoice</title></head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}
