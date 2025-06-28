// js/chatbot.js

/**
 * Module Chatbot : Gère l'interface et la logique de conversation avec l'IA.
 * Dépend de fonctions globales fournies par window.app (addMessage, setLoading, showChatScreen, promptInput).
 */
class Chatbot {
    constructor(config) {
        this.apiUrl = config.apiUrl; // URL du backend pour la génération de réponses IA
        this.aiRole = config.aiRole; // Rôle spécifique que l'IA doit jouer pour cette instance de chatbot
        this.systemMessage = `Vous êtes un assistant IA avec le rôle suivant : ${this.aiRole}. Votre objectif est d'engager des conversations pertinentes et d'assister l'utilisateur.`;
        this.conversationHistory = []; // Historique de la conversation pour le contexte
    }

    /**
     * Initialise le chatbot et affiche un message de bienvenue.
     */
    init() {
        if (window.app && window.app.addMessage) {
            window.app.addMessage('ai', `Bonjour ! Je suis votre assistant IA (${this.aiRole}). Comment puis-je vous aider aujourd'hui ?`);
            // Initialisez l'historique avec le message système pour l'IA
            this.conversationHistory = [{ role: 'system', content: this.systemMessage }];
        } else {
            console.error("Chatbot: window.app.addMessage n'est pas disponible. Impossible d'afficher le message initial.");
        }
    }

    /**
     * Envoie un message utilisateur au backend IA et affiche la réponse.
     * @param {string} userPrompt - Le texte du message de l'utilisateur.
     */
    async sendMessage(userPrompt) {
        if (!userPrompt.trim()) {
            window.app.addMessage('error', "Veuillez saisir un message avant d'envoyer.");
            return;
        }

        if (!window.app || !window.app.addMessage || !window.app.setLoading || !window.app.showChatScreen) {
            console.error("Chatbot: Dépendances window.app non trouvées. Le chatbot ne peut pas fonctionner correctement.");
            return;
        }

        window.app.showChatScreen();
        window.app.setLoading(true);
        window.app.addMessage('user', userPrompt);

        // Ajouter le prompt utilisateur à l'historique de la conversation
        this.conversationHistory.push({ role: 'user', content: userPrompt });

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Envoyer l'historique complet de la conversation pour que l'IA ait le contexte
                body: JSON.stringify({
                    // Ne plus envoyer 'prompt' séparément, il est déjà dans 'history'
                    // La première entrée de l'historique est le message système
                    history: this.conversationHistory,
                    // systemMessage n'est plus nécessaire ici si déjà inclus dans le premier élément de history
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Erreur serveur lors de la génération de la réponse IA:', errorData.stack || errorData.message);
                throw new Error(errorData.error || errorData.message || `Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.response;

            if (aiResponse) {
                window.app.addMessage('ai', aiResponse);
                // Ajouter la réponse de l'IA à l'historique
                this.conversationHistory.push({ role: 'assistant', content: aiResponse }); // Utiliser 'assistant' pour le rôle de l'IA
            } else {
                window.app.addMessage('error', "L'IA n'a pas pu générer de réponse.");
            }

        } catch (error) {
            console.error('Erreur lors de la communication avec l\'IA:', error);
            window.app.addMessage('error', `Impossible de récupérer la réponse de l'IA: ${error.message}`);
        } finally {
            window.app.setLoading(false);
        }
    }

    /**
     * Vide l'historique de la conversation.
     */
    clearHistory() {
        // Réinitialiser l'historique en gardant uniquement le message système
        this.conversationHistory = [{ role: 'system', content: this.systemMessage }];
        window.app.addMessage('system', "Historique de la conversation vidé.");
    }
}

// Exposer la classe Chatbot pour qu'elle puisse être importée/utilisée
window.Chatbot = Chatbot;