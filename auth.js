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

    // *** NUEVO: Mobile Email Display (in main nav) ***
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
            console.log("User logged in:", user.email);

            // Update Desktop UI
            if (userLoggedOutDiv) userLoggedOutDiv.style.display = 'none';
            if (userLoggedInDiv) userLoggedInDiv.style.display = 'flex'; // Use 'flex' as per style.css
            if (userEmailSpan) userEmailSpan.textContent = user.email;

            // Update Mobile UI (in hamburger)
            if (userLoggedOutMobileLi) userLoggedOutMobileLi.style.display = 'none';
            if (userLoggedOutMobileRegisterLi) userLoggedOutMobileRegisterLi.style.display = 'none';
            if (userLoggedInMobileLi) userLoggedInMobileLi.style.display = 'block'; // Or 'list-item'

            // *** NUEVO: Update Mobile Email Display (in main nav) ***
            if (userEmailSpanMobile) {
                userEmailSpanMobile.textContent = user.email;
                userEmailSpanMobile.style.display = 'inline'; // Or 'block' based on final CSS
            }

            // Show Admin Link (Desktop) if applicable
            if (typeof ADMIN_EMAIL !== 'undefined' && user.email === ADMIN_EMAIL) {
                if (adminLinkDesktop) adminLinkDesktop.style.display = 'inline';
                console.log("Admin user detected.");
            } else {
                if (adminLinkDesktop) adminLinkDesktop.style.display = 'none';
            }

        } else {
            // --- User is logged out ---
            console.log("User logged out.");

            // Update Desktop UI
            if (userLoggedOutDiv) userLoggedOutDiv.style.display = 'flex';
            if (userLoggedInDiv) userLoggedInDiv.style.display = 'none';
            if (userEmailSpan) userEmailSpan.textContent = '';
            if (adminLinkDesktop) adminLinkDesktop.style.display = 'none'; // Hide admin link on logout

            // Update Mobile UI (in hamburger)
            if (userLoggedOutMobileLi) userLoggedOutMobileLi.style.display = 'block'; // Or 'list-item'
            if (userLoggedOutMobileRegisterLi) userLoggedOutMobileRegisterLi.style.display = 'block'; // Or 'list-item'
            if (userLoggedInMobileLi) userLoggedInMobileLi.style.display = 'none';

            // *** NUEVO: Update Mobile Email Display (in main nav) ***
            if (userEmailSpanMobile) {
                userEmailSpanMobile.textContent = '';
                userEmailSpanMobile.style.display = 'none';
            }
        }
    });

    // --- Logout Event Listeners ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out successfully.');
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error('Sign out error:', error);
            });
        });
    }

    if (logoutButtonMobile) {
        logoutButtonMobile.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User signed out successfully from mobile.');
                window.location.href = 'index.html';
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
                    window.location.href = 'index.html';
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
                    window.location.href = 'index.html';
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
            default:
                return 'Ocurrió un error. Por favor, inténtalo de nuevo.';
        }
    }

}); // End DOMContentLoaded