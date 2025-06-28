// Définition des icônes réparties sur différentes pages
const iconPages = [
    // Page 1
    [
        { label: 'IA Core', iconClass: 'fa-solid fa-pencil-alt', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
        { label: 'Audio', iconClass: 'fa-solid fa-music', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
        { label: 'Caméra', iconClass: 'fa-solid fa-camera', bgColor: 'bg-green-100', textColor: 'text-green-700' },
        { label: 'Stockage', iconClass: 'fa-solid fa-hard-drive', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
        { label: 'Terminal', iconClass: 'fa-solid fa-terminal', bgColor: 'bg-red-100', textColor: 'text-red-700' },
        { label: 'Paramètres', iconClass: 'fa-solid fa-gear', bgColor: 'bg-gray-200', textColor: 'text-gray-700' },
        { label: 'Batterie', iconClass: 'fa-solid fa-battery-full', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
        { label: 'RAM', iconClass: 'fa-solid fa-memory', bgColor: 'bg-cyan-100', textColor: 'text-cyan-700' },
        { label: 'Réseau', iconClass: 'fa-solid fa-wifi', bgColor: 'bg-teal-100', textColor: 'text-teal-700' },
    ],
    // Page 2 (Exemple d'icônes supplémentaires pour une deuxième page)
    [
        { label: 'Graphiques', iconClass: 'fa-solid fa-chart-bar', bgColor: 'bg-pink-100', textColor: 'text-pink-700' },
        { label: 'Capteurs', iconClass: 'fa-solid fa-sensor', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700' },
        { label: 'Localisation', iconClass: 'fa-solid fa-location-dot', bgColor: 'bg-lime-100', textColor: 'text-lime-700' },
        { label: 'Sécurité', iconClass: 'fa-solid fa-lock', bgColor: 'bg-neutral-100', textColor: 'text-neutral-700' },
        { label: 'Notifications', iconClass: 'fa-solid fa-bell', bgColor: 'bg-blue-200', textColor: 'text-blue-800' },
        { label: 'Périphériques', iconClass: 'fa-solid fa-usb', bgColor: 'bg-purple-200', textColor: 'text-purple-800' },
        { label: 'Calendrier', iconClass: 'fa-solid fa-calendar', bgColor: 'bg-green-200', textColor: 'text-green-800' },
        { label: 'Contacts', iconClass: 'fa-solid fa-address-book', bgColor: 'bg-yellow-200', textColor: 'text-yellow-800' },
        { label: 'Cloud', iconClass: 'fa-solid fa-cloud', bgColor: 'bg-red-200', textColor: 'text-red-800' },
    ]
    // Vous pouvez ajouter d'autres pages ici
];

let currentPage = 0; // Index de la page d'icônes actuellement affichée

document.addEventListener('DOMContentLoaded', () => {
    const iconPagesContainer = document.getElementById('iconPagesContainer');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageIndicators = document.getElementById('pageIndicators');

    // Fonction pour générer une icône individuelle
    function createIconElement(iconData) {
        const iconItem = document.createElement('div');
        iconItem.classList.add('icon-item', 'group');
        iconItem.innerHTML = `
            <div class="icon-box ${iconData.bgColor} ${iconData.textColor}">
                <i class="${iconData.iconClass} text-3xl"></i>
            </div>
            <span class="icon-label">${iconData.label}</span>
        `;
        iconItem.addEventListener('click', () => {
            // Utilise les fonctions globales exposées par index.html
            if (window.app && window.app.promptInput && window.app.showChatScreen) {
                window.app.promptInput.value = `Discute avec moi sur le thème : ${iconData.label}.`;
                window.app.showChatScreen();
                // Optionnel: déclencher l'envoi automatique si désiré
                // document.getElementById('executeButton').click();
            }
        });
        return iconItem;
    }

    // Fonction pour rendre les icônes de la page actuelle
    function renderIcons() {
        iconPagesContainer.innerHTML = ''; // Efface les icônes existantes
        const iconsToRender = iconPages[currentPage];

        if (iconsToRender) {
            iconsToRender.forEach(iconData => {
                iconPagesContainer.appendChild(createIconElement(iconData));
            });
        }
        updatePaginationControls();
    }

    // Fonction pour mettre à jour l'état des boutons de pagination et des indicateurs
    function updatePaginationControls() {
        prevPageBtn.disabled = currentPage === 0;
        nextPageBtn.disabled = currentPage === iconPages.length - 1;

        pageIndicators.innerHTML = ''; // Efface les indicateurs existants
        for (let i = 0; i < iconPages.length; i++) {
            const dot = document.createElement('span');
            dot.classList.add('w-2', 'h-2', 'rounded-full', 'bg-gray-400');
            if (i === currentPage) {
                dot.classList.add('bg-blue-500'); // Couleur pour la page active
            }
            pageIndicators.appendChild(dot);
        }
    }

    // Écouteur pour le bouton "Page Précédente"
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderIcons();
        }
    });

    // Écouteur pour le bouton "Page Suivante"
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < iconPages.length - 1) {
            currentPage++;
            renderIcons();
        }
    });

    // Rendre la première page d'icônes au chargement
    renderIcons();
});
