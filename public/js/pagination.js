// js/pagination.js

const iconPages = [
    // Page 1
    [
        { label: 'IA Core', iconClass: 'fa-solid fa-brain', bgColor: 'bg-blue-100', textColor: 'text-blue-700', type: 'chatbot', role: 'généraliste et amical' },
        { label: 'Audio', iconClass: 'fa-solid fa-music', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
        { label: 'Caméra', iconClass: 'fa-solid fa-camera', bgColor: 'bg-green-100', textColor: 'text-green-700' },
        { label: 'Stockage', iconClass: 'fa-solid fa-hard-drive', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
        { label: 'Terminal', iconClass: 'fa-solid fa-terminal', bgColor: 'bg-red-100', textColor: 'text-red-700' },
        { label: 'Paramètres', iconClass: 'fa-solid fa-gear', bgColor: 'bg-gray-200', textColor: 'text-gray-700' },
        { label: 'Batterie', iconClass: 'fa-solid fa-battery-full', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
        { label: 'RAM', iconClass: 'fa-solid fa-memory', bgColor: 'bg-cyan-100', textColor: 'text-cyan-700' },
        { label: 'Réseau', iconClass: 'fa-solid fa-wifi', bgColor: 'bg-teal-100', textColor: 'text-teal-700' },
    ],
    // Page 2
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
        { label: 'WebXR', iconClass: 'fa-solid fa-cube', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
        { label: 'Conseiller Dev', iconClass: 'fa-solid fa-code', bgColor: 'bg-cyan-200', textColor: 'text-cyan-800', type: 'chatbot', role: 'expert en développement web et mobile' },
    ]
];

let currentPage = 0;

document.addEventListener('DOMContentLoaded', () => {
    const iconPagesContainer = document.getElementById('iconPagesContainer');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageIndicators = document.getElementById('pageIndicators');

    // --- DÉFINITION DE createIconElement ICI ---
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
            if (window.app && window.app.promptInput && window.app.showChatScreen && window.app.setLoading) {
                if (iconData.type === 'chatbot' && window.Chatbot) {
                    const chatbotInstance = new window.Chatbot({
                        apiUrl: 'http://localhost:3000/generate',
                        aiRole: iconData.role || 'assistant IA généraliste'
                    });
                    window.app.setActiveChatbot(chatbotInstance);
                    window.app.showChatScreen();
                } else if (iconData.label === 'Terminal') {
                    const commandToExecute = prompt("Entrez la commande terminal à exécuter (ex: 'ls -la', 'pwd', 'git status'):");
                    if (commandToExecute) {
                        executeTerminalCommand(commandToExecute);
                    } else {
                        window.app.addMessage('system', 'Exécution de commande annulée.');
                        window.app.showChatScreen();
                    }
                } else if (iconData.label === 'WebXR') {
                    window.app.startWebXRSession();
                }
                else {
                    window.app.promptInput.value = `Discute avec moi sur le thème : ${iconData.label}.`;
                    window.app.showChatScreen();
                }
            } else {
                console.error("window.app ou window.Chatbot n'est pas complètement initialisé.");
                window.app.addMessage('error', "Erreur interne: l'application n'est pas prête.");
            }
        });
        return iconItem;
    }
    // --- FIN DE DÉFINITION DE createIconElement ---

    // --- DÉFINITION DE renderIcons ICI (qui appelle createIconElement) ---
    function renderIcons() {
        iconPagesContainer.innerHTML = '';
        const iconsToRender = iconPages[currentPage];

        if (iconsToRender) {
            iconsToRender.forEach(iconData => {
                iconPagesContainer.appendChild(createIconElement(iconData));
            });
        }
        updatePaginationControls();
    }
    // --- FIN DE DÉFINITION DE renderIcons ---

    // --- DÉFINITION DE updatePaginationControls ICI ---
    function updatePaginationControls() {
        // Logique de mise à jour des boutons prev/next et des indicateurs de page
        prevPageBtn.disabled = currentPage === 0;
        nextPageBtn.disabled = currentPage === iconPages.length - 1;

        pageIndicators.innerHTML = '';
        iconPages.forEach((_, index) => {
            const indicator = document.createElement('span');
            indicator.classList.add('w-2.5', 'h-2.5', 'rounded-full', 'inline-block', 'mx-1');
            if (index === currentPage) {
                indicator.classList.add('bg-blue-500');
            } else {
                indicator.classList.add('bg-gray-400');
            }
            pageIndicators.appendChild(indicator);
        });
    }
    // --- FIN DE DÉFINITION DE updatePaginationControls ---


    // --- DÉFINITION DE executeTerminalCommand ICI ---
    async function executeTerminalCommand(command) {
        window.app.showChatScreen();
        window.app.addMessage('user', `Exécution de commande: \`${command}\``);
        window.app.setLoading(true);

        try {
            const response = await fetch('http://localhost:3000/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command: command }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Erreur serveur lors de la commande:', errorData.stack || errorData.message);
                throw new Error(errorData.error || errorData.message || `Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            if (data.stdout) {
                window.app.addMessage('ai', `Sortie de la commande:\n\`\`\`\n${data.stdout}\n\`\`\``);
            }
            if (data.stderr) {
                window.app.addMessage('system', `Erreurs (stderr):\n\`\`\`\n${data.stderr}\n\`\`\``);
            }
            if (!data.stdout && !data.stderr) {
                window.app.addMessage('ai', `La commande "${command}" s'est exécutée sans sortie.`);
            }

        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande :', error);
            window.app.addMessage('error', `Erreur lors de l'exécution de la commande "${command}" : ${error.message}`);
        } finally {
            window.app.setLoading(false);
        }
    }
    // --- FIN DE DÉFINITION DE executeTerminalCommand ---


    // Écouteurs d'événements pour la pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderIcons();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < iconPages.length - 1) {
            currentPage++;
            renderIcons();
        }
    });

    renderIcons(); // Appel initial pour afficher la première page d'icônes
});