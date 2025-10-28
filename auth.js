// auth.js (Completo y Modificado)

document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase auth object exists
    if (typeof auth === 'undefined') {
        console.error("Firebase Auth object is not available. Ensure Firebase SDKs are loaded and initialized correctly before auth.js.");
        return; // Stop execution if auth is not defined
    }

    // --- DOM Elements ---
    // Desktop Auth Elements
    const userLoggedOutDiv = document.getElementById('user-logged-out');
    const userLoggedInDiv = document.getElementById('user-logged-in');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const adminLinkDesktop = document.getElementById('admin-link-a'); // Desktop admin link in nav-extra

    // Mobile Auth Elements (inside hamburger menu)
    const userLoggedOutMobileLi = document.getElementById('user-logged-out-mobile');
    const userLoggedOutMobileRegisterLi = document.getElementById('user-logged-out-mobile-register');
    const userLoggedInMobileLi = document.getElementById('user-logged-in-mobile');
    const logoutButtonMobile = document.getElementById('logout-button-mobile');

    // Mobile Email Display (in main nav)
    const userEmailSpanMobile = document.getElementById('user-email-mobile');

    // Login Form Elements (only if on login page)
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginErrorP = document.getElementById('login-error');

    // Register Form Elements (only if on register page)
    const registerForm = document.getElementById('register-form');
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const registerErrorP = document.getElementById('register-error');

    // --- Auth State Change Listener ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // --- User is logged in ---
            console.log("User logged in:", user.email || (user.isAnonymous ? "Anonymous User" : "Unknown User")); // Loguear tambien anonimos

            // Update Desktop UI
            if (userLoggedOutDiv) userLoggedOutDiv.style.display = 'none';
            if (userLoggedInDiv) userLoggedInDiv.style.display = 'flex'; // Use 'flex' as per style.css
            if (userEmailSpan && !user.isAnonymous) userEmailSpan.textContent = user.email; // Mostrar email solo si no es anonimo
            else if (userEmailSpan) userEmailSpan.textContent = ''; // Limpiar si es anonimo


            // Update Mobile UI (in hamburger)
            if (userLoggedOutMobileLi) userLoggedOutMobileLi.style.display = 'none';
            if (userLoggedOutMobileRegisterLi) userLoggedOutMobileRegisterLi.style.display = 'none';
            if (userLoggedInMobileLi) userLoggedInMobileLi.style.display = 'block'; // Or 'list-item'

            // Update Mobile Email Display (in main nav)
            if (userEmailSpanMobile && !user.isAnonymous) { // Mostrar email solo si no es anonimo
                userEmailSpanMobile.textContent = user.email;
                userEmailSpanMobile.style.display = 'inline'; // Or 'block' based on final CSS
            } else if (userEmailSpanMobile) {
                userEmailSpanMobile.textContent = ''; // Limpiar si es anonimo
                userEmailSpanMobile.style.display = 'none';
            }


            // Show Admin Link (Desktop) if applicable and NOT anonymous
            if (typeof ADMIN_EMAIL !== 'undefined' && !user.isAnonymous && user.email === ADMIN_EMAIL) {
                if (adminLinkDesktop) adminLinkDesktop.style.display = 'inline';
                console.log("Admin user detected.");
            } else {
                if (adminLinkDesktop) adminLinkDesktop.style.display = 'none';
            }

        } else {
            // --- User is logged out ---
            console.log("User logged out state detected. Attempting anonymous sign-in...");

            // ***** INICIO DE LA MODIFICACION *****
            // Si no hay usuario, intenta iniciar sesion anonimamente
            auth.signInAnonymously()
              .then(() => {
                // El inicio anonimo fue exitoso.
                // onAuthStateChanged se disparara DE NUEVO, esta vez entrando en el bloque 'if (user)'
                console.log("Anonymous sign-in successful. Waiting for state change...");
                // No actualizamos la UI aqui, esperamos al nuevo disparo de onAuthStateChanged
              })
              .catch((error) => {
                // Hubo un error al intentar el inicio anonimo
                console.error("Error during anonymous sign-in:", error);
                // Mostrar un mensaje de error o manejarlo como prefieras
                // Actualizar la UI para estado 'logged out' como fallback
                if (userLoggedOutDiv) userLoggedOutDiv.style.display = 'flex';
                if (userLoggedInDiv) userLoggedInDiv.style.display = 'none';
                if (userEmailSpan) userEmailSpan.textContent = '';
                if (adminLinkDesktop) adminLinkDesktop.style.display = 'none';
                if (userLoggedOutMobileLi) userLoggedOutMobileLi.style.display = 'block';
                if (userLoggedOutMobileRegisterLi) userLoggedOutMobileRegisterLi.style.display = 'block';
                if (userLoggedInMobileLi) userLoggedInMobileLi.style.display = 'none';
                if (userEmailSpanMobile) userEmailSpanMobile.style.display = 'none';
              });
            // ***** FIN DE LA MODIFICACION *****

            // Mantenemos la actualizacion inicial de la UI a 'logged out' mientras se intenta el inicio anonimo
            console.log("Updating UI to logged out while attempting anonymous sign-in...");
            if (userLoggedOutDiv) userLoggedOutDiv.style.display = 'flex';
            if (userLoggedInDiv) userLoggedInDiv.style.display = 'none';
            if (userEmailSpan) userEmailSpan.textContent = '';
            if (adminLinkDesktop) adminLinkDesktop.style.display = 'none';
            if (userLoggedOutMobileLi) userLoggedOutMobileLi.style.display = 'block';
            if (userLoggedOutMobileRegisterLi) userLoggedOutMobileRegisterLi.style.display = 'block';
            if (userLoggedInMobileLi) userLoggedInMobileLi.style.display = 'none';
            if (userEmailSpanMobile) userEmailSpanMobile.style.display = 'none';
        }
    });

    // --- Logout Event Listeners ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out successfully.');
                // No redirigir aqui si queremos que inicie sesion anonima automaticamente
                // window.location.href = 'index.html';
            }).catch((error) => {
                console.error('Sign out error:', error);
            });
        });
    }

    if (logoutButtonMobile) {
        logoutButtonMobile.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out successfully from mobile.');
                 // No redirigir aqui si queremos que inicie sesion anonima automaticamente
                // window.location.href = 'index.html';
            }).catch((error) => {
                console.error('Sign out error (mobile):', error);
            });
        });
    }

    // --- Login Form Handler ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Login successful:', userCredential.user.email);
                    if (loginErrorP) loginErrorP.style.display = 'none';
                    window.location.href = 'index.html'; // Redirigir a inicio tras login exitoso
                })
                .catch((error) => {
                    console.error('Login error:', error.code, error.message);
                    if (loginErrorP) {
                        loginErrorP.textContent = getFriendlyAuthErrorMessage(error);
                        loginErrorP.style.display = 'block';
                    }
                });
        });
    }

    // --- Register Form Handler ---
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = registerEmailInput.value;
            const password = registerPasswordInput.value;
            if (password.length < 6) {
                 if (registerErrorP) {
                    registerErrorP.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                    registerErrorP.style.display = 'block';
                 }
                return;
            }
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Registration successful:', userCredential.user.email);
                     if (registerErrorP) registerErrorP.style.display = 'none';
                    window.location.href = 'index.html'; // Redirigir a inicio tras registro exitoso
                })
                .catch((error) => {
                    console.error('Registration error:', error.code, error.message);
                    if (registerErrorP) {
                        registerErrorP.textContent = getFriendlyAuthErrorMessage(error);
                        registerErrorP.style.display = 'block';
                    }
                });
        });
    }

    // --- Helper Function for Friendly Error Messages ---
    function getFriendlyAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No se encontró usuario con ese correo electrónico.';
            case 'auth/wrong-password':
                return 'Contraseña incorrecta.';
            case 'auth/invalid-email':
                return 'El formato del correo electrónico no es válido.';
            case 'auth/email-already-in-use':
                return 'Este correo electrónico ya está registrado.';
            case 'auth/weak-password':
                return 'La contraseña es demasiado débil (mínimo 6 caracteres).';
            case 'auth/network-request-failed':
                return 'Error de red. Por favor, verifica tu conexión.';
            // Añadir manejo específico para anonymous sign-in si es necesario
             case 'auth/operation-not-allowed':
                 return 'Inicio de sesión anónimo no está habilitado en Firebase (revisar consola).';
            default:
                return 'Ocurrió un error. Por favor, inténtalo de nuevo.';
        }
    }

}); // End DOMContentLoaded