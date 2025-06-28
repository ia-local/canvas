// index.js (VERSION FONCTIONNELLE ET DIAGNOSTIQUE MAXIMALE)
require('dotenv').config();

const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// --- Initialisation des clients AI ---
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

// --- Configuration Centralisée des Bots ---
const botConfigs = {
    // 1. Bot Principal AI / AGI (ACTIF)
   // 'Pi_bot': { // <-- TRÈS IMPORTANT : REMPLACEZ 'Pi_bot' par l'@username RÉEL de votre bot principal
   //     token: process.env.BOT_TOKEN_MAIN_PIBOT,
   //     handler: require('./bots/mainPibotHandler'),
   //     groqInstance: groq,
   //     openaiInstance: openai,
   //     geminiInstance: genAI,
   // },
  // 2. Worker Bot (ACTIF)
   // 'worker_Pibot': { // <-- TRÈS IMPORTANT : REMPLACEZ 'worker_Pibot' par l'@username RÉEL de votre worker bot
   //     token: process.env.BOT_TOKEN_WORKER_PIBOT,
   //     handler: require('./bots/workerPibotHandler'),
   //     groqInstance: groq, // Passons Groq au worker bot
   //     // Ajoutez d'autres instances AI si ce bot en a besoin
   // },
    //// 3. NeoFS Bot (TOUJOURS COMMENTÉ POUR LE MOMENT)
     'neofs_Pibot': {
         token: process.env.BOT_TOKEN_NEOFS_PIBOT,
         handler: require('./bots/neofsPibotHandler'),
         groqInstance: groq,
     },
    // 4. Pi-IA Bot (TOUJOURS COMMENTÉ POUR LE MOMENT)
    // 'Pi_ia_bot': {
    //     token: process.env.BOT_TOKEN_PI_IA_BOT,
    //     handler: require('./bots/piIaBotHandler'),
    //     openaiInstance: openai,
    // },
};

// --- Réseau de Coordination Multi-Bot ---
const botsNetwork = {
    workerPibot: {
        processBackend: async (task) => {
            console.log("Simulating backend task processing in @worker_Pibot:", task);
            if (bots['worker_Pibot']) {
                return `@worker_Pibot a exécuté la tâche backend: ${task}`;
            } else {
                return `Erreur: @worker_Pibot n'est pas lancé pour traiter la tâche: ${task}`;
            }
        }
    },
    neofsPibot: {
        processFrontend: async (uiTask) => {
            console.log("Simulating UI/UX task processing in @neofs_Pibot:", uiTask);
            return `@neofs_Pibot a généré une nouvelle interface pour la tâche: ${uiTask}`;
        }
    },
    piIaBot: {
        processVisualAnalysis: async (input) => {
            console.log("Simulating visual analysis in @Pi_ia_bot:", input);
            return `@Pi_ia_bot a analysé l'image et voici le résultat : Placeholder for image URL for: ${input}`;
        }
    },
};

const bots = {}; // Cet objet stockera les instances actives de Telegraf pour chaque bot.

async function setupBots() {
    console.log("Démarrage du processus de configuration des bots...");

    // Les bots que nous voulons lancer maintenant
    const activeBotUsernames = ['neofs_Pibot']; // Active les deux bots

    for (const username of activeBotUsernames) {
        const config = botConfigs[username];

        if (!config) {
            console.error(`Erreur : Configuration introuvable pour le bot ${username}. Veuillez vérifier botConfigs.`);
            continue;
        }

        if (!config.token) {
            console.error(`Erreur : Le token du bot est introuvable pour @${username}. Veuillez vérifier votre fichier .env.`);
            continue;
        }

        try {
            const botInstance = new Telegraf(config.token, {
                telegram: {
                    webhookReply: true,
                },
            });

            const handlerDependencies = {
                groq: config.groqInstance || groq,
                openai: config.openaiInstance || openai,
                gemini: config.geminiInstance || genAI,
                fs: fs,
                path: path,
                botsNetwork: botsNetwork,
            };

            if (typeof config.handler.init === 'function') {
                config.handler.init(botInstance, handlerDependencies);
                bots[username] = botInstance;
                console.log(`Bot @${username} initialisé avec succès.`);
            } else {
                console.error(`Erreur : Le handler pour @${username} n'exporte pas de fonction 'init'. Vérifiez bots/${username}Handler.js.`);
            }

        } catch (error) {
            console.error(`Échec de l'initialisation du bot @${username}:`, error.message);
        }
    }

    // --- Lancement de tous les bots actifs via Long Polling ---
    console.log(`Tentative de lancement des bots actifs via Long Polling...`);
    for (const username of activeBotUsernames) { // Boucle sur les bots actifs
        if (bots[username]) { // S'assurer que le bot a été initialisé
            console.log(`Préparation au lancement du bot @${username}...`); // NOUVEAU LOG D'ÉTAT
            try {
                // Exécution et log du lancement dans un bloc isolé pour plus de clarté
                await (async () => {
                    await bots[username].launch();
                    console.log(`Bot @${username} lancé AVEC SUCCÈS.`); // NOUVEAU LOG DE SUCCÈS
                })();
                console.log(`Poursuite du processus après le lancement du bot @${username}.`); // NOUVEAU LOG POUR SUIVRE LE FLUX
            } catch (launchError) {
                console.error(`ÉCHEC du lancement du bot @${username}:`, launchError.message); // NOUVEAU LOG D'ÉCHEC EXPLICITE
            }
        } else {
            console.warn(`AVERTISSEMENT: Bot @${username} n'a pas été trouvé dans l'objet 'bots'. Il n'a pas été initialisé correctement.`); // NOUVEAU LOG D'AVERTISSEMENT
        }
    }

    console.log(`Configuration des bots terminée. Serveur prêt ! ✨`);
}

setupBots();

// --- Arrêt Propre (version robuste) ---
process.once('SIGINT', () => {
    console.log('\nRéception de SIGINT. Arrêt de tous les bots...');
    Object.values(bots).forEach(botInstance => {
        if (botInstance && typeof botInstance.stop === 'function') {
            try {
                botInstance.stop('SIGINT');
            } catch (e) {
                console.error(`Erreur lors de l'arrêt d'un bot: ${e.message}`);
            }
        }
    });
    console.log('Tous les bots arrêtés proprement.');
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log('\nRéception de SIGTERM. Arrêt de tous les bots...');
    Object.values(bots).forEach(botInstance => {
        if (botInstance && typeof botInstance.stop === 'function') {
            try {
                botInstance.stop('SIGTERM');
            } catch (e) {
                console.error(`Erreur lors de l'arrêt d'un bot: ${e.message}`);
            }
        }
    });
    console.log('Tous les bots arrêtés proprement.');
    process.exit(0);
});