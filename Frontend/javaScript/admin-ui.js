document.addEventListener('DOMContentLoaded', () => {
    initAdminDashboard();
});

const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', view: 'dashboard' },
    { id: 'products', label: 'Productos', icon: 'inventory_2', view: 'products' },
    { id: 'sales', label: 'Ventas', icon: 'shopping_bag', view: 'sales' },
    { id: 'users', label: 'Usuarios', icon: 'group', view: 'users' },
    { id: 'marketing', label: 'Marketing', icon: 'campaign', view: 'marketing' }
];

function initAdminDashboard() {
    renderSidebar();
    loadContent('dashboard');
    initFileUpload();
}

function initFileUpload() {
    const fileInput = document.getElementById('p-image');
    const fileNameDisplay = document.getElementById('file-name-display');

    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                fileNameDisplay.textContent = this.files[0].name;
                fileNameDisplay.style.color = '#0f172a'; // Darker text for active file
            } else {
                fileNameDisplay.textContent = '';
            }
        });
    }
}

function renderSidebar() {
    const sidebarList = document.getElementById('admin-menu-list');
    if (!sidebarList) return;

    sidebarList.innerHTML = menuItems.map(item => `
        <li>
            <a href="#" 
               class="admin-sidebar__link ${item.id === 'dashboard' ? 'active' : ''}" 
               data-view="${item.view}"
               onclick="handleNavigation(event, '${item.view}')"
            >
                <span class="material-symbols-outlined admin-sidebar__icon">${item.icon}</span>
                ${item.label}
            </a>
        </li>
    `).join('');
}

window.handleNavigation = (event, viewName) => {
    event.preventDefault();

    // Update Active State
    document.querySelectorAll('.admin-sidebar__link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewName) link.classList.add('active');
    });

    loadContent(viewName);
}

function loadContent(viewName) {
    const contentArea = document.getElementById('admin-content-area');
    if (!contentArea) return;

    let html = '';

    switch (viewName) {
        case 'dashboard':
            html = `
                <div class="view-header">
                    <div>
                        <h2 class="view-title">Dashboard</h2>
                        <p class="view-subtitle">Resumen general de tu tienda Vesper</p>
                    </div>
                </div>
                <div class="dashboard-grid">
                    <div class="stat-card">
                        <div class="stat-card__header">
                             <div class="stat-card__icon-box blue">
                                <span class="material-symbols-outlined">attach_money</span>
                             </div>
                             <span class="stat-card__change positive">+12.5%</span>
                        </div>
                        <span class="stat-card__value">$1,250,500</span>
                        <span class="stat-card__title">Ventas Totales</span>
                    </div>
                    
                    <div class="stat-card">
                         <div class="stat-card__header">
                             <div class="stat-card__icon-box orange">
                                <span class="material-symbols-outlined">pending_actions</span>
                             </div>
                             <span class="stat-card__change negative">-2.4%</span>
                        </div>
                        <span class="stat-card__value">45</span>
                         <span class="stat-card__title">Pedidos Pendientes</span>
                    </div>

                    <div class="stat-card">
                         <div class="stat-card__header">
                             <div class="stat-card__icon-box green">
                                <span class="material-symbols-outlined">person_add</span>
                             </div>
                             <span class="stat-card__change positive">+8.2%</span>
                        </div>
                        <span class="stat-card__value">128</span>
                        <span class="stat-card__title">Nuevos Clientes</span>
                    </div>

                    <div class="stat-card">
                         <div class="stat-card__header">
                             <div class="stat-card__icon-box purple">
                                <span class="material-symbols-outlined">shopping_basket</span>
                             </div>
                        </div>
                        <span class="stat-card__value">850</span>
                        <span class="stat-card__title">Productos Vendidos</span>
                    </div>
                </div>
            `;
            break;
        case 'products':
            html = `
                <div class="view-header">
                    <div>
                        <h2 class="view-title">Productos</h2>
                        <p class="view-subtitle">Gestiona tu catálogo de perfumes y decants</p>
                    </div>
                    <div class="view-actions">
                        <div class="search-bar">
                            <span class="material-symbols-outlined search-icon">search</span>
                            <input type="text" placeholder="Buscar producto..." class="search-input">
                        </div>
                        <button class="btn btn--primary" onclick="openProductModal()">
                            <span class="material-symbols-outlined">add</span> Nuevo Producto
                        </button>
                    </div>
                </div>
                <div class="table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Marca</th>
                                <th>Género</th>
                                <th>Volumen</th>
                                <th>Tipo</th>
                                <th>Precio</th>
                                <th>Stock</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight: 500;">Sauvage Elixir</td>
                                <td>Dior</td>
                                <td>Masculino</td>
                                <td>60ml</td>
                                <td>Perfume</td>
                                <td>$180,000</td>
                                <td>
                                    <div class="stock-cell">
                                        <span>24</span>
                                        <button class="btn-icon-small" title="Editar stock">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                    </div>
                                </td>
                                <td><span class="status-badge is-active">Activo</span></td>
                                <td class="column-actions">
                                    <button class="btn-icon" title="Editar" onclick="handleEditClick(this)">
                                        <span class="material-symbols-outlined">edit</span>
                                    </button>
                                    <button class="btn-icon btn-icon--danger" title="Eliminar">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-weight: 500;">Bleu de Chanel</td>
                                <td>Chanel</td>
                                <td>Masculino</td>
                                <td>100ml</td>
                                <td>Perfume</td>
                                <td>$210,000</td>
                                <td>
                                    <div class="stock-cell">
                                        <span>12</span>
                                        <button class="btn-icon-small" title="Editar stock">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                    </div>
                                </td>
                                <td><span class="status-badge is-active">Activo</span></td>
                                <td class="column-actions">
                                    <button class="btn-icon" title="Editar" onclick="handleEditClick(this)">
                                        <span class="material-symbols-outlined">edit</span>
                                    </button>
                                    <button class="btn-icon btn-icon--danger" title="Eliminar">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </td>
                            </tr>
                             <tr>
                                <td style="font-weight: 500;">Le Male</td>
                                <td>Jean Paul Gaultier</td>
                                <td>Masculino</td>
                                <td>10ml</td>
                                <td>Decant</td>
                                <td>$15,000</td>
                                <td>
                                    <div class="stock-cell">
                                        <span>0</span>
                                        <button class="btn-icon-small" title="Editar stock">
                                            <span class="material-symbols-outlined">edit</span>
                                        </button>
                                    </div>
                                </td>
                                <td><span class="status-badge is-inactive">Sin Stock</span></td>
                                <td class="column-actions">
                                    <button class="btn-icon" title="Editar" onclick="handleEditClick(this)">
                                        <span class="material-symbols-outlined">edit</span>
                                    </button>
                                    <button class="btn-icon btn-icon--danger" title="Eliminar">
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            break;
        default:
            html = `
                <div class="empty-state-view">
                    <span class="material-symbols-outlined empty-icon">construction</span>
                    <h2>Sección en Construcción</h2>
                    <p>Estamos trabajando duro en el módulo de <strong>${viewName}</strong>. ¡Pronto estará disponible!</p>
                </div>
            `;
    }

    contentArea.innerHTML = html;
}

/* --- Modal Logic --- */

window.openProductModal = (productData = null) => {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');

    if (!modal || !form) return;

    // Reset Form
    form.reset();
    document.getElementById('p-id').value = '';
    const nameDisplay = document.getElementById('file-name-display');
    if (nameDisplay) nameDisplay.textContent = '';

    if (productData) {
        // Edit Mode
        title.textContent = 'Editar Producto';
        document.getElementById('p-id').value = productData.id || '';
        document.getElementById('p-name').value = productData.name || '';
        document.getElementById('p-brand').value = productData.brand || '';
        document.getElementById('p-type').value = productData.type || 'Perfume';
        document.getElementById('p-price').value = productData.price || '';
        document.getElementById('p-stock').value = productData.stock || '';

        // Mockup extra fields (since they are not in the table yet)
        document.getElementById('p-fragrance').value = productData.name?.split(' ')?.[0] || '';
        document.getElementById('p-gender').value = productData.gender || 'Masculino';
        document.getElementById('p-volume').value = productData.volume || '100ml';
        document.getElementById('p-ml').value = parseFloat(productData.volume) || 100;
        document.getElementById('p-ml').value = parseFloat(productData.volume) || 100;

        // Note: File input 'p-image' cannot be pre-filled via JS for security reasons.
        // In a real app, you would show a thumbnail of the existing image here.
    } else {
        // Create Mode
        title.textContent = 'Nuevo Producto';
    }

    modal.classList.remove('hidden');
    // small delay to allow display:block to apply before opacity transition
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

window.closeProductModal = () => {
    const modal = document.getElementById('product-modal');
    if (!modal) return;

    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300); // match transition duration
}

window.handleProductSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    console.log('Form Submitted:', data);
    alert('Simulación: Producto guardado exitosamente.\n(Ver consola para datos)');

    closeProductModal();
    // Here we would call the API reload function
}

/* Helper to simulate edit click with data */
window.handleEditClick = (btn) => {
    // In a real app, we would fetch the full object data.
    // For this mockup, we'll try to scrape the row or just use dummy data.
    const row = btn.closest('tr');
    if (!row) return;

    const dummyData = {
        id: '123',
        name: row.cells[0].innerText,
        brand: row.cells[1].innerText,
        gender: row.cells[2].innerText,
        volume: row.cells[3].innerText,
        type: row.cells[4].innerText,
        price: row.cells[5].innerText.replace(/[^0-9.]/g, ''),
        stock: row.querySelector('.stock-cell span').innerText
    };

    openProductModal(dummyData);
}
