/**
 * DDC RDC — Admin Panel JavaScript
 * Handles CRUD operations via Cloudflare Worker API
 */

(function () {
    'use strict';

    // =========================================
    // CONFIGURATION
    // =========================================

    const API_BASE_URL = '/api'; // Replace with your Cloudflare Worker URL

    let authToken = sessionStorage.getItem('ddc_admin_token') || null;
    let currentSection = 'news';
    let editingId = null;


    // =========================================
    // DOM ELEMENTS
    // =========================================

    const loginScreen = document.getElementById('login-screen');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const dashboard = document.getElementById('admin-dashboard');
    const sectionTitle = document.getElementById('section-title');
    const addBtn = document.getElementById('add-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');
    const modalFields = document.getElementById('modal-fields');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');

    const confirmDialog = document.getElementById('confirm-dialog');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmOk = document.getElementById('confirm-ok');

    const toastContainer = document.getElementById('toast-container');

    const sidebarLinks = document.querySelectorAll('.sidebar-link');


    // =========================================
    // AUTH
    // =========================================

    // Check if already logged in
    if (authToken) {
        showDashboard();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        loginError.classList.add('hidden');

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!res.ok) {
                throw new Error('Identifiants incorrects');
            }

            const data = await res.json();
            authToken = data.token;
            sessionStorage.setItem('ddc_admin_token', authToken);
            showDashboard();

        } catch (err) {
            loginError.textContent = err.message || 'Erreur de connexion';
            loginError.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        authToken = null;
        sessionStorage.removeItem('ddc_admin_token');
        dashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        loginScreen.style.display = '';
    });

    function showDashboard() {
        loginScreen.style.display = 'none';
        dashboard.classList.remove('hidden');
        loadSection('news');
    }


    // =========================================
    // NAVIGATION
    // =========================================

    const sectionTitles = {
        news: 'Gestion des Actualités',
        events: 'Gestion des Événements',
        publications: 'Gestion des Publications'
    };

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            loadSection(section);
        });
    });

    function loadSection(section) {
        currentSection = section;
        sectionTitle.textContent = sectionTitles[section];

        // Update sidebar
        sidebarLinks.forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Show/hide sections
        document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`section-${section}`).classList.remove('hidden');

        // Load data
        fetchData(section);
    }


    // =========================================
    // DATA FETCHING
    // =========================================

    async function fetchData(section) {
        const listEl = document.getElementById(`${section}-list`);
        listEl.innerHTML = '<div class="text-center py-12 text-white/30"><p>Chargement...</p></div>';

        try {
            const res = await fetch(`${API_BASE_URL}/${section}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (res.status === 401) {
                logoutBtn.click();
                return;
            }

            const data = await res.json();
            renderList(section, data, listEl);

        } catch (err) {
            listEl.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-white/30 mb-4">Impossible de charger les données.</p>
                    <p class="text-white/20 text-sm">Vérifiez que le Cloudflare Worker est déployé et configuré.</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-sm text-white/50 hover:text-white transition-colors">Réessayer</button>
                </div>
            `;
        }
    }

    function renderList(section, items, container) {
        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-white/30">
                    <p>Aucun élément. Cliquez "Ajouter" pour commencer.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => {
            const date = item.date ? new Date(item.date).toLocaleDateString('fr-FR') : '';
            return `
                <div class="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4 hover:border-white/[0.1] transition-colors">
                    ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" class="w-20 h-20 rounded-lg object-cover flex-shrink-0" onerror="this.style.display='none'">` : ''}
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-white text-sm truncate">${escapeHtml(item.title)}</h4>
                        <p class="text-white/40 text-xs mt-1 line-clamp-2">${escapeHtml(item.excerpt || item.description || '')}</p>
                        <div class="flex items-center gap-3 mt-2">
                            <span class="text-white/20 text-xs">${date}</span>
                            ${item.type ? `<span class="px-2 py-0.5 text-[10px] bg-royal-500/20 text-royal-300 rounded-full">${escapeHtml(item.type)}</span>` : ''}
                            ${item.status === 'draft' ? '<span class="px-2 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded-full">Brouillon</span>' : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button onclick="window.adminEdit('${section}', ${item.id})" class="w-8 h-8 bg-white/[0.05] rounded-lg flex items-center justify-center text-white/30 hover:text-gold-400 transition-colors" title="Modifier">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onclick="window.adminDelete('${section}', ${item.id})" class="w-8 h-8 bg-white/[0.05] rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-colors" title="Supprimer">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }


    // =========================================
    // FORM SCHEMAS
    // =========================================

    const formSchemas = {
        news: [
            { name: 'title', label: 'Titre', type: 'text', required: true },
            { name: 'excerpt', label: 'Résumé', type: 'textarea', required: false },
            { name: 'content', label: 'Contenu', type: 'textarea', required: false, rows: 6 },
            { name: 'image_url', label: 'URL de l\'image', type: 'text', required: false, placeholder: 'img/chemin/photo.jpg' },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'status', label: 'Statut', type: 'select', options: [{ value: 'published', label: 'Publié' }, { value: 'draft', label: 'Brouillon' }] },
        ],
        events: [
            { name: 'title', label: 'Titre de l\'événement', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea', required: false },
            { name: 'image_url', label: 'URL de l\'image', type: 'text', required: false, placeholder: 'img/chemin/photo.jpg' },
            { name: 'date', label: 'Date de l\'événement', type: 'date', required: true },
            { name: 'location', label: 'Lieu', type: 'text', required: false, placeholder: 'Kinshasa, RDC' },
            { name: 'status', label: 'Statut', type: 'select', options: [{ value: 'upcoming', label: 'À venir' }, { value: 'past', label: 'Passé' }, { value: 'draft', label: 'Brouillon' }] },
        ],
        publications: [
            { name: 'title', label: 'Titre', type: 'text', required: true },
            { name: 'excerpt', label: 'Résumé', type: 'textarea', required: false },
            { name: 'type', label: 'Type', type: 'select', options: [{ value: 'RAPPORT', label: 'Rapport' }, { value: 'ANALYSE', label: 'Analyse' }, { value: 'TRIBUNE', label: 'Tribune' }] },
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'pages', label: 'Nombre de pages', type: 'number', required: false },
            { name: 'url', label: 'Lien du document', type: 'text', required: false, placeholder: 'https://...' },
        ],
    };


    // =========================================
    // MODAL
    // =========================================

    addBtn.addEventListener('click', () => {
        editingId = null;
        openModal(currentSection, `Ajouter — ${sectionTitles[currentSection].replace('Gestion des ', '')}`);
    });

    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    function openModal(section, title, data = {}) {
        modalTitle.textContent = title;
        const schema = formSchemas[section];

        modalFields.innerHTML = schema.map(field => {
            const value = data[field.name] || '';

            if (field.type === 'textarea') {
                return `
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-2">${field.label}${field.required ? ' *' : ''}</label>
                        <textarea name="${field.name}" rows="${field.rows || 3}" ${field.required ? 'required' : ''}
                            class="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-royal-500/50 transition-all resize-none text-sm"
                            placeholder="${field.placeholder || ''}">${escapeHtml(value)}</textarea>
                    </div>`;
            }

            if (field.type === 'select') {
                return `
                    <div>
                        <label class="block text-sm font-medium text-white/60 mb-2">${field.label}</label>
                        <select name="${field.name}"
                            class="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-royal-500/50 transition-all text-sm">
                            ${field.options.map(opt => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''} class="bg-dark-900">${opt.label}</option>`).join('')}
                        </select>
                    </div>`;
            }

            return `
                <div>
                    <label class="block text-sm font-medium text-white/60 mb-2">${field.label}${field.required ? ' *' : ''}</label>
                    <input type="${field.type}" name="${field.name}" value="${escapeHtml(value)}" ${field.required ? 'required' : ''}
                        class="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-royal-500/50 transition-all text-sm"
                        placeholder="${field.placeholder || ''}">
                </div>`;
        }).join('');

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        editingId = null;
        modalForm.reset();
    }

    modalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(modalForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId
                ? `${API_BASE_URL}/${currentSection}/${editingId}`
                : `${API_BASE_URL}/${currentSection}`;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(data)
            });

            if (!res.ok) throw new Error('Erreur serveur');

            toast(editingId ? 'Modifié avec succès' : 'Ajouté avec succès', 'success');
            closeModal();
            fetchData(currentSection);

        } catch (err) {
            toast('Erreur: ' + err.message, 'error');
        }
    });


    // =========================================
    // EDIT / DELETE
    // =========================================

    window.adminEdit = async function (section, id) {
        try {
            const res = await fetch(`${API_BASE_URL}/${section}/${id}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();
            editingId = id;
            openModal(section, `Modifier — ${data.title || 'Élément'}`, data);
        } catch (err) {
            toast('Erreur de chargement', 'error');
        }
    };

    let deleteCallback = null;

    window.adminDelete = function (section, id) {
        confirmDialog.classList.remove('hidden');
        confirmDialog.classList.add('flex');

        deleteCallback = async () => {
            try {
                await fetch(`${API_BASE_URL}/${section}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                toast('Supprimé avec succès', 'success');
                fetchData(section);
            } catch (err) {
                toast('Erreur de suppression', 'error');
            }
        };
    };

    confirmOk.addEventListener('click', () => {
        if (deleteCallback) deleteCallback();
        closeConfirm();
    });

    confirmCancel.addEventListener('click', closeConfirm);
    confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog) closeConfirm();
    });

    function closeConfirm() {
        confirmDialog.classList.add('hidden');
        confirmDialog.classList.remove('flex');
        deleteCallback = null;
    }


    // =========================================
    // TOAST NOTIFICATIONS
    // =========================================

    function toast(message, type = 'info') {
        const colors = {
            success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
            error: 'bg-red-500/10 border-red-500/30 text-red-400',
            info: 'bg-royal-500/10 border-royal-500/30 text-royal-300',
        };

        const el = document.createElement('div');
        el.className = `toast px-5 py-3 rounded-xl border text-sm ${colors[type] || colors.info}`;
        el.textContent = message;

        toastContainer.appendChild(el);

        setTimeout(() => {
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }


    // =========================================
    // UTILITIES
    // =========================================

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
