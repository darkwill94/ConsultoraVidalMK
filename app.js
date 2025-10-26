// ==========================================================
// === LÓGICA DEL CARRITO Y CARGA/ADMIN DE PRODUCTOS (app.js) ===
// ==========================================================

// Variable global para el intervalo del carrusel principal
let heroCarouselInterval = null;

// Variable global para el intervalo del carrusel Oportunidad MK
let oportunidadCarouselInterval = null;

// --- Funciones Helpers para LocalStorage ---
function getCarritoFromStorage() {
    try {
        const carritoJSON = localStorage.getItem('carrito');
        return carritoJSON ? JSON.parse(carritoJSON) : [];
    } catch (e) {
        console.error("Error leyendo carrito de LocalStorage:", e);
        return []; // Devolver vacío en caso de error
    }
}
function saveCarritoToStorage(carrito) {
     try {
        localStorage.setItem('carrito', JSON.stringify(carrito));
    } catch (e) {
         console.error("Error guardando carrito en LocalStorage:", e);
    }
}

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Esperando inicialización de Firebase...");
    // Intervalo para verificar si Firebase está listo
    let checkFirebaseInterval = setInterval(() => {
        // Verificar si las variables globales db y auth (definidas en el HTML) existen
        if (typeof db !== 'undefined' && typeof auth !== 'undefined' && typeof ADMIN_EMAIL !== 'undefined') {
            clearInterval(checkFirebaseInterval); // Detener la verificación
            console.log("Firebase y config OK detectados. Inicializando lógica de la página...");
            try {
                 initializePageLogic(); // Llamar a la lógica principal
            } catch(e) {
                console.error("Error CRÍTICO durante initializePageLogic:", e);
                 displayError(document.querySelector('main'), "Error fatal al inicializar la página.");
            }
        } else {
             // console.log("Esperando Firebase..."); // Opcional
        }
    }, 150); // Verificar cada 150ms

    // Timeout de seguridad
    setTimeout(() => {
        if (typeof db === 'undefined' || typeof auth === 'undefined') {
            clearInterval(checkFirebaseInterval);
            console.error("Firebase no se inicializó después de 5 segundos.");
            displayError(document.querySelector('main'), "Error: No se pudo conectar a los servicios de Firebase.");
        }
    }, 5000); // Esperar máximo 5 segundos

}); // Fin DOMContentLoaded


// --- Función separada para la lógica de inicialización de página ---
function initializePageLogic() {
    // Lógica Común
    if (typeof actualizarContadorCarrito === 'function') {
        actualizarContadorCarrito();
    }

    // El buscador ahora está en el header, así que se inicializa en CADA página
    setupSearchForm();
    
    // +++ AÑADIDO: Inicializar el menú hamburguesa en CADA página +++
    setupHamburgerMenu();
    // +++ FIN AÑADIDO +++

    // Lógica Específica
    const pathname = window.location.pathname; // e.g., "/admin/" o "/productos-marykay"

    // +++ FIX: Mejorar la detección de página para Netlify "pretty URLs" +++
    // Filtra partes vacías (ej. de "/admin/") y toma la última parte
    const pathParts = pathname.split('/').filter(part => part !== '');
    // Si no hay partes (solo "/"), usa 'index'. Si no, toma la última parte.
    const rawPageName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'index';
    // Quita .html si existe, para tener un nombre limpio (ej. "admin", "productos-marykay")
    const currentPage = rawPageName.replace('.html', '');
    // +++ FIN FIX +++

    console.log("Página actual detectada (normalizada):", currentPage); // Logueará 'admin', 'productos-marykay', 'index', etc.

    try {

        // +++ LÓGICA DE CATÁLOGO POR CATEGORÍAS (Mary Kay, Biogreen, Arbell y Nexo) +++
        const catalogoContainerCliente = document.getElementById('catalogo-container');

        const isCategoryPage = catalogoContainerCliente &&
                                (currentPage === 'productos-marykay' ||
                                 currentPage === 'productos-biogreen' ||
                                 currentPage === 'productos-arbell' ||
                                 currentPage === 'productos-nexo');

        if (isCategoryPage) {
            let brand = null;
            if (currentPage === 'productos-marykay') brand = 'marykay';
            else if (currentPage === 'productos-biogreen') brand = 'biogreen';
            else if (currentPage === 'productos-arbell') brand = 'arbell';
            else if (currentPage === 'productos-nexo') brand = 'nexo';

            if (brand) {
                console.log(`Cargando catálogo por categorías para: ${brand}`);
                // +++ FIX: Remover el 'else' que muestra "Esperando autenticación..." +++
                auth.onAuthStateChanged(user => {
                    if (user) {
                        // Esto se ejecutará cuando el usuario (admin O anónimo) esté listo
                        console.log("Auth listo para catálogo por categorías, iniciando...");
                        loadIntermediateBanner(brand);
                        iniciarCatalogoPorCategorias(brand, catalogoContainerCliente);
                    }
                    // 'else' removido. Si el usuario es nulo, simplemente esperamos
                    // a que auth.js inicie sesión anónima, lo que disparará este
                    // listener de nuevo, pero esta vez con un 'user'.
                });
                // +++ FIN FIX +++
            }
        }
        // +++ FIN LÓGICA DE CATÁLOGO POR CATEGORÍAS +++

        // Páginas de Catálogo Productos Cliente (SOLO Novedades ahora)
        const productosContainerCliente = document.getElementById('productos-container');

        if (productosContainerCliente && currentPage !== 'admin' && currentPage.startsWith('productos-')) {
            let brandFilter = null;
            if (currentPage === 'productos-novedades') brandFilter = 'novedades';

            if (brandFilter) {
                console.log("Cargando productos cliente (vista plana) para marca:", brandFilter);
                 // +++ FIX: Remover el 'else' que muestra "Esperando autenticación..." +++
                 auth.onAuthStateChanged(user => {
                     if (user) {
                         console.log("Auth listo para productos cliente (plano), cargando...");
                         cargarProductosCliente(brandFilter, productosContainerCliente);
                     }
                     // 'else' removido.
                 });
                 // +++ FIN FIX +++
            } else if (currentPage !== 'productos-marykay' &&
                       currentPage !== 'productos-biogreen' &&
                       currentPage !== 'productos-arbell' &&
                       currentPage !== 'productos-nexo') {
                 console.warn("No se pudo determinar la marca para filtrar productos en:", pathname);
                 displayError(productosContainerCliente, 'Error: No se pudo determinar la categoría.');
            }
        }

        // Página de Admin
        else if (currentPage === 'admin') {
             console.log("Ejecutando lógica para admin.html.");
             // Este bloque 'else' es correcto, porque SÍ queremos denegar acceso
             auth.onAuthStateChanged(user => {
                if (user && user.email === ADMIN_EMAIL) {
                    console.log("Admin verificado en admin.html.");
                    Promise.all([
                         loadCategoriesAdmin(),
                         cargarProductosAdmin(),
                         loadHomepageSettingsAdmin(), // <-- AHORA SÍ EXISTE
                         loadCategoryBannersAdmin(),
                         loadPageImagesAdmin()
                    ]).then(() => {
                         setupAddProductForm();
                         setupHomepageSettingsForm(); // <-- AHORA SÍ EXISTE
                         setupCategoryForm();
                         setupCategoryBannersForm();
                         setupPageImagesForm();
                         console.log("Componentes de admin inicializados.");
                    }).catch(adminInitError => {
                         console.error("Error al inicializar componentes de admin:", adminInitError);
                         displayError(document.querySelector('.admin-container'), "Error al cargar datos del panel.");
                    });
                } else if (user) {
                     console.warn('Acceso denegado a admin.html (onAuthStateChanged no es admin):', user.email || user.uid);
                     const adminMain = document.querySelector('.admin-container');
                     if (adminMain) adminMain.innerHTML = '<h2>Acceso Denegado</h2><p>Debes ser administrador.</p>';
                } else {
                     console.warn('Acceso denegado a admin.html (onAuthStateChanged no hay usuario). Redirigiendo a login...');
                     window.location.href = 'login.html'; // Redirigir a login si no hay usuario
                }
            });
        }
        // Página del Carrito
        else if (currentPage === 'carrito') {
            console.log("Ejecutando lógica para carrito.html");
            const contenedorCarritoHTML = document.getElementById('carrito-container');
            if (contenedorCarritoHTML) {
                renderizarCarrito();
            } else { console.warn("Contenedor del carrito no encontrado."); }
        }
        // Página de Búsqueda
        else if (currentPage === 'busqueda') {
            console.log("Ejecutando lógica para busqueda.html");
             // +++ FIX: Remover el 'else' que muestra "Error de autenticación." +++
             auth.onAuthStateChanged(user => {
                if (user) {
                    console.log("Auth listo en busqueda.html, ejecutando búsqueda...");
                    executeSearchPageQuery();
                }
                // 'else' removido.
             });
             // +++ FIN FIX +++
        }
        // Página de Inicio
        else if (currentPage === 'index') {
            console.log("Ejecutando lógica para index.html");
             // Este bloque 'else' está bien, es un fallback visual, no un error.
             auth.onAuthStateChanged(user => {
                if (user) {
                    console.log("Auth listo en index.html, cargando carrusel...");
                    loadAndStartHeroCarousel();
                } else {
                    console.warn("Auth.onAuthStateChanged en index.html: Usuario aún no disponible (puede ser anónimo inicializando). Mostrando fallback.");
                    showStaticHeroContent(); // Mostrar contenido estático mientras tanto
                }
             });
        }
        // Página Oportunidad MK
        else if (currentPage === 'oportunidad-mk') {
             console.log("Ejecutando lógica para oportunidad-mk.html");
             startOportunidadCarousel(); // Este no necesita auth para funcionar
        }
        // Página Quiero Ser Consultora
        else if (currentPage === 'quiero-ser-consultora') {
             console.log("Ejecutando lógica para quiero-ser-consultora.html");
             // Este bloque 'else' está bien, es solo un warning.
             auth.onAuthStateChanged(user => {
                 if (user) {
                     console.log("Auth listo en Consultora, cargando imagen...");
                     loadConsultoraImage(); // Carga la imagen principal dinámicamente
                 } else {
                     console.warn("Auth aún no listo para cargar imagen de Consultora.");
                 }
             });
        }
        else {
            console.log("Página no requiere lógica especial:", currentPage);
        }
    } catch (pageLogicError) {
         console.error(`Error en lógica de ${currentPage}:`, pageLogicError);
         displayError(document.querySelector('main'), "Ocurrió un error inesperado.");
    }
}

// --- Helper para mostrar errores ---
function displayError(container, message) {
    if (!container) {
        console.error("Contenedor no válido para mostrar error:", message);
        return;
    }
    let errorElement = container.querySelector('.app-error-message'); // Usar una clase específica
    if (!errorElement) {
        errorElement = document.createElement('p');
        errorElement.className = 'error-message app-error-message'; // Añadir clase base y específica
        errorElement.style.color = 'red'; // Asegurar visibilidad
        errorElement.style.fontWeight = 'bold';
        errorElement.style.textAlign = 'center';
        errorElement.style.padding = '1rem';
        const heading = container.querySelector('h2, h3, h4'); // Buscar cualquier título
        if (heading && heading.nextSibling) {
             container.insertBefore(errorElement, heading.nextSibling);
        } else {
             container.prepend(errorElement); // Añadir al principio
        }
    }
    const loadingMsg = container.querySelector('.loading-message');
    if (loadingMsg) loadingMsg.style.display = 'none';

    errorElement.textContent = message + " Revisa la consola (F12) para detalles.";
    console.error("Mensaje de error mostrado:", message); // Loguear también
}

// --- Helper para contenido estático del banner ---
function showStaticHeroContent() {
     const heroBannerElement = document.querySelector('.hero-banner');
     if (heroBannerElement) {
         const slidesContainer = heroBannerElement.querySelector('.hero-carousel-slides');
         if (slidesContainer) slidesContainer.innerHTML = ''; // Limpiar slides dinámicos
         const staticContent = heroBannerElement.querySelector('.hero-content');
         if (staticContent) {
             staticContent.style.opacity = '1';
             staticContent.style.display = 'block';
         }
         heroBannerElement.style.backgroundImage = '';
         console.log("Mostrando contenido estático del banner (Fallback).");
     } else {
          console.warn("Elemento .hero-banner no encontrado para fallback.");
     }
}

// --- Carrusel Principal (index.html) ---
async function loadAndStartHeroCarousel() {
    const heroBannerElement = document.querySelector('.hero-banner');
    if (!heroBannerElement) { console.warn('Elemento .hero-banner no encontrado.'); return; }

    try {
        const configDocRef = db.collection('config').doc('homepage');
        console.log("Intentando leer config carrusel de:", configDocRef.path);
        const docSnap = await configDocRef.get();

        let imageUrls = [];

        if (docSnap.exists) {
            const data = docSnap.data();
            console.log("Datos leídos para carrusel:", data);
            if (data && data.heroImageUrls && Array.isArray(data.heroImageUrls) && data.heroImageUrls.length > 0) {
                imageUrls = data.heroImageUrls.filter(url => typeof url === 'string' && url.trim() !== '' && (url.startsWith('http://') || url.startsWith('https://')));
                console.log(`Encontradas ${imageUrls.length} URLs válidas.`);
            } else { console.log("Doc existe pero sin 'heroImageUrls' válidas."); }
        } else { console.log('Doc de config carrusel no existe en', configDocRef.path); }

        if (imageUrls.length === 0) {
            console.log('No hay URLs de Firestore. Usando fallback estático/CSS.');
            showStaticHeroContent(); return;
        }

        let slidesHTML = '';
        imageUrls.forEach((url, index) => {
            slidesHTML += `<div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: url('${url}');"></div>`;
        });
        const existingContentHTML = heroBannerElement.querySelector('.hero-content')?.outerHTML || `
            <div class="hero-content" style="opacity: 1;">
                <h2>El producto del mes</h2>
                <p>Descubre la nueva línea que revolucionará tu rutina.</p>
                <a href="productos-novedades.html" class="hero-boton">Ver Productos</a>
            </div>`;

         heroBannerElement.innerHTML = `<div class="hero-carousel-slides">${slidesHTML}</div>${existingContentHTML}`;
         console.log("HTML del carrusel construido.");
         heroBannerElement.style.backgroundImage = 'none';

        startHeroCarousel();

    } catch (error) {
        console.error("Error GRAVE al cargar/construir carrusel: ", error);
        displayError(heroBannerElement, "Error al cargar el banner principal. Verifica los permisos de lectura.");
        showStaticHeroContent();
    }
}
function startHeroCarousel() {
    const slidesContainer = document.querySelector('.hero-carousel-slides');
    if (!slidesContainer) { console.log("No se encontró '.hero-carousel-slides'."); return; }
    const slides = slidesContainer.querySelectorAll('.hero-slide');
    if (slides.length <= 1) { console.log("Carrusel con <= 1 slide."); if(slides.length === 1 && !slides[0].classList.contains('active')) slides[0].classList.add('active'); return; }

    let currentIndex = 0;
    const intervalTime = 5000;
    console.log(`Iniciando carrusel principal (${slides.length} slides, ${intervalTime}ms).`);

    if (heroCarouselInterval) { console.log("Limpiando intervalo anterior carrusel principal."); clearInterval(heroCarouselInterval); }

    slides.forEach((slide, index) => slide.classList.toggle('active', index === 0));

    heroCarouselInterval = setInterval(() => {
        if(document.hidden) return; // Pausar si no está visible
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, intervalTime);
}

// --- Carrusel Oportunidad MK ---
function startOportunidadCarousel() {
    const slidesContainer = document.querySelector('.oportunidad-mk-slides');
    if (!slidesContainer) { console.log("No se encontró '.oportunidad-mk-slides'."); return; }
    const slides = slidesContainer.querySelectorAll('.oportunidad-mk-slide');
    if (slides.length <= 1) { console.log("Carrusel Oportunidad con <= 1 slide."); if(slides.length === 1 && !slides[0].classList.contains('active')) slides[0].classList.add('active'); return; }

    let currentIndex = 0;
    const intervalTime = 4000;
    console.log(`Iniciando carrusel Oportunidad MK (${slides.length} slides, ${intervalTime}ms).`);

    if (oportunidadCarouselInterval) { console.log("Limpiando intervalo anterior carrusel Oportunidad."); clearInterval(oportunidadCarouselInterval); }

    slides.forEach((slide, index) => slide.classList.toggle('active', index === 0));

    oportunidadCarouselInterval = setInterval(() => {
        if(document.hidden) return;
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, intervalTime);
}

// --- Lógica de Banners Intermedios ---
async function loadCategoryBannersAdmin() {
    const inputs = {
        marykay: document.getElementById('banner-url-marykay'),
        biogreen: document.getElementById('banner-url-biogreen'),
        arbell: document.getElementById('banner-url-arbell'),
        nexo: document.getElementById('banner-url-nexo')
        // novedades: document.getElementById('banner-url-novedades') // Si añades el input
    };
    if (!Object.values(inputs).every(input => input)) {
        console.warn('Alguno de los inputs de URL de banner no se encontró en admin.html.');
        return Promise.reject("Missing banner URL inputs");
    }
    const bannersDocRef = db.collection('config').doc('categoryBanners');
    try {
        console.log("Admin: Cargando URLs de banners de categorías desde:", bannersDocRef.path);
        const docSnap = await bannersDocRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log("Admin: Datos de banners encontrados:", data);
            for (const brand in inputs) {
                inputs[brand].value = data[brand] || '';
            }
            console.log("Admin: URLs de banners cargadas en el formulario.");
        } else {
            console.log("Admin: Documento de config/categoryBanners no existe. Inputs estarán vacíos.");
        }
        return Promise.resolve();
    } catch (error) {
        console.error("Admin: Error cargando URLs de banners de categorías:", error);
        displayError(document.getElementById('manage-banners-container'), "Error al cargar URLs de banners.");
        return Promise.reject(error);
    }
}
function setupCategoryBannersForm() {
    const form = document.getElementById('category-banners-form');
    const feedback = document.getElementById('category-banners-feedback');
    const button = document.getElementById('save-category-banners-button');
    const inputs = {
        marykay: document.getElementById('banner-url-marykay'),
        biogreen: document.getElementById('banner-url-biogreen'),
        arbell: document.getElementById('banner-url-arbell'),
        nexo: document.getElementById('banner-url-nexo')
        // novedades: document.getElementById('banner-url-novedades') // Si añades el input
    };
    if (!form || !feedback || !button || !Object.values(inputs).every(input => input)) {
        console.warn('Elementos del formulario de banners de categoría no encontrados para listeners.');
        return;
    }
    const bannersDocRef = db.collection('config').doc('categoryBanners');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedback.style.display = 'none';
        button.disabled = true;
        button.textContent = 'Guardando...';
        const bannerData = {};
        let hasError = false;
        for (const brand in inputs) {
            const url = inputs[brand].value.trim();
            if (url && !(url.startsWith('http://') || url.startsWith('https://'))) {
                 showFeedback(`URL inválida para ${brand}. Debe empezar con http:// o https:// (o dejar vacío).`, 'error', feedback, button);
                 hasError = true;
                 break;
            }
            bannerData[brand] = url;
        }
        if (hasError) {
             button.textContent = 'Guardar Cambios de Banners';
             button.disabled = false;
             return;
        }
        console.log("Admin: Guardando URLs de banners en:", bannersDocRef.path, bannerData);
        try {
            await bannersDocRef.set(bannerData);
            showFeedback('¡URLs de banners actualizadas!', 'success', feedback, button, true);
            console.log("Admin: URLs de banners guardadas OK.");
            button.textContent = 'Guardar Cambios de Banners';
        } catch (error) {
            console.error('Admin: Error guardando URLs de banners: ', error);
            showFeedback('Error al guardar. Revisa consola (F12). ¿Tienes permisos de escritura en config?', 'error', feedback, button);
            button.textContent = 'Guardar Cambios de Banners';
        } finally {
            button.disabled = false;
        }
    });
}
async function loadIntermediateBanner(brand) {
    const bannerContainer = document.querySelector('.banner-intermedio');
    if (!bannerContainer) {
        console.log(`No se encontró contenedor .banner-intermedio en la página de ${brand}.`);
        return;
    }
    bannerContainer.innerHTML = ''; // Limpiar por si acaso
    const bannersDocRef = db.collection('config').doc('categoryBanners');
    try {
        console.log(`Cliente (${brand}): Buscando URL de banner en:`, bannersDocRef.path);
        const docSnap = await bannersDocRef.get();
        let bannerUrl = null;
        if (docSnap.exists) {
            const data = docSnap.data();
            bannerUrl = data[brand];
            console.log(`Cliente (${brand}): URL encontrada: ${bannerUrl || 'Ninguna'}`);
        } else {
            console.log(`Cliente (${brand}): Documento config/categoryBanners no encontrado.`);
        }
        if (bannerUrl && (bannerUrl.startsWith('http://') || bannerUrl.startsWith('https://'))) {
            const img = document.createElement('img');
            img.src = bannerUrl;
            img.alt = `Banner ${brand}`;
            img.onerror = () => {
                console.warn(`Error al cargar la imagen del banner para ${brand} desde ${bannerUrl}`);
                bannerContainer.style.display = 'none';
            };
            bannerContainer.appendChild(img);
            bannerContainer.style.display = 'block';
        } else {
            console.log(`Cliente (${brand}): No hay URL de banner válida, ocultando contenedor.`);
            bannerContainer.style.display = 'none';
        }
    } catch (error) {
        console.error(`Cliente (${brand}): Error al cargar banner intermedio:`, error);
        bannerContainer.style.display = 'none';
    }
}

// --- Lógica para Imágenes de Páginas Estáticas ---
async function loadPageImagesAdmin() {
    const inputs = {
        consultora: document.getElementById('page-image-consultora')
        // sobreMk: document.getElementById('page-image-sobre-mk') // Si añades más inputs
    };
    if (!Object.values(inputs).every(input => input)) {
        console.warn('Alguno de los inputs de URL de imagen de página no se encontró en admin.html.');
        return Promise.reject("Missing page image URL inputs");
    }
    const pageImagesDocRef = db.collection('config').doc('pageImages');
    try {
        console.log("Admin: Cargando URLs de imágenes de páginas desde:", pageImagesDocRef.path);
        const docSnap = await pageImagesDocRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log("Admin: Datos de imágenes de página encontrados:", data);
            for (const pageKey in inputs) {
                inputs[pageKey].value = data[pageKey] || '';
            }
            console.log("Admin: URLs de imágenes de página cargadas en el formulario.");
        } else {
            console.log("Admin: Documento de config/pageImages no existe. Inputs estarán vacíos.");
        }
        return Promise.resolve();
    } catch (error) {
        console.error("Admin: Error cargando URLs de imágenes de página:", error);
        displayError(document.getElementById('manage-page-images-container'), "Error al cargar URLs de imágenes.");
        return Promise.reject(error);
    }
}
function setupPageImagesForm() {
    const form = document.getElementById('page-images-form');
    const feedback = document.getElementById('page-images-feedback');
    const button = document.getElementById('save-page-images-button');
    const inputs = {
        consultora: document.getElementById('page-image-consultora')
        // sobreMk: document.getElementById('page-image-sobre-mk') // Si añades más inputs
    };
    if (!form || !feedback || !button || !Object.values(inputs).every(input => input)) {
        console.warn('Elementos del formulario de imágenes de página no encontrados para listeners.');
        return;
    }
    const pageImagesDocRef = db.collection('config').doc('pageImages');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedback.style.display = 'none';
        button.disabled = true;
        button.textContent = 'Guardando...';
        const imageData = {};
        let hasError = false;
        for (const pageKey in inputs) {
            const url = inputs[pageKey].value.trim();
            if (url && !(url.startsWith('http://') || url.startsWith('https://'))) {
                 showFeedback(`URL inválida para ${pageKey}. Debe empezar con http:// o https:// (o dejar vacío).`, 'error', feedback, button);
                 hasError = true;
                 break;
            }
            imageData[pageKey] = url;
        }
        if (hasError) {
             button.textContent = 'Guardar Cambios de Imágenes';
             button.disabled = false;
             return;
        }
        console.log("Admin: Guardando URLs de imágenes de página en:", pageImagesDocRef.path, imageData);
        try {
            await pageImagesDocRef.set(imageData);
            showFeedback('¡URLs de imágenes de página actualizadas!', 'success', feedback, button, true);
            console.log("Admin: URLs de imágenes de página guardadas OK.");
            button.textContent = 'Guardar Cambios de Imágenes';
        } catch (error) {
            console.error('Admin: Error guardando URLs de imágenes de página: ', error);
            showFeedback('Error al guardar. Revisa consola (F12). ¿Tienes permisos de escritura en config?', 'error', feedback, button);
            button.textContent = 'Guardar Cambios de Imágenes';
        } finally {
            button.disabled = false;
        }
    });
}
async function loadConsultoraImage() {
    const imgElement = document.getElementById('consultora-main-image');
    if (!imgElement) {
        console.log('No se encontró elemento img#consultora-main-image.');
        return; // No hacer nada si no hay imagen
    }

    const pageImagesDocRef = db.collection('config').doc('pageImages');
    try {
        console.log("Cliente (Consultora): Buscando URL de imagen en:", pageImagesDocRef.path);
        const docSnap = await pageImagesDocRef.get();
        let imageUrl = null;
        if (docSnap.exists) {
            const data = docSnap.data();
            imageUrl = data['consultora']; // Busca la clave 'consultora'
            console.log(`Cliente (Consultora): URL encontrada: ${imageUrl || 'Ninguna'}`);
        } else {
            console.log("Cliente (Consultora): Documento config/pageImages no encontrado.");
        }

        if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
            imgElement.src = imageUrl; // Cambia el src de la imagen
            imgElement.onerror = () => { // Añadir onerror por si acaso
                 console.warn(`Error al cargar la imagen de Consultora desde ${imageUrl}`);
            };
        } else {
            console.log("Cliente (Consultora): No hay URL válida, se usará la imagen por defecto del HTML.");
        }
    } catch (error) {
        console.error("Cliente (Consultora): Error al cargar imagen principal:", error);
    }
}

// --- Lógica de Admin (Homepage Settings) ---
async function loadHomepageSettingsAdmin() {
    const textarea = document.getElementById('hero-image-urls');
    if (!textarea) {
        console.warn('Textarea "hero-image-urls" no encontrado en admin.html.');
        return Promise.reject("Missing textarea");
    }
    const configDocRef = db.collection('config').doc('homepage');
    try {
        console.log("Admin: Cargando URLs del carrusel principal desde:", configDocRef.path);
        const docSnap = await configDocRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (data && data.heroImageUrls && Array.isArray(data.heroImageUrls)) {
                textarea.value = data.heroImageUrls.join('\n');
                console.log("Admin: URLs del carrusel cargadas en el formulario.");
            } else {
                 console.log("Admin: Documento 'homepage' existe pero sin URLs.");
                 textarea.value = '';
            }
        } else {
            console.log("Admin: Documento de config/homepage no existe. Textarea estará vacío.");
            textarea.value = '';
        }
        return Promise.resolve();
    } catch (error) {
        console.error("Admin: Error cargando URLs del carrusel principal:", error);
        displayError(document.getElementById('homepage-settings-container'), "Error al cargar URLs del carrusel.");
        return Promise.reject(error);
    }
}

function setupHomepageSettingsForm() {
    const form = document.getElementById('homepage-settings-form');
    const textarea = document.getElementById('hero-image-urls');
    const feedback = document.getElementById('homepage-feedback');
    const button = document.getElementById('save-hero-banner-button');

    if (!form || !textarea || !feedback || !button) {
        console.warn('Elementos del formulario de Homepage no encontrados para listeners.');
        return;
    }

    const configDocRef = db.collection('config').doc('homepage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedback.style.display = 'none';
        button.disabled = true;
        button.textContent = 'Guardando...';

        const urlsString = textarea.value.trim();
        const urls = urlsString.split('\n')
                              .map(url => url.trim())
                              .filter(url => url !== '' && (url.startsWith('http://') || url.startsWith('https://')));

        if (urls.length === 0 && urlsString !== '') {
             showFeedback('No se encontraron URLs válidas. Asegúrate que empiecen con http:// o https:// y que haya una por línea.', 'error', feedback, button);
             button.textContent = 'Guardar Cambios del Carrusel';
             button.disabled = false;
             return;
        }

        console.log("Admin: Guardando URLs del carrusel en:", configDocRef.path, urls);

        try {
            // Usamos .set() con merge:true para crear el doc si no existe,
            // o para actualizar solo el campo heroImageUrls si ya existe.
            await configDocRef.set({ heroImageUrls: urls }, { merge: true });

            showFeedback('¡URLs del carrusel actualizadas!', 'success', feedback, button, true);
            console.log("Admin: URLs del carrusel guardadas OK.");
        } catch (error) {
            console.error('Admin: Error guardando URLs del carrusel: ', error);
            showFeedback('Error al guardar. Revisa consola (F12). ¿Tienes permisos de escritura en config?', 'error', feedback, button);
        } finally {
            button.textContent = 'Guardar Cambios del Carrusel';
            button.disabled = false;
        }
    });
}

// --- Lógica de Admin (Categorías) ---
async function loadCategoriesAdmin() {
    const tableBody = document.getElementById('categories-table-body');
    const loadingMsg = document.getElementById('loading-categories-admin');
    if (!tableBody || !loadingMsg) { console.error("Elementos tabla categorías no encontrados."); return Promise.reject("Missing table elements"); }
    loadingMsg.style.display = 'block'; loadingMsg.textContent = 'Cargando categorías...'; tableBody.innerHTML = '';
    try {
        const categoriesRef = db.collection('categories');
        console.log("Admin: Leyendo categorías de:", categoriesRef.path);
        const querySnapshot = await categoriesRef.orderBy('name').get();
        loadingMsg.style.display = 'none';
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay categorías creadas.</td></tr>'; return Promise.resolve();
        }
        querySnapshot.forEach(doc => {
            const category = doc.data(); const categoryId = doc.id;
            const name = category.name || 'N/D'; const brand = category.brand || 'N/D';
            const imageUrl = category.imageUrl || 'https://via.placeholder.com/60?text=No+Img';
            const row = document.createElement('tr');
            row.setAttribute('data-category-id', categoryId);
            row.innerHTML = `
                <td><img src="${imageUrl}" alt="${name}" class="admin-table-thumbnail" onerror="this.onerror=null; this.src='https://via.placeholder.com/60?text=Err';"></td>
                <td>${name}</td>
                <td>${brand}</td>
                <td><button class="edit-category-btn admin-button edit-button" data-id="${categoryId}">Editar</button><button class="delete-category-btn admin-button cancel-button" data-id="${categoryId}">Eliminar</button></td>
            `;
            tableBody.appendChild(row);
        });
        addCategoryButtonListeners();
        console.log(`Admin: ${querySnapshot.size} categorías cargadas.`);
        return Promise.resolve();
    } catch (error) {
        console.error("Error GRAVE al cargar categorías admin: ", error);
        displayError(document.getElementById('list-categories-container'), 'Error al cargar categorías. Verifica permisos e ÍNDICES (link en consola F12).');
        if(loadingMsg) loadingMsg.style.display = 'none';
        return Promise.reject(error);
    }
}
function setupCategoryForm() {
    const form = document.getElementById('category-form');
     const nameInput = document.getElementById('category-name');
     const brandSelect = document.getElementById('category-brand');
     const imageUrlInput = document.getElementById('category-image-url');
     const feedbackElement = document.getElementById('category-feedback');
     const submitButton = document.getElementById('submit-category-button');
     const cancelButton = document.getElementById('cancel-edit-category-button');
     const formTitle = document.getElementById('category-form-title');
     const editCategoryIdInput = document.getElementById('edit-category-id');
    if (!form || !nameInput || !brandSelect || !imageUrlInput) { console.error("Elementos form categoría no encontrados."); return; }
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedbackElement.style.display = 'none';
        submitButton.disabled = true;
        const categoryName = nameInput.value.trim();
        const categoryBrand = brandSelect.value;
        const categoryImageUrl = imageUrlInput.value.trim();
        const editingId = editCategoryIdInput.value;
        submitButton.textContent = editingId ? 'Actualizando...' : 'Agregando...';
        if (!categoryName || !categoryBrand) {
            showFeedback('Nombre y Marca son obligatorios.', 'error', feedbackElement, submitButton);
            submitButton.textContent = editingId ? 'Actualizar Categoría' : 'Agregar Categoría';
            submitButton.disabled = false; return;
        }
        const categoryData = { name: categoryName, brand: categoryBrand, imageUrl: categoryImageUrl || '' };
        const categoriesRef = db.collection('categories');
        console.log("Admin: Guardando categoría en:", categoriesRef.path, categoryData);
        try {
            let actionPromise;
            if (editingId) {
                console.log("Actualizando categoría ID:", editingId);
                actionPromise = categoriesRef.doc(editingId).update(categoryData);
            } else {
                 console.log("Agregando nueva categoría");
                actionPromise = categoriesRef.add(categoryData);
            }
            await actionPromise;
            showFeedback(editingId ? '¡Categoría actualizada!' : '¡Categoría agregada!', 'success', feedbackElement, submitButton, true);
            console.log("Admin: Categoría guardada OK.");
            if (editingId) cancelEditCategory();
            else { form.reset(); submitButton.textContent = 'Agregar Categoría'; }
            await loadCategoriesAdmin();
            const productBrandSelect = document.getElementById('product-brand');
            if (productBrandSelect.value === categoryBrand) {
                 await updateCategoryDropdown(categoryBrand);
            }
            if (editingId) {
                await updateProductsWithCategoryData(editingId, categoryData.name, categoryData.imageUrl);
            }
        } catch (error) {
            console.error("Admin: Error guardando categoría:", error);
            showFeedback('Error al guardar. Revisa consola (F12). ¿Tienes permisos?', 'error', feedbackElement, submitButton);
            submitButton.textContent = editingId ? 'Actualizar Categoría' : 'Agregar Categoría';
        } finally { submitButton.disabled = false; }
    });
    cancelButton.addEventListener('click', cancelEditCategory);
}
async function startEditCategory(categoryId) {
    console.log("Iniciando edición de categoría ID:", categoryId);
     const form = document.getElementById('category-form');
     const nameInput = document.getElementById('category-name');
     const brandSelect = document.getElementById('category-brand');
     const imageUrlInput = document.getElementById('category-image-url');
     const feedbackElement = document.getElementById('category-feedback');
     const submitButton = document.getElementById('submit-category-button');
     const cancelButton = document.getElementById('cancel-edit-category-button');
     const formTitle = document.getElementById('category-form-title');
     const editCategoryIdInput = document.getElementById('edit-category-id');
    feedbackElement.style.display = 'none';
    try {
        const categoryRef = db.collection('categories').doc(categoryId);
        console.log("Editando categoría, leyendo de:", categoryRef.path);
        const docSnap = await categoryRef.get();
        if (docSnap.exists) {
            const category = docSnap.data();
            console.log("Datos categoría para editar:", category);
            nameInput.value = category.name || '';
            brandSelect.value = category.brand || '';
            imageUrlInput.value = category.imageUrl || '';
            editCategoryIdInput.value = categoryId;
            formTitle.textContent = 'Editar Categoría';
            submitButton.textContent = 'Actualizar Categoría';
            submitButton.classList.remove('add-button'); submitButton.classList.add('edit-button');
            cancelButton.style.display = 'inline-block';
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.error("No se encontró la categoría para editar ID:", categoryId);
            alert("Error: No se encontró la categoría seleccionada.");
        }
    } catch (error) {
        console.error("Error al obtener datos de categoría para editar:", error);
        alert("Error al cargar los datos de la categoría.");
    }
}
function cancelEditCategory() {
    console.log("Cancelando edición de categoría");
    const form = document.getElementById('category-form');
    const imageUrlInput = document.getElementById('category-image-url');
    const feedbackElement = document.getElementById('category-feedback');
    const submitButton = document.getElementById('submit-category-button');
    const cancelButton = document.getElementById('cancel-edit-category-button');
    const formTitle = document.getElementById('category-form-title');
    const editCategoryIdInput = document.getElementById('edit-category-id');
    form.reset();
    editCategoryIdInput.value = '';
    if(imageUrlInput) imageUrlInput.value = '';
    formTitle.textContent = 'Agregar Nueva Categoría';
    submitButton.textContent = 'Agregar Categoría';
    submitButton.classList.remove('edit-button');
    submitButton.classList.add('add-button');
    cancelButton.style.display = 'none';
    feedbackElement.style.display = 'none';
    submitButton.disabled = false;
}
function addCategoryButtonListeners() {
    const tableBody = document.getElementById('categories-table-body');
    if (!tableBody) return;
    tableBody.removeEventListener('click', handleCategoryTableClick); // Limpiar anterior
    tableBody.addEventListener('click', handleCategoryTableClick);
}
async function handleCategoryTableClick(e) {
    const target = e.target;
    if (!target.matches('.edit-category-btn, .delete-category-btn')) return;
    const categoryId = target.dataset.id;
    if (!categoryId) return;
    if (target.classList.contains('edit-category-btn')) {
        startEditCategory(categoryId);
    } else if (target.classList.contains('delete-category-btn')) {
        const row = target.closest('tr');
        const categoryName = row?.querySelector('td:nth-child(2)')?.textContent || 'esta categoría';
        const productCheck = await db.collection('products').where('categoryId', '==', categoryId).limit(1).get();
        if (!productCheck.empty) {
            alert(`No se puede eliminar la categoría "${categoryName}" porque todavía hay productos (${productCheck.docs[0].data().name}, etc.) usándola.`);
            return;
        }
        if (confirm(`¿Eliminar categoría "${categoryName}"?\n¡Esto NO se puede deshacer!`)) {
            try {
                const categoryRef = db.collection('categories').doc(categoryId);
                console.log("Eliminando categoría:", categoryRef.path);
                await categoryRef.delete();
                console.log("Categoría eliminada OK:", categoryId);
                await loadCategoriesAdmin();
                alert(`Categoría "${categoryName}" eliminada.`);
                const productBrandSelect = document.getElementById('product-brand');
                const deletedCategoryBrand = row?.querySelector('td:nth-child(3)')?.textContent;
                 if(productBrandSelect.value && productBrandSelect.value === deletedCategoryBrand) {
                     await updateCategoryDropdown(productBrandSelect.value);
                 }
            } catch (error) {
                console.error("Admin: Error al eliminar categoría:", error);
                alert("Error al eliminar. Revisa consola (F12). ¿Tienes permisos?");
            }
        }
    }
}
async function updateProductsWithCategoryData(categoryId, newCategoryName, newCategoryImageUrl) {
    if (!categoryId) return;
    console.log(`Buscando productos con categoryId ${categoryId} para actualizar...`);
    const productsToUpdate = await db.collection('products').where('categoryId', '==', categoryId).get();
    if (productsToUpdate.empty) {
        console.log("No se encontraron productos para actualizar.");
        return;
    }
    console.log(`Actualizando ${productsToUpdate.size} productos...`);
    const batch = db.batch();
    productsToUpdate.forEach(doc => {
        const productRef = db.collection('products').doc(doc.id);
        batch.update(productRef, {
            categoryName: newCategoryName,
            categoryImageUrl: newCategoryImageUrl || ''
        });
    });
    try {
        await batch.commit();
        console.log("¡Productos actualizados exitosamente!");
        if (window.location.pathname.includes('admin.html')) {
            await cargarProductosAdmin();
        }
    } catch (error) {
        console.error("Error al actualizar productos en lote:", error);
        alert("Error al actualizar los productos asociados a esta categoría. Revisa la consola.");
    }
}

// --- Lógica de Admin (Productos) ---
async function cargarProductosAdmin() {
    const tableBody = document.getElementById('products-table-body');
    const loadingMsg = document.getElementById('loading-products-admin');
    if (!tableBody || !loadingMsg) { console.error("Elementos tabla productos admin no encontrados."); return Promise.reject("Missing table elements"); }
    loadingMsg.style.display = 'block'; loadingMsg.textContent = 'Cargando...'; tableBody.innerHTML = '';
    try {
        console.log("Admin: Leyendo todos los productos...");
        const querySnapshot = await db.collection('products')
                                    .orderBy('brand')
                                    .orderBy('name')
                                    .get();
        loadingMsg.style.display = 'none';
        const productDocs = querySnapshot.docs.filter(doc => !doc.id.startsWith('--config-'));
        if (productDocs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay productos agregados.</td></tr>'; return Promise.resolve();
        }
        console.log(`Admin: ${productDocs.length} productos encontrados.`);
        productDocs.forEach(doc => {
             const product = doc.data(); const productId = doc.id;
            const name = product.name || 'N/D';
            const brand = product.brand || 'N/D';
            const categoryName = product.categoryName || 'N/A';
            const price = typeof product.price === 'number' ? product.price.toFixed(2) : 'N/A';
            const imageUrl = (product.imageUrls && product.imageUrls[0]) ? product.imageUrls[0] : (product.imageUrl || 'https://via.placeholder.com/60?text=No+Img');
            const description = product.description || '';
            const row = document.createElement('tr');
            row.setAttribute('data-product-id', productId);
            row.innerHTML = `<td><img src="${imageUrl}" alt="${name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/60?text=Err';"></td><td>${name}</td><td>${brand}</td><td>${categoryName}</td><td>$${price}</td><td>${description.substring(0, 50)}${description.length > 50 ? '...' : ''}</td><td><button class="edit-btn admin-button edit-button" data-id="${productId}">Editar</button><button class="delete-btn admin-button cancel-button" data-id="${productId}">Eliminar</button></td>`;
            tableBody.appendChild(row);
        });
        addAdminButtonListeners();
        return Promise.resolve();
    } catch (error) {
        console.error("Error GRAVE cargando productos en admin: ", error);
        displayError(document.getElementById('list-products-container'), 'Error al cargar lista de productos. Verifica ÍNDICES (link en consola F12).');
        if (loadingMsg) loadingMsg.style.display = 'none';
        return Promise.reject(error);
    }
}
function setupAddProductForm() {
    const form = document.getElementById('add-product-form');
     const brandSelect = document.getElementById('product-brand');
    const categorySelect = document.getElementById('product-category');
     const feedbackElement = document.getElementById('add-product-feedback');
     const submitButton = document.getElementById('submit-product-button');
     const editProductIdInput = document.getElementById('edit-product-id');
     const cancelButton = document.getElementById('cancel-edit-button');
     const formTitle = document.getElementById('form-title');
    if (!form || !brandSelect || !categorySelect) { console.error("Elementos form producto no encontrados."); return; }
    brandSelect.addEventListener('change', async () => {
        console.log("Marca cambiada a:", brandSelect.value);
        await updateCategoryDropdown(brandSelect.value);
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedbackElement.style.display = 'none';
        submitButton.disabled = true;
        const isEditing = editProductIdInput.value !== '';
        submitButton.textContent = isEditing ? 'Actualizando...' : 'Agregando...';
        const name = document.getElementById('product-name').value.trim();
        const brand = brandSelect.value;
        const categoryId = categorySelect.value;
        const selectedCategoryOption = categorySelect.options[categorySelect.selectedIndex];
        const categoryName = selectedCategoryOption?.textContent || '';
        const categoryImageUrl = selectedCategoryOption?.dataset.imageUrl || '';
        const priceString = document.getElementById('product-price').value;
        const imageUrlsString = document.getElementById('product-image-urls').value.trim();
        const description = document.getElementById('product-description').value.trim();
        // --- ADDED: Read checkbox state ---
        const detailsVisibleByDefault = document.getElementById('product-details-visible').checked;
        // --- END ADDED ---
        const restoreButtonText = () => { submitButton.textContent = isEditing ? 'Actualizar Producto' : 'Agregar Producto'; };
        if (!name || !brand || !categoryId || priceString === '' || !imageUrlsString) { showFeedback('Nombre, Marca, Categoría, Precio y URLs son obligatorios.', 'error', feedbackElement, submitButton); restoreButtonText(); submitButton.disabled = false; return; }
        if (categoryId.startsWith('--')) { showFeedback('Selecciona una categoría válida.', 'error', feedbackElement, submitButton); restoreButtonText(); submitButton.disabled = false; return; }
        const price = parseFloat(priceString);
        if (isNaN(price) || price < 0) { showFeedback('Precio inválido.', 'error', feedbackElement, submitButton); restoreButtonText(); submitButton.disabled = false; return; }
        const urls = imageUrlsString.split('\n').map(url => url.trim()).filter(url => url !== '' && (url.startsWith('http://') || url.startsWith('https://')));
        if (urls.length === 0) { showFeedback('Ingresa al menos una URL válida (http:// o https://).', 'error', feedbackElement, submitButton); restoreButtonText(); submitButton.disabled = false; return; }
        const productData = {
            name,
            brand,
            categoryId,
            categoryName: categoryName.startsWith('--') ? '' : categoryName,
            categoryImageUrl: categoryImageUrl,
            price,
            imageUrls: urls,
            imageUrl: urls[0] || '',
            description,
            detailsVisibleByDefault // --- ADDED: Save checkbox state ---
        };
        console.log("Admin: Guardando producto:", productData);
        try {
            let actionPromise;
            if (isEditing) {
                const productId = editProductIdInput.value;
                console.log("Actualizando producto ID:", productId);
                actionPromise = db.collection('products').doc(productId).update(productData);
            } else {
                 console.log("Agregando nuevo producto");
                actionPromise = db.collection('products').add(productData);
            }
            await actionPromise;
            showFeedback(isEditing ? '¡Producto actualizado!' : '¡Producto agregado!', 'success', feedbackElement, submitButton, true);
            console.log("Admin: Producto guardado OK.");
            if (isEditing) cancelEditProduct();
            else {
                form.reset();
                categorySelect.innerHTML = '<option value="">-- Selecciona Marca Primero --</option>';
                categorySelect.disabled = true;
                submitButton.textContent = 'Agregar Producto';
                document.getElementById('product-details-visible').checked = true; // Reset checkbox
            }
            await cargarProductosAdmin();
        } catch (error) {
            console.error("Admin: Error guardando/actualizando producto:", error);
            showFeedback('Error al guardar. Revisa consola (F12). ¿Tienes permisos?', 'error', feedbackElement, submitButton);
            restoreButtonText();
        } finally { submitButton.disabled = false; }
    });
    cancelButton.addEventListener('click', cancelEditProduct);
}
async function updateCategoryDropdown(selectedBrand, categoryToSelect = null) {
    const categorySelect = document.getElementById('product-category');
    const categoryLoadingMsg = document.getElementById('category-loading-msg');
    if (!categorySelect || !categoryLoadingMsg) { console.error("Dropdown categoría o msg loading no encontrado."); return; }
    categorySelect.innerHTML = '<option value="">-- Cargando... --</option>';
    categorySelect.disabled = true;
    categoryLoadingMsg.style.display = 'inline';
    console.log("Actualizando dropdown categorías para marca:", selectedBrand);
    if (!selectedBrand) {
        categorySelect.innerHTML = '<option value="">-- Selecciona Marca Primero --</option>';
        categorySelect.disabled = true;
        categoryLoadingMsg.style.display = 'none';
        console.log("Dropdown reseteado (sin marca).");
        return;
    }
    try {
        const categoriesRef = db.collection('categories');
        console.log("Consultando categorías en:", categoriesRef.path, "para marca:", selectedBrand);
        const querySnapshot = await categoriesRef.where('brand', '==', selectedBrand).get();
        categorySelect.innerHTML = '';
        if (querySnapshot.empty) {
            console.log("No se encontraron categorías para", selectedBrand);
            categorySelect.innerHTML = '<option value="--no-category--">-- No hay categorías (crea una primero) --</option>';
            categorySelect.disabled = true;
        } else {
             console.log(`${querySnapshot.size} categorías encontradas para ${selectedBrand}`);
            categorySelect.innerHTML = '<option value="">-- Selecciona Categoría --</option>';
            const categories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            categories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                option.dataset.imageUrl = category.imageUrl || '';
                if (categoryToSelect && category.id === categoryToSelect) {
                    option.selected = true;
                     console.log("Preseleccionada categoría:", category.name);
                }
                categorySelect.appendChild(option);
            });
            categorySelect.disabled = false;
        }
    } catch (error) {
        console.error(`Error GRAVE al cargar categorías para ${selectedBrand}:`, error);
        categorySelect.innerHTML = '<option value="--error--">-- Error al cargar --</option>';
        categorySelect.disabled = true;
        displayError(document.getElementById('add-product-form'), "Error al cargar las categorías. Verifica ÍNDICES (link en consola F12).");
    } finally {
         categoryLoadingMsg.style.display = 'none';
    }
}
async function startEditProduct(productId) {
    console.log("Iniciando edición de producto ID:", productId);
     const form = document.getElementById('add-product-form');
     const brandSelect = document.getElementById('product-brand');
     const categorySelect = document.getElementById('product-category');
     const feedbackElement = document.getElementById('add-product-feedback');
     const submitButton = document.getElementById('submit-product-button');
     const cancelButton = document.getElementById('cancel-edit-button');
     const formTitle = document.getElementById('form-title');
     const editProductIdInput = document.getElementById('edit-product-id');
    feedbackElement.style.display = 'none';
    form.reset();
    categorySelect.innerHTML = '<option value="">-- Selecciona Marca Primero --</option>';
    categorySelect.disabled = true;
    try {
        const docRef = db.collection('products').doc(productId);
        console.log("Editando producto, leyendo de:", docRef.path);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const product = docSnap.data();
            console.log("Datos cargados para editar:", product);
            document.getElementById('product-name').value = product.name || '';
            brandSelect.value = product.brand || '';
            document.getElementById('product-price').value = product.price || 0;
            document.getElementById('product-image-urls').value = (product.imageUrls || []).join('\n');
            document.getElementById('product-description').value = product.description || '';
            // --- ADDED: Load checkbox state ---
            document.getElementById('product-details-visible').checked = product.detailsVisibleByDefault || false; // Default to false if not set
            // --- END ADDED ---
            if (product.brand) {
                 console.log("Marca detectada:", product.brand, ". Intentando cargar y preseleccionar categoría ID:", product.categoryId);
                await updateCategoryDropdown(product.brand, product.categoryId);
            } else {
                 console.warn("Producto sin marca definida, no se puede cargar categoría.");
            }
            editProductIdInput.value = productId;
            formTitle.textContent = 'Editar Producto';
            submitButton.textContent = 'Actualizar Producto';
            submitButton.classList.remove('add-button'); submitButton.classList.add('edit-button');
            cancelButton.style.display = 'inline-block';
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.error("No se encontró el producto para editar ID:", productId);
            alert("Error: No se encontró el producto seleccionado.");
            cancelEditProduct();
        }
    } catch (error) {
        console.error("Error al obtener datos del producto para editar:", error);
        alert("Error al cargar los datos del producto.");
        cancelEditProduct();
    }
}
function cancelEditProduct() {
    console.log("Cancelando edición de producto");
    const form = document.getElementById('add-product-form');
    const categorySelect = document.getElementById('product-category');
    const feedbackElement = document.getElementById('add-product-feedback');
    const submitButton = document.getElementById('submit-product-button');
    const cancelButton = document.getElementById('cancel-edit-button');
    const formTitle = document.getElementById('form-title');
    const editProductIdInput = document.getElementById('edit-product-id');
    form.reset();
    editProductIdInput.value = '';
    formTitle.textContent = 'Agregar Nuevo Producto';
    submitButton.textContent = 'Agregar Producto';
    submitButton.classList.remove('edit-button');
    submitButton.classList.add('add-button');
    cancelButton.style.display = 'none';
    feedbackElement.style.display = 'none';
    submitButton.disabled = false;
    categorySelect.innerHTML = '<option value="">-- Selecciona Marca Primero --</option>';
    categorySelect.disabled = true;
    document.getElementById('product-details-visible').checked = true; // Reset checkbox
}
function showFeedback(message, type, element, button, autoHide = false) {
    if (!element || !button) return;
    element.textContent = message;
    element.className = `feedback-message ${type}`;
    element.style.display = 'block';
    button.disabled = false;
    if (autoHide) {
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}
function addAdminButtonListeners() {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;
    tableBody.removeEventListener('click', handleAdminTableClick);
    tableBody.addEventListener('click', handleAdminTableClick);
}
async function handleAdminTableClick(e) {
    const target = e.target;
    if (!target.matches('.edit-btn, .delete-btn')) return;
    const productId = target.dataset.id;
    if (!productId) return;
    if (target.classList.contains('edit-btn')) {
        startEditProduct(productId);
    } else if (target.classList.contains('delete-btn')) {
        const row = target.closest('tr');
        const productName = row?.querySelector('td:nth-child(2)')?.textContent || 'este producto';
        if (confirm(`¿Estás seguro de que quieres eliminar "${productName}"?\n¡Esto NO se puede deshacer!`)) {
            try {
                console.log("Eliminando producto ID:", productId);
                await db.collection('products').doc(productId).delete();
                console.log("Producto eliminado OK");
                await cargarProductosAdmin();
                alert(`Producto "${productName}" eliminado.`);
                cancelEditProduct();
            } catch (error) {
                console.error("Error al eliminar producto:", error);
                alert("Error al eliminar el producto. Revisa la consola (F12).");
            }
        }
    }
}

// --- Función para renderizar una tarjeta de producto (CON DESPLEGABLE) ---
function renderProductCard(producto, productId) {
    const name = producto.name || 'Producto Sin Nombre';
    const price = typeof producto.price === 'number' ? producto.price.toFixed(2) : 'N/A';
    // --- Separar descripción principal de detalles ---
    // **OPCIÓN 1: Todo 'description' va al desplegable**
    const mainDescription = ''; // Dejamos la descripción principal vacía
    const detailedDescription = producto.description || 'Sin detalles adicionales.';
    // --- Fin separación ---

    const imageUrls = Array.isArray(producto.imageUrls) && producto.imageUrls.length > 0
                      ? producto.imageUrls
                      : [producto.imageUrl || 'https://via.placeholder.com/150?text=No+Image'];
    const categoryName = producto.categoryName || '';
    const categoryImageUrl = producto.categoryImageUrl || '';

    // --- MODIFICADO: Forzar estado inicial CERRADO del desplegable ---
    // const startVisible = producto.detailsVisibleByDefault || false; // <<< LÍNEA ORIGINAL
    const startVisible = false; // <<< SIEMPRE EMPIEZA CERRADO
    const detailsInitialClass = startVisible ? 'producto-detalles detalles-visibles' : 'producto-detalles'; // Ahora siempre será 'producto-detalles'
    const buttonInitialText = startVisible ? 'Ocultar detalles' : 'Mostrar detalles'; // Ahora siempre será 'Mostrar detalles'
    // --- FIN MODIFICADO ---

    let imagesHTML = '';
    imageUrls.forEach((url, index) => {
        imagesHTML += `<img src="${url}" alt="${name} - Imagen ${index + 1}" class="carousel-image ${index === 0 ? 'active' : ''}" onerror="this.onerror=null; this.src='https://via.placeholder.com/150?text=Error+Img';">`;
    });

    let categoryHeaderHTML = '';
    if (categoryName) {
        categoryHeaderHTML = `
            <div class="producto-categoria-header">
                ${categoryImageUrl ? `<img src="${categoryImageUrl}" alt="Icono ${categoryName}" class="producto-categoria-imagen" onerror="this.style.display='none';">` : ''}
                <p class="producto-categoria">${categoryName}</p>
            </div>
        `;
    }

    // --- MODIFICADO: Eliminar comentarios HTML visibles ---
    return `
        <div class="tarjeta-producto" data-product-id="${productId}">
            <div class="product-carousel">
                ${imagesHTML}
                ${imageUrls.length > 1 ? '<button class="carousel-button prev">&lt;</button><button class="carousel-button next">&gt;</button>' : ''}
            </div>
            <div class="producto-info">
                ${categoryHeaderHTML}
                <h3 class="producto-nombre">${name}</h3>
                <p class="producto-precio">$${price}</p>
                ${mainDescription ? `<p class="producto-descripcion-main">${mainDescription}</p>` : ''}

                ${detailedDescription && detailedDescription !== 'Sin detalles adicionales.' ? `<button class="toggle-details-btn">${buttonInitialText}</button>` : ''}
                <div class="${detailsInitialClass}">
                    <p class="producto-descripcion-detalles">${detailedDescription.replace(/\n/g, '<br>')}</p>
                </div>

                <div class="producto-acciones">
                    <label for="cantidad-${productId}">Cant:</label>
                    <input type="number" id="cantidad-${productId}" class="producto-cantidad" value="1" min="1">
                    <button class="boton-agregar" data-id="${productId}">Agregar</button>
                </div>
            </div>
        </div>
    `;
    // --- FIN MODIFICADO ---
}


// --- Lógica de Catálogo por Categorías (Cliente) ---
function iniciarCatalogoPorCategorias(marca, container) {
    if (!container) return;
    mostrarCategoriasPorMarca(marca, container);
    // Use event delegation on the container for category clicks and back button
    container.addEventListener('click', (e) => {
        const categoriaCard = e.target.closest('.tarjeta-categoria');
        if (categoriaCard) {
            const categoryId = categoriaCard.dataset.categoryId;
            const categoryName = categoriaCard.dataset.categoryName;
            if (categoryId) {
                mostrarProductosPorCategoria(marca, categoryId, categoryName, container);
            }
            return; // Stop processing if it was a category click
        }

        const volverBtn = e.target.closest('#catalogo-volver-btn');
        if (volverBtn) {
            mostrarCategoriasPorMarca(marca, container);
            return; // Stop processing if it was a back button click
        }
        // NOTE: Add to cart is handled by the body listener, no need here
    });
}
async function mostrarCategoriasPorMarca(marca, container) {
    const loadingMsg = container.querySelector('.loading-message');
    const header = document.getElementById('catalogo-header');
    const title = container.querySelector('h2');
    // Clear previous content (products, categories, errors)
    container.querySelectorAll('.tarjeta-producto, .tarjeta-categoria, .app-error-message, .mensaje-vacio, #catalogo-volver-btn').forEach(el => el.remove());
    if (loadingMsg) { loadingMsg.textContent = 'Cargando categorías...'; loadingMsg.style.display = 'block'; }
    if (header) header.innerHTML = ''; // Clear back button area
    if (title) { // Set title based on brand
        if (marca === 'marykay') title.textContent = 'Catálogo Mary Kay';
        else if (marca === 'biogreen') title.textContent = 'Catálogo Biogreen';
        else if (marca === 'arbell') title.textContent = 'Catálogo Arbell';
        else if (marca === 'nexo') title.textContent = 'Catálogo Nexo (Indumentaria)';
        else title.textContent = `Catálogo ${marca.charAt(0).toUpperCase() + marca.slice(1)}`;
    }

    try {
        console.log(`Cliente (${marca}): Intentando consultar categorías...`);
        const querySnapshot = await db.collection('categories')
                                    .where('brand', '==', marca)
                                    .orderBy('name')
                                    .get();
        console.log(`Cliente (${marca}): Consulta completada. Documentos encontrados: ${querySnapshot.size}`);
        if (loadingMsg) loadingMsg.style.display = 'none';

        if (querySnapshot.empty) {
            console.log(`Cliente (${marca}): No se encontraron categorías en Firestore.`);
            container.insertAdjacentHTML('beforeend', '<p class="mensaje-vacio">No hay categorías disponibles para esta marca.</p>');
            return;
        }

        console.log(`Cliente (${marca}): ${querySnapshot.size} categorías encontradas. Procesando...`);
        let categoriesHTML = '';
        querySnapshot.forEach(doc => {
            const categoria = doc.data();
            const id = doc.id;
            const imageUrl = categoria.imageUrl || 'https://via.placeholder.com/150?text=Sin+Imagen';
            const name = categoria.name || 'Categoría sin nombre';
            categoriesHTML += `
                <div class="tarjeta-categoria" data-category-id="${id}" data-category-name="${name}">
                    <img src="${imageUrl}" alt="${name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/150?text=Error+Img';">
                    <h3>${name}</h3>
                </div>
            `;
        });
        console.log(`Cliente (${marca}): HTML de categorías generado. Insertando en el DOM...`);
        // Insert categories AFTER the h2 title
        title.insertAdjacentHTML('afterend', categoriesHTML);
        console.log(`Cliente (${marca}): HTML insertado.`);
    } catch (error) {
        console.error(`Cliente (${marca}): ¡Error en la consulta Firestore!`, error);
        // Display error message
        displayError(container, `Error al cargar categorías de ${marca}. Revisa ÍNDICES (link en consola F12).`);
        if (loadingMsg) loadingMsg.style.display = 'none';
    }
}
async function mostrarProductosPorCategoria(marca, categoryId, categoryName, container) {
    const loadingMsg = container.querySelector('.loading-message');
    const header = document.getElementById('catalogo-header');
    const title = container.querySelector('h2'); // Get the H2 title element

    // Clear previous content (only categories, products, errors, empty messages)
    // We keep the header and title elements
    container.querySelectorAll('.tarjeta-categoria, .tarjeta-producto, .app-error-message, .mensaje-vacio').forEach(el => el.remove());
    if (loadingMsg) { loadingMsg.textContent = 'Cargando productos...'; loadingMsg.style.display = 'block'; }

    // --- MODIFICADO: Update title text and ensure header has back button ---
    if (title) title.textContent = categoryName; // Update title text
    if (header) { // Ensure back button is present
        header.innerHTML = '<button id="catalogo-volver-btn" class="admin-button cancel-button">‹‹ Volver a Categorías</button>';
    }
    // --- FIN MODIFICADO ---

    try {
        console.log(`Cliente: Buscando productos marca=${marca} y categoriaId=${categoryId}...`);
        const querySnapshot = await db.collection('products')
                                    .where('brand', '==', marca)
                                    .where('categoryId', '==', categoryId)
                                    .orderBy('name')
                                    .get();
        if (loadingMsg) loadingMsg.style.display = 'none';
        const productDocs = querySnapshot.docs.filter(doc => !doc.id.startsWith('--config-')); // Filter out potential config docs

        if (productDocs.length === 0) {
            // --- MODIFICADO: Insert empty message AFTER the title ---
             title.insertAdjacentHTML('afterend', '<p class="mensaje-vacio">No hay productos disponibles en esta categoría.</p>');
            return;
        }

        console.log(`Cliente: ${productDocs.length} productos encontrados.`);
        let allCardsHTML = '';
        productDocs.forEach((doc) => {
             const producto = doc.data(); const productId = doc.id;
             allCardsHTML += renderProductCard(producto, productId);
        });
        // --- MODIFICADO: Insert product cards AFTER the title ---
        title.insertAdjacentHTML('afterend', allCardsHTML);
        setupCarousels(container); // Setup carousels for the newly added products
    } catch (error) {
        console.error(`Error GRAVE cargando productos por categoría ${categoryId}: `, error);
        // Display error AFTER the title
        if(title) {
            displayError(title.parentElement, `Error al cargar productos. Revisa los ÍNDICES (link en consola F12).`);
        } else {
             displayError(container, `Error al cargar productos. Revisa los ÍNDICES (link en consola F12).`);
        }
        if (loadingMsg) loadingMsg.style.display = 'none';
    }
}


// --- Carga Plana de Productos (Cliente - para Novedades) ---
async function cargarProductosCliente(marca, container) {
    if (!container) { console.error("Contenedor de productos no proporcionado a cargarProductosCliente"); return; }
    let loadingMsg = container.querySelector('.loading-message');
    if (!loadingMsg) { // If loading message doesn't exist, create it
        loadingMsg = document.createElement('p');
        loadingMsg.className = 'loading-message';
        container.prepend(loadingMsg); // Add it at the beginning
    }
    loadingMsg.textContent = 'Cargando productos...'; loadingMsg.style.display = 'block';
    // Clear only product cards, empty messages, and errors
    container.querySelectorAll('.tarjeta-producto, .mensaje-vacio, .app-error-message').forEach(el => el.remove());

    try {
        console.log(`Cliente (plano): Buscando productos marca=${marca}...`);
        const querySnapshot = await db.collection('products')
                                    .where('brand', '==', marca)
                                    .orderBy('name')
                                    .get();
        if (loadingMsg) loadingMsg.style.display = 'none';
        const productDocs = querySnapshot.docs.filter(doc => !doc.id.startsWith('--config-'));

        if (productDocs.length === 0) {
            container.insertAdjacentHTML('beforeend', '<p class="mensaje-vacio">No hay productos disponibles.</p>');
            return;
        }
        console.log(`Cliente (plano): ${productDocs.length} productos encontrados.`);
        let allCardsHTML = '';
        productDocs.forEach((doc) => {
             const producto = doc.data(); const productId = doc.id;
             allCardsHTML += renderProductCard(producto, productId);
        });
        // Append product cards to the container
        container.insertAdjacentHTML('beforeend', allCardsHTML);
        setupCarousels(container); // Setup carousels for these products
    } catch (error) {
        console.error(`Error GRAVE cargando productos cliente ${marca}: `, error);
        displayError(container, `Error al cargar productos de ${marca}. Revisa ÍNDICES (link en consola F12).`);
        if (loadingMsg) loadingMsg.style.display = 'none';
    }
}

// --- Carruseles de Productos ---
function setupCarousels(scopeElement = document) {
     if (!scopeElement) scopeElement = document; // Default to whole document if no specific container given
     const carousels = scopeElement.querySelectorAll('.product-carousel');
    carousels.forEach(carousel => {
        const images = carousel.querySelectorAll('.carousel-image');
        const prevButton = carousel.querySelector('.carousel-button.prev');
        const nextButton = carousel.querySelector('.carousel-button.next');
        let currentIndex = 0;

        if (images.length <= 1) { // No need for buttons if 0 or 1 image
             if (prevButton) prevButton.style.display = 'none';
             if (nextButton) nextButton.style.display = 'none';
             if (images.length === 1 && !images[0].classList.contains('active')) {
                 images[0].classList.add('active'); // Ensure first image is active if only one
             }
             return; // Exit setup for this carousel
        }
        // Show buttons if more than 1 image
        if (prevButton) prevButton.style.display = 'block';
        if (nextButton) nextButton.style.display = 'block';

        function showImage(index) {
             images.forEach((img, i) => img.classList.toggle('active', i === index));
        }

        // Clone and replace buttons to remove potential duplicate listeners
        const newPrev = prevButton?.cloneNode(true);
        const newNext = nextButton?.cloneNode(true);

        if (newPrev && prevButton) {
            carousel.replaceChild(newPrev, prevButton);
            newPrev.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + images.length) % images.length;
                showImage(currentIndex);
            });
        }
         if (newNext && nextButton) {
            carousel.replaceChild(newNext, nextButton);
            newNext.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % images.length;
                showImage(currentIndex);
            });
        }
        showImage(currentIndex); // Show the initial image (index 0)
    });
}

// --- Lógica del Carrito ---
// Use event delegation on the body for add-to-cart clicks
document.body.addEventListener('click', handleAddToCartClick);

function handleAddToCartClick(e) {
    if (!e.target.classList.contains('boton-agregar')) { return; }
    e.preventDefault(); // Prevent default button behavior
    e.stopPropagation(); // Stop event bubbling

    const boton = e.target;
    const productId = boton.dataset.id;
    const tarjeta = boton.closest('.tarjeta-producto'); // Find the parent product card

    if (!tarjeta || !productId) {
         console.warn("Could not find product card or product ID for add-to-cart button.");
         return;
    }

    // Get product details from the card
    const nombre = tarjeta.querySelector('.producto-nombre')?.textContent || 'Producto';
    const precioString = tarjeta.querySelector('.producto-precio')?.textContent.replace('$', '') || '0';
    const precio = parseFloat(precioString);
    const inputCantidad = tarjeta.querySelector('.producto-cantidad');
    const cantidad = inputCantidad ? parseInt(inputCantidad.value, 10) : 1;
    const imagenElement = tarjeta.querySelector('.carousel-image.active') || tarjeta.querySelector('.carousel-image');
    const imagenSrc = imagenElement ? imagenElement.src : 'https://via.placeholder.com/80'; // Default image

    // Validate quantity and price
    if (isNaN(precio) || precio < 0) { console.warn("Invalid price:", precioString); return; }
    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Por favor, ingresa una cantidad válida.");
        if (inputCantidad) inputCantidad.value = 1; // Reset quantity visually
        return;
     }

    const item = { id: productId, nombre: nombre, precio: precio, cantidad: cantidad, imagen: imagenSrc };
    console.log("Agregando al carrito:", item);

    let carrito = getCarritoFromStorage();
    const itemExistenteIndex = carrito.findIndex(i => i.id === productId);

    if (itemExistenteIndex > -1) { // Item already exists, update quantity
        carrito[itemExistenteIndex].cantidad += cantidad;
        console.log("Cantidad actualizada para:", nombre, "Nueva cantidad:", carrito[itemExistenteIndex].cantidad);
    } else { // New item, add to cart
        carrito.push(item);
        console.log("Nuevo item agregado:", nombre);
    }

    saveCarritoToStorage(carrito);
    actualizarContadorCarrito(); // Update cart icon count

    // Visual feedback on the button
    boton.textContent = '¡Agregado!';
    boton.style.backgroundColor = '#28a745'; // Green color
    boton.style.color = 'white';
    boton.disabled = true; // Temporarily disable button

    setTimeout(() => { // Revert button style after 1.5 seconds
        boton.textContent = 'Agregar';
        boton.style.backgroundColor = ''; // Revert to default CSS style
        boton.style.color = ''; // Revert to default CSS style
        boton.disabled = false;
        if(inputCantidad) inputCantidad.value = 1; // Reset quantity input
    }, 1500);
}

function renderizarCarrito() {
    const container = document.getElementById('carrito-container');
    const totalContainer = document.getElementById('carrito-total-container');
    const btnFinalizar = document.getElementById('finalizar-compra');
    const btnVaciar = document.getElementById('vaciar-carrito');

    if (!container || !totalContainer || !btnFinalizar || !btnVaciar) {
        console.error("Elementos de la página del carrito no encontrados.");
        return;
    }

    const carrito = getCarritoFromStorage();
    container.innerHTML = ''; // Clear previous items
    totalContainer.innerHTML = ''; // Clear previous total

    if (carrito.length === 0) {
        container.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío.</p>';
        btnFinalizar.style.display = 'none'; // Hide buttons
        btnVaciar.style.display = 'none';
        return;
    }

    let total = 0;
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        // Generate HTML for each cart item
        container.innerHTML += `
            <div class="carrito-item" data-id="${item.id}">
                <img src="${item.imagen}" alt="${item.nombre}" onerror="this.onerror=null; this.src='https://via.placeholder.com/80?text=Img';">
                <div class="carrito-item-info">
                    <h4>${item.nombre}</h4>
                    <p>Cantidad: ${item.cantidad}</p>
                    <p>Precio: $${item.precio.toFixed(2)}</p>
                    <p>Subtotal: $${subtotal.toFixed(2)}</p>
                </div>
                <button class="boton-eliminar" data-id="${item.id}">Eliminar</button>
            </div>
        `;
    });

    totalContainer.innerHTML = `<p class="carrito-total">Total: $${total.toFixed(2)}</p>`; // Display total
    btnFinalizar.style.display = 'inline-block'; // Show buttons
    btnVaciar.style.display = 'inline-block';
    addListenersPaginaCarrito(); // Re-attach event listeners for delete/checkout/empty
}

function addListenersPaginaCarrito() {
    removeListenersPaginaCarrito(); // Clean up old listeners first
    document.getElementById('carrito-container')?.addEventListener('click', handleEliminarItemCarrito);
    document.getElementById('finalizar-compra')?.addEventListener('click', handleFinalizarCompra);
    document.getElementById('vaciar-carrito')?.addEventListener('click', handleVaciarCarrito);
}

function removeListenersPaginaCarrito() {
    // Remove specific listeners to prevent duplicates if renderizarCarrito is called multiple times
    document.getElementById('carrito-container')?.removeEventListener('click', handleEliminarItemCarrito);
    document.getElementById('finalizar-compra')?.removeEventListener('click', handleFinalizarCompra);
    document.getElementById('vaciar-carrito')?.removeEventListener('click', handleVaciarCarrito);
}

function handleFinalizarCompra() {
    const carrito = getCarritoFromStorage();
    if (carrito.length === 0) return;

    let mensaje = "¡Hola! Quisiera hacer el siguiente pedido:\n\n";
    let total = 0;
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        // Format message for WhatsApp
        mensaje += `*Producto:* ${item.nombre}\n*Cantidad:* ${item.cantidad}\n*Precio Unit:* $${item.precio.toFixed(2)}\n*Subtotal:* $${subtotal.toFixed(2)}\n-------------------------\n`;
    });
    mensaje += `\n*TOTAL DEL PEDIDO: $${total.toFixed(2)}*`;

    const numeroWhatsApp = "5493571618367"; // Replace with your WhatsApp number
    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;
    window.open(urlWhatsApp, '_blank'); // Open WhatsApp link in new tab
}

function handleVaciarCarrito() {
    if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
        saveCarritoToStorage([]); // Clear cart in localStorage
        actualizarContadorCarrito(); // Update cart icon
        renderizarCarrito(); // Re-render the cart page (showing empty message)
    }
}

function handleEliminarItemCarrito(e) {
    if (!e.target.classList.contains('boton-eliminar')) { return; } // Only act on delete buttons
    const itemId = e.target.dataset.id;
    let carrito = getCarritoFromStorage();
    carrito = carrito.filter(item => item.id !== itemId); // Filter out the item to delete
    saveCarritoToStorage(carrito);
    actualizarContadorCarrito();
    renderizarCarrito(); // Re-render cart page
}

function actualizarContadorCarrito() {
    const carrito = getCarritoFromStorage();
    const totalItems = carrito.reduce((total, item) => total + item.cantidad, 0); // Sum quantities
    const cartLink = document.querySelector('.cart-link');
    if (cartLink) {
        // Update text content of cart link
        cartLink.textContent = totalItems > 0 ? `🛒 Carrito (${totalItems})` : '🛒 Carrito';
    }
}

// --- Lógica de Búsqueda ---
function setupSearchForm() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    if (!searchForm || !searchInput) { console.warn("Elementos del formulario de búsqueda no encontrados en el header."); return; }

    // If on search page, pre-fill input with query parameter
    if (window.location.pathname.includes('busqueda')) {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');
        if (query) { searchInput.value = decodeURIComponent(query); }
    }

    // Handle form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        // Redirect to search page with query parameter
        if (searchTerm) { window.location.href = `busqueda?q=${encodeURIComponent(searchTerm)}`; }
    });
}
async function executeSearchPageQuery() {
    const resultsContainer = document.getElementById('search-results-list');
    const titleElement = document.getElementById('search-results-title');
    if (!resultsContainer || !titleElement) { console.error("Contenedores de resultados de búsqueda no encontrados en busqueda.html."); return; }

    const params = new URLSearchParams(window.location.search);
    const searchTerm = params.get('q'); // Get search term from URL

    if (!searchTerm) { // Handle case with no search term
        titleElement.textContent = 'Búsqueda Inválida';
        resultsContainer.innerHTML = '<p class="error-message">No se proporcionó un término de búsqueda.</p>';
        return;
    }

    const searchTermLower = decodeURIComponent(searchTerm).toLowerCase();
    titleElement.textContent = `Resultados para: "${decodeURIComponent(searchTerm)}"`;
    resultsContainer.innerHTML = '<p class="loading-message">Buscando productos...</p>';

    try {
        const productsRef = db.collection('products');
        // Get ALL products (client-side filtering)
        const querySnapshot = await productsRef.get();

        const matches = [];
        querySnapshot.forEach(doc => {
            if (doc.id.startsWith('--config-')) return; // Skip config docs
            const product = doc.data();
            const name = product.name ? product.name.toLowerCase() : '';
            const description = product.description ? product.description.toLowerCase() : '';
            // Check if search term is in name OR description
            if (name.includes(searchTermLower) || description.includes(searchTermLower)) {
                 matches.push({ id: doc.id, ...product });
            }
        });

        // Sort results alphabetically by name AFTER filtering
        matches.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        if (matches.length === 0) { // No matches found
            resultsContainer.innerHTML = '<p class="mensaje-vacio">No se encontraron productos que coincidan con tu búsqueda.</p>';
        } else { // Matches found, render them
            let html = '';
            matches.forEach(product => { html += renderProductCard(product, product.id); });
            resultsContainer.innerHTML = html;
            setupCarousels(resultsContainer); // Initialize carousels for search results
        }
    } catch (error) {
        console.error("Error durante la búsqueda en busqueda.html:", error);
        displayError(resultsContainer, "Ocurrió un error al buscar productos.");
    }
}

// --- Manejador para botones "Mostrar/Ocultar detalles" ---
document.body.addEventListener('click', function(event) {
    if (event.target.classList.contains('toggle-details-btn')) {
        const button = event.target;
        // Buscar el contenedor de detalles hermano o dentro del mismo 'producto-info'
        // --- MODIFICADO: Buscar el contenedor de detalles específico ---
        const detailsContainer = button.nextElementSibling; // Asume que el div de detalles está justo después del botón

        if (detailsContainer && detailsContainer.classList.contains('producto-detalles')) {
            // Alternar la clase que controla la visibilidad (definida en CSS)
            detailsContainer.classList.toggle('detalles-visibles');

            // Cambiar el texto del botón
            if (detailsContainer.classList.contains('detalles-visibles')) {
                button.textContent = 'Ocultar detalles';
            } else {
                button.textContent = 'Mostrar detalles';
            }
        } else {
            console.warn("No se encontró el contenedor de detalles (.producto-detalles) inmediatamente después del botón:", button);
        }
        // --- FIN MODIFICADO ---
    }
});


// +++ AÑADIDO: Lógica del Menú Hamburguesa +++
function setupHamburgerMenu() {
    // Busca los elementos en el header. Asumimos que están en CADA página.
    const hamburgerBtn = document.querySelector('.hamburger-menu');
    const navLinksMenu = document.querySelector('.nav-links'); // Este es el <ul>

    if (hamburgerBtn && navLinksMenu) {
        hamburgerBtn.addEventListener('click', () => {
            console.log("Clic en Hamburguesa");
            // Alterna la clase 'active' en el botón (para la animación a 'X')
            hamburgerBtn.classList.toggle('active');
            // Alterna la clase 'active' en el menú (para mostrar/ocultar)
            navLinksMenu.classList.toggle('active');
        });
    } else {
        // No mostramos error en login/registro donde el nav es diferente
        const pathname = window.location.pathname;
        if (!pathname.includes('login') && !pathname.includes('registro')) {
            console.warn("No se encontró '.hamburger-menu' o '.nav-links'. El menú móvil no funcionará.");
        }
    }
}
// +++ FIN AÑADIDO +++