let allProducts = [];
let allCategories = [];

document.addEventListener('DOMContentLoaded', () => {
    // Set User Info

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, options);

    loadCategories();
    loadProducts();

    // Event Listeners
    document.getElementById('productForm').addEventListener('submit', saveProduct);
    document.getElementById('searchInput').addEventListener('input', filterProducts);
});

async function loadCategories() {
    const res = await apiCall('/products/categories/all', 'GET');
    if (res.data.success) {
        allCategories = res.data.data;
        const select = document.getElementById('categoryId');

        // Add option to create new
        select.innerHTML = '<option value="">Select Category</option>';
        allCategories.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        select.innerHTML += '<option value="new">+ Add New Category</option>';

        select.addEventListener('change', async (e) => {
            if (e.target.value === 'new') {
                e.target.value = '';
                const newCat = prompt("Enter new Category name:");
                if (newCat && newCat.trim() !== '') {
                    const resCat = await apiCall('/products/categories', 'POST', { name: newCat.trim() });
                    if (resCat.data.success) {
                        showToast('Category created!', 'success');
                        await loadCategories();
                        document.getElementById('categoryId').value = resCat.data.data.id;
                    } else {
                        showToast(resCat.data.message || 'Error creating category', 'error');
                    }
                }
            }
        });
    }
}

async function loadProducts() {
    const res = await apiCall('/products', 'GET');
    if (res.data.success) {
        allProducts = res.data.data;

        const urlParams = new URLSearchParams(window.location.search);
        let categoryStr = urlParams.get('category');

        if (categoryStr) {
            const decodedCat = decodeURIComponent(categoryStr);
            const categoryTitleEl = document.getElementById('categoryTitle');
            if (categoryTitleEl) categoryTitleEl.textContent = `Category: ${decodedCat}`;
            const filtered = allProducts.filter(p => p.category_name === decodedCat);
            renderProducts(filtered);
        } else {
            renderProducts(allProducts);
        }
    } else {
        showToast('Failed to load products', 'error');
    }
}

function renderProducts(products) {
    const tbody = document.getElementById('productsBody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">No products found</td></tr>';
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group";

        let statusBadge = '';
        if (Number(p.stock) === 0) {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"><span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Out of Stock</span>`;
        } else if (Number(p.stock) <= Number(p.min_stock_level)) {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/30"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Low Stock</span>`;
        } else {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock</span>`;
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <i class="ph ph-package text-xl"></i>
                    </div>
                    <div>
                        <div class="font-medium text-slate-900 dark:text-white">${p.name}</div>
                        <div class="text-xs text-slate-500 font-mono mt-0.5">${p.barcode || 'NO-SKU'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">${p.category_name || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">${formatCurrency(p.price)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right font-medium ${p.stock <= p.min_stock_level && p.stock > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}">${p.stock}</td>
            <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right">
                <button onclick="editProduct(${p.id})" class="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-1" title="Edit">
                    <i class="ph ph-pencil-simple text-lg"></i>
                </button>
                <button onclick="deleteProduct(${p.id})" class="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 ml-1" title="Delete">
                    <i class="ph ph-trash text-lg"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterProducts(e) {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.category_name && p.category_name.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
    );
    renderProducts(filtered);
}

// Modal Logic
let html5QrcodeScanner = null;
let quaggaScannerActive = false;
let quaggaDetectedHandler = null;
let scanInProgress = false;
let readerStyleSyncTimer = null;

const BARCODE_FORMATS = (typeof Html5QrcodeSupportedFormats !== 'undefined')
    ? [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
    ]
    : [];

function normalizeScannedCode(rawCode) {
    return String(rawCode || '').trim().replace(/\s+/g, '');
}

function getCameraScanType() {
    if (typeof Html5QrcodeScanType !== 'undefined' && Html5QrcodeScanType.SCAN_TYPE_CAMERA !== undefined) {
        return Html5QrcodeScanType.SCAN_TYPE_CAMERA;
    }
    return 0;
}

function getBarcodeScanBox(viewfinderWidth) {
    const maxWidth = typeof viewfinderWidth === 'number' ? Math.min(300, viewfinderWidth - 24) : 300;
    const width = Math.max(220, maxWidth);
    return { width, height: Math.round(width * 0.5) };
}

function ensureReaderViewportStyles() {
    const readerEl = document.getElementById('reader');
    if (!readerEl) {
        return;
    }

    readerEl.style.position = 'relative';
    readerEl.style.height = '300px';
    readerEl.style.minHeight = '300px';
    readerEl.style.background = 'black';

    const mediaNodes = readerEl.querySelectorAll('video, canvas');
    mediaNodes.forEach((node) => {
        node.style.position = 'absolute';
        node.style.inset = '0';
        node.style.width = '100%';
        node.style.height = '100%';
        node.style.objectFit = 'cover';
    });
}

function startReaderStyleSync() {
    stopReaderStyleSync();
    ensureReaderViewportStyles();
    readerStyleSyncTimer = setInterval(ensureReaderViewportStyles, 250);
}

function stopReaderStyleSync() {
    if (!readerStyleSyncTimer) {
        return;
    }

    clearInterval(readerStyleSyncTimer);
    readerStyleSyncTimer = null;
}

function optimizeActiveCamera() {
    const videoEl = document.querySelector('#reader video');
    if (!videoEl || !videoEl.srcObject || typeof videoEl.srcObject.getVideoTracks !== 'function') {
        return;
    }

    const track = videoEl.srcObject.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== 'function') {
        return;
    }

    const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
    const advanced = [];

    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        advanced.push({ focusMode: 'continuous' });
    }

    if (capabilities.zoom) {
        const minZoom = capabilities.zoom.min || 1;
        const maxZoom = capabilities.zoom.max || minZoom;
        const targetZoom = Math.min(maxZoom, Math.max(minZoom, (minZoom + maxZoom) / 2));
        advanced.push({ zoom: targetZoom });
    }

    if (advanced.length === 0) {
        return;
    }

    track.applyConstraints({ advanced }).catch(() => {
        // Ignore unsupported camera constraints
    });
}

function cleanupCameraScanner() {
    stopReaderStyleSync();

    if (window.Quagga) {
        if (quaggaDetectedHandler) {
            try {
                window.Quagga.offDetected(quaggaDetectedHandler);
            } catch (err) {
                // Ignore detach errors
            }
            quaggaDetectedHandler = null;
        }

        if (quaggaScannerActive) {
            try {
                window.Quagga.stop();
            } catch (err) {
                // Ignore stop errors
            }
            quaggaScannerActive = false;
        }
    }

    if (html5QrcodeScanner) {
        const scannerRef = html5QrcodeScanner;
        html5QrcodeScanner = null;
        scannerRef.clear().catch(() => {
            // Ignore clear errors
        });
    }

    const readerEl = document.getElementById('reader');
    if (readerEl) {
        readerEl.innerHTML = '';
    }
}

function startHtml5Scanner() {
    ensureReaderViewportStyles();

    const scannerConfig = {
        fps: 8,
        qrbox: getBarcodeScanBox,
        rememberLastUsedCamera: true,
        supportedScanTypes: [getCameraScanType()],
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        videoConstraints: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: false
        }
    };

    if (BARCODE_FORMATS.length > 0) {
        scannerConfig.formatsToSupport = BARCODE_FORMATS;
    }

    html5QrcodeScanner = new Html5QrcodeScanner('reader', scannerConfig, false);
    html5QrcodeScanner.render((decodedText, decodedResult) => {
        if (scanInProgress) return;
        const normalizedCode = normalizeScannedCode(decodedText);
        if (!normalizedCode) return;

        scanInProgress = true;
        onScanSuccess(normalizedCode, decodedResult);
    }, onScanFailure);

    setTimeout(optimizeActiveCamera, 600);
}

function startQuaggaScanner() {
    ensureReaderViewportStyles();

    if (!window.Quagga || typeof window.Quagga.init !== 'function') {
        startHtml5Scanner();
        return;
    }

    const target = document.querySelector('#reader');
    if (!target) {
        startHtml5Scanner();
        return;
    }

    const scanResultEl = document.getElementById('scanResult');
    if (scanResultEl) {
        scanResultEl.textContent = 'Align barcode in the frame and hold steady';
    }

    window.Quagga.init({
        inputStream: {
            type: 'LiveStream',
            target,
            constraints: {
                facingMode: 'environment',
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 }
            },
            area: {
                top: '8%',
                right: '2%',
                left: '2%',
                bottom: '8%'
            }
        },
        locator: {
            patchSize: 'x-large',
            halfSample: false
        },
        numOfWorkers: navigator.hardwareConcurrency ? Math.min(4, navigator.hardwareConcurrency) : 2,
        frequency: 8,
        decoder: {
            readers: [
                'code_128_reader',
                'ean_reader',
                'ean_8_reader',
                'upc_reader',
                'upc_e_reader',
                'code_39_reader',
                'codabar_reader',
                'i2of5_reader'
            ],
            multiple: false
        },
        locate: true
    }, (err) => {
        if (err) {
            console.error('Quagga init failed:', err);
            startHtml5Scanner();
            return;
        }

        quaggaDetectedHandler = (result) => {
            if (scanInProgress) return;

            const code = normalizeScannedCode(result && result.codeResult ? result.codeResult.code : '');
            if (!code) return;

            scanInProgress = true;
            onScanSuccess(code, result);
        };

        window.Quagga.onDetected(quaggaDetectedHandler);

        try {
            window.Quagga.start();
            quaggaScannerActive = true;
            setTimeout(optimizeActiveCamera, 600);
        } catch (startErr) {
            console.error('Quagga start failed:', startErr);
            cleanupCameraScanner();
            startHtml5Scanner();
        }
    });
}

function openScanModal() {
    document.getElementById('scanModal').classList.remove('hidden');
    document.getElementById('scanResult').textContent = '';
    scanInProgress = false;

    cleanupCameraScanner();
    startReaderStyleSync();
    startQuaggaScanner();
}

function closeScanModal() {
    document.getElementById('scanModal').classList.add('hidden');
    scanInProgress = false;
    cleanupCameraScanner();
}
async function onScanSuccess(decodedText, decodedResult) {
    // Stop scanning once we get a code
    closeScanModal();
    showToast(`Barcode Scanned: ${decodedText}`, 'info');

    // Check if product exists via API
    const res = await apiCall(`/products/${decodedText}`, 'GET');

    if (res.data && res.data.success) {
        editProduct(res.data.data.id);
        showToast('Product already added! You can update its details here.', 'success');
    } else {
        openProductModal();
        document.getElementById('barcode').value = decodedText;
        showToast('New product detected. Please add details.', 'info');
    }
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("hiddenReader");

    showToast('Scanning image...', 'info');
    try {
        const decodedText = await html5QrCode.scanFile(file, true);
        // Ensure successful scan closes the modal as camera would
        closeScanModal();
        onScanSuccess(decodedText, null);
    } catch (err) {
        showToast('Could not find barcode in image. Try another image.', 'error');
    }

    event.target.value = '';
}

function onScanFailure(error) {
    // silently handle
}

function openProductModal() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('barcode').value = '';
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
}



async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const isEdit = id !== '';

    const payload = {
        name: document.getElementById('name').value,
        barcode: document.getElementById('barcode').value || null,
        category_id: document.getElementById('categoryId').value || null,
        price: parseFloat(document.getElementById('price').value),
        stock: parseInt(document.getElementById('stock').value),
        min_stock_level: parseInt(document.getElementById('minStockLevel').value)
    };

    const endpoint = isEdit ? `/products/${id}` : '/products';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiCall(endpoint, method, payload);

    if (res.data.success) {
        showToast(isEdit ? 'Product updated!' : 'Product added!', 'success');
        closeProductModal();
        loadProducts();
    } else {
        showToast(res.data.message || 'Error saving product', 'error');
    }
}

async function editProduct(id) {
    const p = allProducts.find(product => product.id === id);
    if (!p) return;

    document.getElementById('productId').value = p.id;
    document.getElementById('name').value = p.name;
    document.getElementById('barcode').value = p.barcode || '';
    document.getElementById('categoryId').value = p.category_id || '';
    document.getElementById('price').value = p.price;
    document.getElementById('stock').value = p.stock;
    document.getElementById('minStockLevel').value = p.min_stock_level;

    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('productModal').classList.remove('hidden');
}

async function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        const res = await apiCall(`/products/${id}`, 'DELETE');
        if (res.data.success) {
            showToast('Product deleted!', 'success');
            loadProducts();
        } else {
            showToast(res.data.message || 'Error deleting product', 'error');
        }
    }
}
