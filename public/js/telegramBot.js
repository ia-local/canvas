// js/telegramBot.js

class TelegramBotIntegration {
    constructor(config) {
        this.sendApiUrl = config.sendApiUrl;
        this.getApiUrl = config.getApiUrl;
        this.botUsername = config.botUsername;
        this.chatId = null; // Sera chargé depuis le serveur
        this.topicId = null; // Sera chargé depuis le serveur
        this.pollingInterval = null;
        this.pollingRate = 2000; // Fréquence de polling en ms (2 secondes)
    }

    async init() {
        if (window.app && window.app.addMessage) {
            window.app.addMessage('system', `Tentative de connexion au chat @${this.botUsername} via Telegram...`);
            await this.loadConfigAndStartPolling();
        } else {
            console.error("TelegramBotIntegration: window.app.addMessage n'est pas disponible.");
        }
    }

    async loadConfigAndStartPolling() {
        try {
            const response = await fetch('http://localhost:3000/api/config');
            if (!response.ok) {
                throw new Error(`Erreur HTTP lors du chargement de la configuration: ${response.status}`);
            }
            const config = await response.json();
            this.chatId = config.telegram.chatIdMetaPibot;
            // Charge le topicId par défaut si un est défini, ou permet de le sélectionner via l'interface
            // Pour cet exemple, on peut utiliser un topicId par défaut si on en a un dans la config.
            // Sinon, l'utilisateur devra le sélectionner via les paramètres ou une autre méthode.
            this.topicId = config.telegram.topicIds.general || null; // Exemple: utilise un topic 'general'

            if (!this.chatId) {
                window.app.addMessage('error', "Chat ID Telegram non configuré dans les paramètres. Veuillez l'ajouter via l'icône 'Paramètres'.");
                window.app.addMessage('system', "Pour trouver votre Chat ID, envoyez un message à votre bot et utilisez la commande /start sur Telegram.");
                return;
            }

            window.app.addMessage('system', `Connecté au chat Telegram : ID ${this.chatId}${this.topicId ? `, Topic ID ${this.topicId}` : ''}.`);
            this.startPolling();

        } catch (error) {
            console.error('Erreur lors du chargement de la configuration pour Telegram:', error);
            window.app.addMessage('error', `Impossible de charger la configuration Telegram: ${error.message}.`);
        }
    }

    async sendMessage(userMessage) {
        if (!userMessage.trim()) {
            window.app.addMessage('error', "Veuillez saisir un message avant d'envoyer.");
            return;
        }
        if (!this.chatId) {
            window.app.addMessage('error', "Chat ID Telegram non configuré. Impossible d'envoyer.");
            return;
        }
        if (!window.app || !window.app.addMessage || !window.app.setLoading) {
            console.error("TelegramBotIntegration: Dépendances window.app non trouvées.");
            return;
        }

        window.app.setLoading(true);
        window.app.addMessage('user', userMessage);

        try {
            const response = await fetch(this.sendApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatId: this.chatId,
                    topicId: this.topicId, // Envoie le topicId
                    message: userMessage,
                    botUsername: this.botUsername
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Erreur serveur Telegram lors de l\'envoi:', errorData.stack || errorData.message);
                throw new Error(errorData.error || errorData.message || `Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                console.log(`Message envoyé à Telegram via @${this.botUsername}.`);
            } else {
                window.app.addMessage('error', "Échec de l'envoi du message Telegram.");
            }

        } catch (error) {
            console.error('Erreur lors de l\'envoi du message Telegram:', error);
            window.app.addMessage('error', `Impossible d'envoyer le message Telegram: ${error.message}`);
        } finally {
            window.app.setLoading(false);
        }
    }

    startPolling() {
        if (this.pollingInterval) return;

        this.pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(this.getApiUrl);
                if (!response.ok) {
                    throw new Error(`Erreur HTTP lors de la récupération des réponses Telegram: ${response.status}`);
                }
                const data = await response.json();
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        // Afficher les messages qui correspondent au chatId et topicId actuel
                        const isForCurrentChat = msg.chatId === this.chatId;
                        const isForCurrentTopic = (this.topicId === null && !msg.topicId) || (this.topicId !== null && msg.topicId === this.topicId);

                        if (isForCurrentChat && isForCurrentTopic) {
                            if (msg.from === 'Telegram_AI_Response') {
                                window.app.addMessage('ai', `(Telegram) ${msg.content}`);
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Erreur lors du polling des réponses Telegram:', error);
            }
        }, this.pollingRate);
        console.log(`Polling Telegram démarré avec un intervalle de ${this.pollingRate / 1000} secondes.`);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('Polling Telegram arrêté.');
        }
    }

    clearHistory() {
        this.stopPolling();
        window.app.addMessage('system', "Historique Telegram vidé (note: l'historique réel est sur Telegram).");
    }
}

window.TelegramBotIntegration = TelegramBotIntegration;