// ===============================================
// === LÓGICA DE AUTENTICACIÓN (auth.js) ===
// ===============================================

// Asegurarse de que ADMIN_EMAIL está definido globalmente (desde el HTML)
if (typeof ADMIN_EMAIL === 'undefined') { // Corregido: 'undefined' debe ser un string
    console.error("La variable ADMIN_EMAIL no está definida globalmente en el HTML. Asegúrate de que esté en el bloque <script> antes de cargar auth.js");
}

document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que 'auth' está definido globalmente (desde el HTML)
    if (typeof auth === 'undefined') {
        console.error("Firebase Auth no está inicializado. Asegúrate de que los scripts y la configuración estén en el HTML.");
        return;
    }

    // --- Elementos del DOM ---
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const adminLinkA = document.getElementById('admin-link-a'); // ID del enlace <a>

    // --- Formularios (si existen en la página actual) ---
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const registerError = document.getElementById('register-error');
    const loginError = document.getElementById('login-error');

    // --- Manejo del estado de autenticación ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // --- Usuario está conectado (YA SEA ANÓNIMO O REAL) ---

            // A. Si NO es anónimo (es un usuario real con email)
            if (user.email && !user.isAnonymous) {
                console.log('Usuario real conectado (onAuthStateChanged):', user.email); // Log para depurar
                if (userLoggedInDiv && userLoggedOutDiv && userEmailSpan) { // Quitado adminLinkA de esta línea
                    userLoggedInDiv.style.display = 'flex'; // Mostrar sección de logueado
                    userLoggedOutDiv.style.display = 'none'; // Ocultar sección de no logueado
                    userEmailSpan.textContent = user.email; // Mostrar email

                    // +++ MODIFICACIÓN: Comprobar si adminLinkA existe antes de usarlo +++
                    // Mostrar enlace ADMIN solo si el email coincide Y el enlace existe en la página
                    if (adminLinkA) {
                        if (user.email === ADMIN_EMAIL) {
                            adminLinkA.style.display = 'inline'; // Mostrar el <a>
                        } else {
                            adminLinkA.style.display = 'none';
                        }
                    }
                    // +++ FIN MODIFICACIÓN +++
                }

                // Redirigir si está en login/registro ya conectado
                const currentPage = window.location.pathname.split('/').pop();
                if (currentPage === 'login.html' || currentPage === 'registro.html') {
                    console.log('Usuario ya conectado, redirigiendo desde', currentPage, 'a index.html');
                    window.location.href = 'index.html';
                }
                // Redirigir si NO es admin e intenta acceder a admin.html
                if (currentPage === 'admin.html' && user.email !== ADMIN_EMAIL) {
                    console.warn('Acceso denegado a admin.html para usuario no admin:', user.email);
                    alert('Acceso denegado. Debes ser administrador.');
                    window.location.href = 'index.html';
                }

            // B. Si es anónimo
            } else if (user.isAnonymous) {
                console.log('Usuario conectado anónimamente:', user.uid);
                // Asegurarse de que vea los botones "Iniciar Sesión"
                if (userLoggedInDiv && userLoggedOutDiv) {
                    userLoggedInDiv.style.display = 'none';
                    userLoggedOutDiv.style.display = 'flex';
                }
                if (adminLinkA) {
                    adminLinkA.style.display = 'none'; // Ocultar link ADMIN si existe
                }
            }

        } else {
            // --- Usuario está desconectado ---
            // *** ¡NUEVA LÓGICA! Iniciar sesión anónima ***
            console.log('Usuario desconectado, iniciando sesión anónima...');
            auth.signInAnonymously().catch(error => {
                console.error("Error al iniciar sesión anónima:", error);
                // Mostrar botones de "Iniciar Sesión" incluso si falla el login anónimo
                if (userLoggedInDiv && userLoggedOutDiv) {
                    userLoggedInDiv.style.display = 'none';
                    userLoggedOutDiv.style.display = 'flex';
                }
                if (adminLinkA) {
                    adminLinkA.style.display = 'none';
                }
            });
            // *** FIN NUEVA LÓGICA ***
        }
    }); // Fin onAuthStateChanged

    // --- Manejo del botón de Cerrar Sesión ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('Sesión cerrada exitosamente');
                // No redirigimos a index, onAuthStateChanged lo detectará
                // y volverá a loguear anónimamente.
                // Si estamos en admin.html, el chequeo de onAuthStateChanged nos redirigirá a login si ya no somos admin.
                const currentPage = window.location.pathname.split('/').pop();
                if (currentPage === 'admin.html') {
                    // Si cerramos sesión desde admin, mejor ir a login
                    window.location.href = 'login.html';
                } else {
                    // Para otras páginas, simplemente recargamos para que se aplique
                    // el estado de "no logueado" (anónimo) y se actualice la UI
                    window.location.reload();
                }
            }).catch(error => {
                console.error('Error al cerrar sesión:', error);
                alert('Error al cerrar sesión.');
            });
        });
    }

    // --- Manejo del Formulario de Registro ---
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            if (registerError) registerError.style.display = 'none';

            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    console.log('Usuario registrado:', userCredential.user.email);
                    // onAuthStateChanged se encargará de redirigir desde registro.html a index.html
                })
                .catch(error => {
                    console.error('Error de registro:', error.code, error.message);
                    if (registerError) {
                        registerError.textContent = getAuthErrorMessage(error.code);
                        registerError.style.display = 'block';
                    }
                });
        });
    }

    // --- Manejo del Formulario de Inicio de Sesión ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            if (loginError) loginError.style.display = 'none';

            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    console.log('Usuario inició sesión (manual):', userCredential.user.email);
                    // onAuthStateChanged detectará este cambio y se encargará de redirigir desde login.html a index.html
                })
                .catch(error => {
                    console.error('Error de inicio de sesión:', error.code, error.message);
                    if (loginError) {
                        loginError.textContent = getAuthErrorMessage(error.code);
                        loginError.style.display = 'block';
                    }
                });
        });
    }

}); // Fin del addEventListener 'DOMContentLoaded'

// --- Función auxiliar para traducir errores de Firebase ---
function getAuthErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'El correo electrónico ya está registrado.';
        case 'auth/invalid-email':
            return 'El formato del correo electrónico no es válido.';
        case 'auth/operation-not-allowed':
            return 'El inicio de sesión por correo/contraseña no está habilitado.';
        case 'auth/weak-password':
            return 'La contraseña es demasiado débil (mínimo 6 caracteres).';
        case 'auth/user-disabled':
            return 'Esta cuenta de usuario ha sido deshabilitada.';
        case 'auth/user-not-found':
            return 'No se encontró ningún usuario con ese correo electrónico.';
        case 'auth/wrong-password':
            return 'La contraseña es incorrecta.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos fallidos. Inténtalo de nuevo más tarde.';
        default:
            return 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
    }
}