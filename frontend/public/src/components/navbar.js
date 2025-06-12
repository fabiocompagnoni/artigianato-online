class NavBar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <link rel="stylesheet" href="/src/css/navbar.css">
        <div class="customNavbar">
            <div class="container d-flex align-items-center justify-content-between">
                <a class="logo" href="/"><img src="/src/img/logo_orizzontale.png" alt="Logo" height="50"></a>
                <div class="linkDesktop d-none d-md-flex ">
                    <a href='/prodotti'>Tutti i prodotti</a>
                    <a href='/artigiani'>I nostri artigiani</a>
                    <div class="nav-item dropdown"> 
                        <button class="btn btn-link nav-link px-0 px-lg-2 py-2 dropdown-toggle d-flex align-items-center" id="bd-theme" type="button" aria-expanded="false" data-bs-toggle="dropdown" data-bs-display="static" aria-label="Toggle theme (dark)"> 
                            <i class="fa-solid fa-moon"></i><span class="d-lg-none ms-2" id="bd-theme-text">Toggle theme</span> 
                        </button> 
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="bd-theme-text"> 
                            <li><button type="button" class="dropdown-item d-flex align-items-center justify-content-between" data-bs-theme-value="light" aria-pressed="false"><i class="fa-solid fa-sun"></i><span>Tema Chiaro</span></button></li> 
                            <li><button type="button" class="dropdown-item d-flex align-items-center justify-content-between active theme-icon-active " data-bs-theme-value="dark" aria-pressed="true"><i class="fa-solid fa-moon"></i><span>Tema Scuro</span></button></li> 
                            <li><button type="button" class="dropdown-item d-flex align-items-center justify-content-between" data-bs-theme-value="auto" aria-pressed="false"><i class="fa-solid fa-circle-half-stroke"></i><span>Tema automatico</span></button></li> 
                        </ul> 
                    </div>
                    <a href='/carrello'><i class="fa-solid fa-cart-shopping"></i></a>
                    <button id="btnUserProfileDesktop" class="btnProfiloNav"><i class="fa-solid fa-user"></i></button>
                </div>
                <div class="d-flex d-md-none justify-content-end gap-2 align-items-center">
                    <a href='/carrello'><i class="fa-solid fa-cart-shopping"></i></a>
                    <button class="btnOpenMobileMenu" id="btnOpenMobileMenu"><i class="fa-solid fa-bars"></i></button>
                </div>
            </div>
        </div>
        <div class="mobileNavMenu d-none flex-column gap-2">
            <a href='/prodotti'>Tutti i prodotti</a>
            <a href='/artigiani'>I nostri artigiani</a>
            <div class="nav-item dropdown"> 
                <button class="btn btn-link nav-link px-0 px-lg-2 py-2 dropdown-toggle d-flex align-items-center" id="bd-theme" type="button" aria-expanded="false" data-bs-toggle="dropdown" data-bs-display="static" aria-label="Toggle theme (dark)"> 
                    <i class="fa-solid fa-moon"></i><span class="d-lg-none ms-2" id="bd-theme-text">Cambia tema</span> 
                </button> 
                <ul class="dropdown-menu dropdown-menu-start" aria-labelledby="bd-theme-text"> 
                    <li><button type="button" class="dropdown-item d-flex align-items-center justify-content-between" data-bs-theme-value="light" aria-pressed="false"><i class="fa-solid fa-sun"></i><span>Tema Chiaro</span></button></li> 
                    <li><button type="button" class="dropdown-item d-flex align-items-center justify-content-between active theme-icon-active " data-bs-theme-value="dark" aria-pressed="true"><i class="fa-solid fa-moon"></i><span>Tema Scuro</span></button></li> 
                    <li><button type="button" class="dropdown-item d-flex align-items-center justify-content-between" data-bs-theme-value="auto" aria-pressed="false"><i class="fa-solid fa-circle-half-stroke"></i><span>Tema automatico</span></button></li> 
                </ul> 
            </div>
            <button id="btnUserProfile" class="d-flex align-items-center gap-2 btnUserMobile"><i class="fa-solid fa-user"></i><span>Profilo</span></button>
        </div>
        `;

        //comportamento dinamico
        document.getElementById("btnOpenMobileMenu").addEventListener("click",()=>{
            let menu=document.querySelector(".mobileNavMenu");
            menu.classList.toggle("d-none");
            menu.classList.toggle("d-flex");        
        });
        //cambiamento del tema
        const getStoredTheme = () => localStorage.getItem('theme');
        const setStoredTheme = theme => localStorage.setItem('theme', theme);

        const getPreferredTheme = () => {
            const storedTheme = getStoredTheme();
            if (storedTheme) return storedTheme;

            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };

        const setTheme = theme => {
            if (theme === 'auto') {
                document.documentElement.setAttribute('data-bs-theme', (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
            } else {
                document.documentElement.setAttribute('data-bs-theme', theme);
            }
        };

        setTheme(getPreferredTheme());

        const showActiveTheme = (theme, focus = false) => {
            const themeSwitcher = document.querySelector('#bd-theme');

            if (!themeSwitcher) return;

            const themeSwitcherText = document.querySelector('#bd-theme-text');
            const btnToActive = document.querySelector(`[data-bs-theme-value="${theme}"]`);
            const iconClass = btnToActive.querySelector('i').className;

            // Rimuove classe attiva da tutti
            document.querySelectorAll('[data-bs-theme-value]').forEach(element => {
            element.classList.remove('active');
            element.setAttribute('aria-pressed', 'false');
            });

            // Imposta classe attiva
            btnToActive.classList.add('active');
            btnToActive.setAttribute('aria-pressed', 'true');

            // Aggiorna icona nel selettore
            const bdThemeIcon = themeSwitcher.querySelector('i');
            bdThemeIcon.className = iconClass;

            const themeSwitcherLabel = `${themeSwitcherText.textContent} (${btnToActive.dataset.bsThemeValue})`;
            themeSwitcher.setAttribute('aria-label', themeSwitcherLabel);

            if (focus) themeSwitcher.focus();
        };

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const storedTheme = getStoredTheme();
            if (storedTheme !== 'light' && storedTheme !== 'dark') {
                setTheme(getPreferredTheme());
            }
        });

        window.addEventListener('DOMContentLoaded', () => {
            showActiveTheme(getPreferredTheme());

            document.querySelectorAll('[data-bs-theme-value]')
                .forEach(toggle => {
                    toggle.addEventListener('click', () => {
                        const theme = toggle.getAttribute('data-bs-theme-value');
                        setStoredTheme(theme);
                        setTheme(theme);
                        showActiveTheme(theme, true);
                    });
                });
        });

    }
}
customElements.define("nav-bar", NavBar);
