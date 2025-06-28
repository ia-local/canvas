// bots/workerPibotHandler.js
const fs = require('fs');
const path = require('path');

// Variable globale pour stocker les dépendances injectées
let injectedDependencies = {};

/**
 * Fonction d'initialisation du handler.
 * C'est ici que vous enregistrez tous les écouteurs d'événements (commandes, messages, etc.)
 * et que vous recevez les instances des autres bots/services.
 * @param {Telegraf} botInstance L'instance de Telegraf pour ce bot.
 * @param {object} dependencies Un objet contenant les instances Groq, OpenAI, Gemini, etc., et botsNetwork.
 */
function init(botInstance, dependencies) {
    console.log('[workerPibotHandler] Initialisation du handler...');
    injectedDependencies = dependencies; // Stocke les dépendances pour une utilisation ultérieure

    const { groq, botsNetwork } = injectedDependencies;

    if (!groq) {
        console.warn('[workerPibotHandler] AVERTISSEMENT: L\'instance Groq n\'est pas disponible. Les commandes qui en dépendent ne fonctionneront pas.');
    }
    if (!botsNetwork || !botsNetwork.workerPibot) {
        console.error('[workerPibotHandler] ERREUR: Le réseau de bots n\'est pas correctement configuré ou workerPibot n\'est pas défini dans celui-ci.');
    }

    // --- 1. Commande /start ---
    botInstance.start(async (ctx) => {
        const userName = ctx.from.first_name || ctx.from.username || 'Utilisateur';
        const message = `Bonjour ${userName} ! Je suis le Worker Pi-Bot. Je suis là pour exécuter des tâches.`;
        console.log(`[workerPibotHandler] /start reçu de ${userName}.`);
        ctx.reply(message);
    });

    // --- 2. Commande /process_task <description> ---
    // Simule une tâche de traitement backend
    botInstance.command('process_task', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);
        const taskDescription = args.join(' ');

        if (!taskDescription) {
            return ctx.reply('Veuillez fournir une description de la tâche à traiter. Exemple: `/process_task analyser les logs`');
        }

        console.log(`[workerPibotHandler] Requête de traitement de tâche: "${taskDescription}" par ${ctx.from.username}`);
        ctx.reply(`Ok, je commence à traiter la tâche: "${taskDescription}". Cela peut prendre un moment...`);

        try {
            // Ici, vous pourriez avoir une logique complexe, appeler des APIs, etc.
            // Pour l'exemple, utilisons Groq pour "traiter" la tâche
            if (groq) {
                const response = await groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'Vous êtes un assistant IA qui traite des tâches et génère des rapports concis. Répondez comme si vous veniez de terminer une tâche.' },
                        { role: 'user', content: `Traite la tâche suivante et donne un bref compte rendu : "${taskDescription}"` }
                    ],
                    model: 'gemma2-9b-it', // Ou un autre modèle Groq adapté
                    temperature: 0.5,
                    max_tokens: 500
                });
                const aiResult = response.choices[0]?.message?.content || "Aucun résultat AI.";
                ctx.reply(`✅ Tâche "${taskDescription}" terminée !\n\n*Rapport de Traitement :*\n${aiResult}`, { parse_mode: 'Markdown' });
                console.log(`[workerPibotHandler] Tâche "${taskDescription}" traitée par Groq.`);
            } else {
                ctx.reply(`Désolé, l'IA Groq n'est pas configurée, je ne peux pas traiter la tâche: "${taskDescription}".`);
                console.warn('[workerPibotHandler] Groq non disponible pour traiter la tâche.');
            }

        } catch (error) {
            console.error(`[workerPibotHandler] Erreur lors du traitement de la tâche "${taskDescription}":`, error);
            ctx.reply(`Désolé, une erreur est survenue lors du traitement de la tâche: ${error.message}`);
        }
    });

    // --- 3. Commande /heavy_process ---
    // Déclenche une tâche "lourde" en appelant le service heavy.js
    botInstance.command('heavy_process', async (ctx) => {
        console.log(`[workerPibotHandler] Requête de tâche lourde par ${ctx.from.username}.`);
        ctx.reply('Démarrage d\'une tâche de calcul intensive. Cela peut prendre un certain temps...');

        try {
            // L'URL du service lourd est passée via les dépendances du réseau de bots
            // Assurez-vous que `server.js` expose cette URL de manière accessible au handler si elle n'est pas fixe
            // Pour l'instant, on suppose que `server.js` gère le endpoint `/api/heavy-task` qui appelle le vrai service lourd.
            // C'est le `server.js` qui devrait avoir `config.heavyServiceUrl`

            // Ici, nous appelons le endpoint du server.js qui lui-même appelle le heavy.js
            // Si le worker bot était un service REST lui-même, il pourrait appeler directement heavy.js
            // Mais dans ce setup, le bot est un client Telegraf, donc il interagit avec le backend server.js
            const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/heavy-task`); // Appel au endpoint du serveur principal

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erreur du service lourd: ${response.status} - ${errorText}`);
            }

            const result = await response.text();
            ctx.reply(`✅ Tâche lourde terminée : ${result}`);
            console.log(`[workerPibotHandler] Tâche lourde exécutée avec succès.`);

        } catch (error) {
            console.error('[workerPibotHandler] Erreur lors de l\'exécution de la tâche lourde:', error);
            ctx.reply(`❌ Une erreur est survenue lors de l'exécution de la tâche lourde: ${error.message}`);
        }
    });

    // --- 4. Commande /status ---
    // Donne le statut simple du bot
    botInstance.command('status', (ctx) => {
        console.log(`[workerPibotHandler] /status reçu de ${ctx.from.username}.`);
        ctx.reply('Je suis actif et prêt à travailler ! 💪');
    });

    // --- 5. Écouteur de messages génériques ---
    // Répond à tout message non reconnu par une commande
    botInstance.on('text', (ctx) => {
        const messageText = ctx.message.text;
        console.log(`[workerPibotHandler] Message non commandé reçu de ${ctx.from.username}: "${messageText}"`);

        if (messageText.toLowerCase().includes('hello') || messageText.toLowerCase().includes('salut')) {
            ctx.reply('Salut ! Comment puis-je t\'aider ? Essaye `/process_task <description>` ou `/heavy_process`.');
        } else {
            ctx.reply('Je ne comprends pas cette commande. Veuillez utiliser `/process_task <description>` ou `/heavy_process`.');
        }
    });

    // --- Gestion des erreurs du bot ---
    botInstance.catch((err, ctx) => {
        console.error(`[workerPibotHandler] Erreur pour ${ctx.updateType}:`, err);
        ctx.reply('Désolé, une erreur interne est survenue. Veuillez réessayer plus tard.');
    });

    console.log('[workerPibotHandler] Handler initialisé.');
}

// Exporte la fonction init pour qu'elle puisse être appelée par index.js
module.exports = {
    init
};