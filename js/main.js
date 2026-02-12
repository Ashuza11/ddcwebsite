/**
 * DDC RDC — Main JavaScript
 * Dynamique Debout Congolais
 * Animations (GSAP), Google Forms integration, dynamic content
 */

(function () {
    'use strict';

    // =========================================
    // CONFIGURATION
    // =========================================

    /**
     * GOOGLE FORM CONFIGURATION
     * Replace with your actual Google Form action URL and entry IDs.
     *
     * How to find these:
     * 1. Open your Google Form in edit mode
     * 2. Click the 3 dots menu > "Get pre-filled link"
     * 3. Fill in all fields and click "Get link"
     * 4. In the generated URL, find "entry.XXXXXXX" for each field
     * 5. The base URL before "?..." is your GOOGLE_FORM_ACTION_URL
     *    (change "viewform" to "formResponse")
     */
    const GOOGLE_FORM_ACTION_URL = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID_HERE/formResponse';

    /**
     * CLOUDFLARE WORKER API URL
     * Replace with your deployed worker URL for dynamic content (admin-managed news, events)
     */
    const API_BASE_URL = '/api'; // e.g., 'https://ddc-api.your-subdomain.workers.dev'


    // =========================================
    // LOADER
    // =========================================

    const loader = document.getElementById('loader');
    const loaderBar = document.getElementById('loader-bar');
    let loadProgress = 0;

    function animateLoader() {
        const interval = setInterval(() => {
            loadProgress += Math.random() * 15 + 5;
            if (loadProgress >= 100) {
                loadProgress = 100;
                loaderBar.style.width = '100%';
                clearInterval(interval);
                setTimeout(() => {
                    loader.classList.add('hidden');
                    initHeroAnimations();
                }, 300);
            } else {
                loaderBar.style.width = loadProgress + '%';
            }
        }, 100);
    }

    window.addEventListener('load', animateLoader);


    // =========================================
    // GSAP — HERO ANIMATIONS
    // =========================================

    function initHeroAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        heroTl
            .to('#hero-logo', {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1,
                from: { y: -40, scale: 0.8 }
            })
            .to('#hero-badge', {
                opacity: 1,
                y: 0,
                duration: 0.7,
            }, '-=0.5')
            .to('#hero-title', {
                opacity: 1,
                y: 0,
                duration: 0.9,
            }, '-=0.4')
            .to('#hero-subtitle', {
                opacity: 1,
                y: 0,
                duration: 0.7,
            }, '-=0.4')
            .to('#hero-cta', {
                opacity: 1,
                y: 0,
                duration: 0.7,
            }, '-=0.3')
            .to('#hero-stats', {
                opacity: 1,
                y: 0,
                duration: 0.7,
            }, '-=0.2')
            .to('#scroll-indicator', {
                opacity: 1,
                duration: 0.5,
            }, '-=0.1');

        // Counter animation for stats
        heroTl.call(animateCounters, null, '-=0.3');

        // Init scroll animations
        initScrollReveal();
    }


    // =========================================
    // COUNTER ANIMATION
    // =========================================

    function animateCounters() {
        const counters = document.querySelectorAll('[data-count]');
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-count'));
            const duration = 2;
            const obj = { val: 0 };

            gsap.to(obj, {
                val: target,
                duration: duration,
                ease: 'power2.out',
                onUpdate: () => {
                    counter.textContent = Math.round(obj.val);
                    if (target >= 100) {
                        counter.textContent = Math.round(obj.val).toLocaleString('fr-FR');
                    }
                }
            });
        });
    }


    // =========================================
    // GSAP — SCROLL REVEAL
    // =========================================

    function initScrollReveal() {
        // Reveal Up
        gsap.utils.toArray('.reveal-up').forEach(el => {
            ScrollTrigger.create({
                trigger: el,
                start: 'top 85%',
                onEnter: () => el.classList.add('revealed'),
                once: true
            });
        });

        // Reveal Left
        gsap.utils.toArray('.reveal-left').forEach(el => {
            ScrollTrigger.create({
                trigger: el,
                start: 'top 85%',
                onEnter: () => el.classList.add('revealed'),
                once: true
            });
        });

        // Reveal Right
        gsap.utils.toArray('.reveal-right').forEach(el => {
            ScrollTrigger.create({
                trigger: el,
                start: 'top 85%',
                onEnter: () => el.classList.add('revealed'),
                once: true
            });
        });

        // Staggered program cards
        ScrollTrigger.create({
            trigger: '#programmes',
            start: 'top 70%',
            onEnter: () => {
                gsap.utils.toArray('.program-card').forEach((card, i) => {
                    setTimeout(() => {
                        card.classList.add('revealed');
                    }, i * 120);
                });
            },
            once: true
        });

        // Parallax effect for hero shapes
        gsap.to('.hero-shape', {
            yPercent: -50,
            ease: 'none',
            scrollTrigger: {
                trigger: '#accueil',
                start: 'top top',
                end: 'bottom top',
                scrub: true,
            }
        });
    }


    // =========================================
    // NAVIGATION
    // =========================================

    const navbar = document.getElementById('navbar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    // Scroll effect
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Update active nav link
        updateActiveNav();

        lastScroll = currentScroll;
    }, { passive: true });

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('open');
        document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    // Close mobile menu on link click
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            hamburger.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Active nav link on scroll
    function updateActiveNav() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 150;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPos >= top && scrollPos < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }


    // =========================================
    // EVENT FILTER
    // =========================================

    const filterBtns = document.querySelectorAll('.event-filter');
    const eventCards = document.querySelectorAll('.event-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;

            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter cards
            eventCards.forEach(card => {
                if (filter === 'all' || card.dataset.year === filter) {
                    card.classList.remove('hidden-filter');
                    gsap.fromTo(card, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
                } else {
                    card.classList.add('hidden-filter');
                }
            });
        });
    });


    // =========================================
    // LIGHTBOX
    // =========================================

    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');

    // Open lightbox on event card or gallery image click
    document.querySelectorAll('.event-card, .gallery-img').forEach(el => {
        el.addEventListener('click', () => {
            let imgSrc;
            if (el.tagName === 'IMG') {
                imgSrc = el.src;
            } else {
                const img = el.querySelector('img');
                if (img) imgSrc = img.src;
            }
            if (imgSrc) {
                lightboxImg.src = imgSrc;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxImg.src = '';
    }


    // =========================================
    // GOOGLE FORMS — ADHESION FORM
    // =========================================

    const adhesionForm = document.getElementById('adhesion-form');
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitArrow = document.getElementById('submit-arrow');
    const submitSpinner = document.getElementById('submit-spinner');
    const formSuccess = document.getElementById('form-success');
    const formError = document.getElementById('form-error');

    adhesionForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Basic validation
        const requiredFields = adhesionForm.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('border-red-500/50');
                field.addEventListener('input', () => {
                    field.classList.remove('border-red-500/50');
                }, { once: true });
            }
        });

        if (!isValid) return;

        // Show loading state
        submitBtn.disabled = true;
        submitText.textContent = 'Envoi en cours...';
        submitArrow.classList.add('hidden');
        submitSpinner.classList.remove('hidden');
        formSuccess.classList.add('hidden');
        formError.classList.add('hidden');

        // Build form data
        const formData = new FormData(adhesionForm);

        try {
            // Send to Google Forms using no-cors mode
            // This prevents redirect and keeps user on the page
            await fetch(GOOGLE_FORM_ACTION_URL, {
                method: 'POST',
                body: formData,
                mode: 'no-cors' // Important: prevents CORS errors with Google Forms
            });

            // Show success (we can't read the response in no-cors, but the data is sent)
            adhesionForm.reset();
            formSuccess.classList.remove('hidden');

            gsap.fromTo(formSuccess, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });

        } catch (error) {
            console.error('Form submission error:', error);
            formError.classList.remove('hidden');
            gsap.fromTo(formError, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitText.textContent = 'Envoyer ma candidature';
            submitArrow.classList.remove('hidden');
            submitSpinner.classList.add('hidden');
        }
    });


    // =========================================
    // DYNAMIC CONTENT — CLOUDFLARE WORKER API
    // =========================================

    /**
     * Fetch and display dynamic news articles from the API
     * These are managed via the /admin interface
     */
    async function loadDynamicNews() {
        try {
            const response = await fetch(`${API_BASE_URL}/news`);
            if (!response.ok) return;

            const news = await response.json();
            const container = document.getElementById('news-dynamic');
            if (!container || !news.length) return;

            news.forEach(article => {
                const card = document.createElement('div');
                card.className = 'event-card group relative rounded-2xl overflow-hidden reveal-up revealed';
                card.dataset.year = new Date(article.date).getFullYear().toString();

                card.innerHTML = `
                    <div class="aspect-[4/3] overflow-hidden">
                        <img src="${escapeHtml(article.image_url)}" alt="${escapeHtml(article.title)}"
                             class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy"
                             onerror="this.src='img/DDClogo.png'; this.classList.add('p-12','opacity-30')">
                    </div>
                    <div class="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/40 to-transparent"></div>
                    <div class="absolute bottom-0 left-0 right-0 p-6">
                        <span class="inline-block px-3 py-1 text-[10px] font-bold tracking-wider text-gold-400 bg-gold-500/20 backdrop-blur-sm rounded-full mb-3">
                            ${escapeHtml(formatDate(article.date))}
                        </span>
                        <h3 class="text-lg font-heading font-bold text-white mb-2">${escapeHtml(article.title)}</h3>
                        <p class="text-white/50 text-sm">${escapeHtml(article.excerpt || '')}</p>
                    </div>
                `;

                container.appendChild(card);
            });

        } catch (err) {
            // Silent fail — static content remains visible
            console.log('API not available, using static content only.');
        }
    }

    /**
     * Fetch and display dynamic publications from the API
     */
    async function loadDynamicPublications() {
        try {
            const response = await fetch(`${API_BASE_URL}/publications`);
            if (!response.ok) return;

            const pubs = await response.json();
            const container = document.getElementById('publications-dynamic');
            if (!container || !pubs.length) return;

            const typeColors = {
                'RAPPORT': 'royal',
                'ANALYSE': 'gold',
                'TRIBUNE': 'emerald'
            };

            pubs.forEach(pub => {
                const colorKey = typeColors[pub.type] || 'royal';
                const article = document.createElement('article');
                article.className = 'group reveal-up revealed';

                article.innerHTML = `
                    <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 h-full hover:border-royal-500/30 transition-all duration-500 hover:bg-white/[0.05]">
                        <div class="flex items-center gap-3 mb-6">
                            <span class="px-3 py-1 text-[10px] font-bold tracking-wider text-${colorKey}-400 bg-${colorKey}-500/20 rounded-full">${escapeHtml(pub.type)}</span>
                            <span class="text-white/30 text-xs">${new Date(pub.date).getFullYear()}</span>
                        </div>
                        <h3 class="text-lg font-heading font-bold text-white mb-3 group-hover:text-gold-400 transition-colors leading-snug">
                            ${escapeHtml(pub.title)}
                        </h3>
                        <p class="text-white/40 text-sm leading-relaxed mb-6">
                            ${escapeHtml(pub.excerpt || '')}
                        </p>
                        <div class="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                            <span class="text-xs text-white/30">${pub.pages ? pub.pages + ' pages' : ''}</span>
                            ${pub.url ? `<a href="${escapeHtml(pub.url)}" target="_blank" rel="noopener" class="text-gold-400 text-sm font-medium hover:text-gold-300 transition-colors flex items-center gap-1">
                                Lire <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            </a>` : ''}
                        </div>
                    </div>
                `;

                container.appendChild(article);
            });

        } catch (err) {
            console.log('Publications API not available.');
        }
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

    function formatDate(dateStr) {
        const months = [
            'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
            'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
        ];
        const d = new Date(dateStr);
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    }


    // =========================================
    // SMOOTH SCROLL (fallback for older browsers)
    // =========================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const offset = 80; // navbar height
                const top = target.getBoundingClientRect().top + window.scrollY - offset;

                window.scrollTo({
                    top: top,
                    behavior: 'smooth'
                });
            }
        });
    });


    // =========================================
    // INIT DYNAMIC CONTENT
    // =========================================

    // Load dynamic content from API (fails silently if API not deployed)
    document.addEventListener('DOMContentLoaded', () => {
        loadDynamicNews();
        loadDynamicPublications();
    });

})();
