// js/modal.js

document.addEventListener('DOMContentLoaded', () => {
    const androidModal = document.getElementById('androidModal');
    const closeAndroidModalBtn = document.getElementById('closeAndroidModalBtn');
    const modalContentContainer = document.getElementById('modalContent'); // Conteneur pour le contenu dynamique du modal
    const saveSettingsBtn = document.getElementById('saveSettingsBtn'); // Bouton de sauvegarde des paramètres

    let currentModalType = null; // Garde en mémoire le type de modal ouvert

    // --- Fonctions génériques pour ouvrir/fermer le modal ---
    function openModal(type) {
        currentModalType = type;
        modalContentContainer.innerHTML = ''; // Nettoie le contenu précédent
        androidModal.classList.add('visible');
        renderModalContent(type);
    }

    function closeModal() {
        androidModal.classList.remove('visible');
        currentModalType = null;
        modalContentContainer.innerHTML = ''; // Nettoie le contenu à la fermeture
        saveSettingsBtn.classList.add('hidden'); // Cache le bouton de sauvegarde par défaut
    }

    // Écouteurs d'événements
    if (closeAndroidModalBtn) {
        closeAndroidModalBtn.addEventListener('click', closeModal);
    }

    if (androidModal) {
        androidModal.addEventListener('click', (event) => {
            if (event.target === androidModal) {
                closeModal();
            }
        });
    }

    // --- Fonctions pour rendre le contenu spécifique du modal ---
    async function renderModalContent(type) {
        if (type === 'settings') {
            modalContentContainer.innerHTML = `
                <h3 class="text-xl font-semibold mb-4 text-gray-800">Paramètres de l'Application</h3>
                <div class="space-y-4">
                    <div class="flex flex-col">
                        <label for="telegramChatId" class="text-sm font-medium text-gray-700 mb-1">Telegram Chat ID (meta_Pibot):</label>
                        <input type="text" id="telegramChatId" placeholder="Entrez votre Chat ID Telegram" class="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <p class="text-xs text-gray-500 mt-1">Trouvez cet ID en envoyant `/start` à votre bot Telegram et en regardant la réponse.</p>
                    </div>
                    <div class="flex flex-col">
                        <label for="telegramTopicGeneral" class="text-sm font-medium text-gray-700 mb-1">Telegram Topic ID (Général):</label>
                        <input type="text" id="telegramTopicGeneral" placeholder="Optionnel: ID du topic général" class="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <p class="text-xs text-gray-500 mt-1">Laissez vide si vous n'utilisez pas les topics ou si c'est le topic par défaut.</p>
                    </div>
                    <div class="flex flex-col">
                        <label for="pollingRate" class="text-sm font-medium text-gray-700 mb-1">Fréquence de Polling Telegram (ms):</label>
                        <input type="number" id="pollingRate" min="500" max="10000" step="100" class="border border-gray-300 p-2 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <p class="text-xs text-gray-500 mt-1">Temps entre chaque vérification de nouvelles réponses Telegram (en millisecondes).</p>
                    </div>
                </div>
            `;
            saveSettingsBtn.classList.remove('hidden'); // Affiche le bouton de sauvegarde pour les paramètres
            await loadSettingsIntoForm(); // Charge les paramètres existants
        }
        // Vous pouvez ajouter d'autres types de modaux ici (ex: 'about', 'help', etc.)
    }

    // --- Fonctions de gestion des paramètres ---
    async function loadSettingsIntoForm() {
        try {
            const response = await fetch('http://localhost:3000/api/config');
            if (!response.ok) throw new Error('Failed to fetch config');
            const config = await response.json();

            document.getElementById('telegramChatId').value = config.telegram?.chatIdMetaPibot || '';
            document.getElementById('telegramTopicGeneral').value = config.telegram?.topicIds?.general || '';
            document.getElementById('pollingRate').value = config.pollingRateMs || 2000;

        } catch (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
            if (window.app && window.app.addMessage) {
                window.app.addMessage('error', `Impossible de charger les paramètres: ${error.message}.`);
            }
        }
    }

    async function saveSettings() {
        const telegramChatId = document.getElementById('telegramChatId').value.trim();
        const telegramTopicGeneral = document.getElementById('telegramTopicGeneral').value.trim();
        const pollingRate = parseInt(document.getElementById('pollingRate').value, 10);

        const updatedConfig = {
            telegram: {
                chatIdMetaPibot: telegramChatId,
                topicIds: {
                    general: telegramTopicGeneral
                }
            },
            pollingRateMs: pollingRate
        };

        try {
            const response = await fetch('http://localhost:3000/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedConfig),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Erreur inconnue lors de la sauvegarde.');
            }

            const data = await response.json();
            console.log('Paramètres sauvegardés:', data.config);
            if (window.app && window.app.addMessage) {
                window.app.addMessage('system', 'Paramètres sauvegardés avec succès !');
                // Alerter l'utilisateur de redémarrer le bot Telegram si nécessaire
                window.app.addMessage('system', 'Pour que les changements Telegram prennent effet, veuillez relancer le bot Telegram (retournez à l\'accueil et re-sélectionnez l\'icône Telegram).');
            }
            closeModal(); // Ferme le modal après sauvegarde
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres:', error);
            if (window.app && window.app.addMessage) {
                window.app.addMessage('error', `Échec de la sauvegarde des paramètres: ${error.message}.`);
            }
        }
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    // Expose les fonctions du modal globalement
    window.modal = {
        openModal: openModal,
        closeModal: closeModal
    };

    // La fonction openAndroidModalBtn de l'ancienne version n'est plus nécessaire
    // car pagination.js appelle directement window.modal.openModal('settings')
});