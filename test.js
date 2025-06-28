// server.js

// --- Importations des modules requis ---
const express = require('express');
const Groq = require('groq-sdk');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { exec } = require('child_process');
const { Telegraf } = require('telegraf');
const { Worker } = require('worker_threads'); // <-- NOUVEAU
// Load environment variables from .env file
require('dotenv').config();

// --- Server and AI Configuration ---
const config = {
  port: process.env.PORT || 3000,
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama3-8b-8192',
    temperature: 0.7,
    maxTokens: 2048,
  },
  ai: {
    role: "Un assistant IA expert en développement et en conseil technique.",
    context: "Fournir des réponses précises, concises et utiles sur des sujets de programmation, d'architecture logicielle et de technologies web. Votre logique métier est d'être un conseiller technique fiable.",
  },
  logFilePath: path.join(__dirname, 'logs.json'),
  configFilePath: path.join(__dirname, 'public', 'config.json'), // <-- NOUVEAU: Chemin vers config.json
  authorizedCommands: [
    'ls -la',
    'pwd',
    'git status',
  ],
  environment: process.env.NODE_ENV || 'development',
  telegram: {
    botTokenMetaPibot: process.env.BOT_TOKEN_META_PIBOT,
    botUsernameMetaPibot: 'meta_Pibot',
    // chatId sera lu depuis config.json
  },
};

// Validate Groq API Key
if (!config.groq.apiKey) {
  console.error("❌ Erreur: La clé API Groq (GROQ_API_KEY) n'est pas configurée dans les variables d'environnement.");
  console.error("Veuillez créer un fichier .env à la racine de votre projet avec GROQ_API_KEY=votre_clé_ici");
  process.exit(1);
}

const groq = new Groq({ apiKey: config.groq.apiKey });
const app = express();

// --- NOUVEAU: Endpoint pour déclencher la tâche lourde avec Worker Threads ---
app.get('/api/heavy-task', async (req, res, next) => {
    console.log("➡️ Requête reçue pour déclencher la tâche lourde via Worker Thread.");
    writeLog({ type: 'HEAVY_TASK', status: 'REQUESTED_WORKER' });

    try {
        const worker = new Worker('./heavy-worker.js'); // Crée un nouveau thread worker

        worker.on('message', (msg) => {
            if (msg.type === 'heavyTaskComplete') {
                console.log("✅ Réponse reçue du Worker Thread:", msg.result.trim());
                writeLog({ type: 'HEAVY_TASK', status: 'SUCCESS_WORKER', result: msg.result.trim() });
                res.status(200).send(msg.result);
            }
        });

        worker.on('error', (err) => {
            console.error('❌ Erreur dans le Worker Thread:', err);
            writeLog({ type: 'HEAVY_TASK', status: 'ERROR_WORKER', errorMessage: err.message, stack: err.stack?.substring(0, 500) + '...' || 'N/A' });
            const error = new Error(`Erreur lors de l'exécution de la tâche lourde dans le worker: ${err.message}`);
            error.statusCode = 500;
            next(error);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker stopped with exit code ${code}`);
            }
        });

        worker.postMessage({ type: 'startHeavyTask' }); // Envoie un message au worker pour démarrer la tâche

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du Worker Thread:', error.message);
        writeLog({ type: 'HEAVY_TASK', status: 'INIT_ERROR_WORKER', errorMessage: error.message, stack: error.stack?.substring(0, 500) + '...' || 'N/A' });
        const err = new Error(`Impossible de démarrer le worker thread: ${error.message}`);
        err.statusCode = 500;
        next(err);
    }
});

let interactions = [];

// --- NOUVEAU: Chargement initial de config.json ---
let appConfig = {}; // Cette variable tiendra la configuration modifiable
const loadAppConfig = () => {
    if (!fs.existsSync(config.configFilePath)) {
        console.warn(`⚠️ Fichier de configuration (${config.configFilePath}) non trouvé. Création avec des valeurs par défaut.`);
        const defaultConfig = {
            telegram: {
                chatIdMetaPibot: '', // Sera rempli par l'utilisateur
                topicIds: { // Exemple de structure pour les topics
                    general: '',
                    support: '',
                    development: ''
                }
            },
            // Autres paramètres par défaut
            debugMode: false,
            pollingRateMs: 2000
        };
        fs.writeFileSync(config.configFilePath, JSON.stringify(defaultConfig, null, 2));
        appConfig = defaultConfig;
    } else {
        try {
            appConfig = JSON.parse(fs.readFileSync(config.configFilePath, 'utf8'));
            console.log(`✅ Fichier de configuration (${config.configFilePath}) chargé avec succès.`);
        } catch (parseError) {
            console.error(`❌ Erreur lors du parsing de config.json:`, parseError.message);
            console.error(`Veuillez vérifier la validité de votre fichier ${config.configFilePath}.`);
            process.exit(1);
        }
    }
};
loadAppConfig(); // Charger la config au démarrage du serveur

// --- Logging Setup (inchangé) ---
const writeLog = (logEntry) => {
  const timestamp = new Date().toISOString();
  const log = { timestamp, ...logEntry };

  fs.readFile(config.logFilePath, (err, data) => {
    let logs = [];
    if (!err) {
      try {
        logs = JSON.parse(data.toString());
      } catch (parseError) {
        console.error("❌ Erreur de parsing du fichier de log existant:", parseError.message);
        logs = [];
      }
    }
    logs.push(log);
    fs.writeFile(config.logFilePath, JSON.stringify(logs, null, 2), (writeErr) => {
      if (writeErr) {
        console.error("❌ Erreur lors de l'écriture du log dans le fichier:", writeErr.message);
      }
    });
  });
};

if (!fs.existsSync(config.logFilePath)) {
  fs.writeFileSync(config.logFilePath, JSON.stringify([]));
  console.log(`➡️ Fichier de log créé: ${config.logFilePath}`);
} else {
  fs.readFile(config.logFilePath, (err, data) => {
    if (!err) {
      try {
        JSON.parse(data.toString());
      } catch (parseError) {
        console.error(`⚠️ Fichier de log existant corrompu (${config.logFilePath}). Réinitialisation.`);
        fs.writeFileSync(config.logFilePath, JSON.stringify([]));
      }
    }
  });
}
console.log(`➡️ Les interactions seront loggées dans : ${config.logFilePath}`);


// --- NOUVEAU: Configuration et logique du bot Telegram 'meta_Pibot' ---
let metaBot = null;
let telegramConversationLog = [];
let frontendToTelegramResponseLog = [];

if (!config.telegram.botTokenMetaPibot) {
    console.warn("⚠️ Avertissement: Le token du bot Telegram (BOT_TOKEN_META_PIBOT) n'est pas configuré. Le bot Telegram ne sera pas lancé.");
} else {
    metaBot = new Telegraf(config.telegram.botTokenMetaPibot, {
        telegram: {
            webhookReply: true,
        },
    });

    metaBot.use((ctx, next) => {
        if (ctx.message) {
            telegramConversationLog.push({
                user: ctx.message.from.username || ctx.message.from.first_name || 'Inconnu',
                message: ctx.message.text,
                timestamp: new Date(),
                from: 'Telegram',
                chatId: ctx.chat.id, // Ajout du chatId ici
                topicId: ctx.message.message_thread_id // Ajout du topicId (pour les topics)
            });
            console.log(`[Telegram] Message de ${ctx.message.from.username || 'Inconnu'} (ChatID: ${ctx.chat.id}${ctx.message.message_thread_id ? `, TopicID: ${ctx.message.message_thread_id}` : ''}): ${ctx.message.text.substring(0, 50)}...`);
        }
        return next();
    });

    metaBot.start((ctx) => {
        const chatId = ctx.chat.id;
        const topicId = ctx.message.message_thread_id;
        let replyMessage = 'Bienvenue dans notre salon Telegram dédié à l\'apprentissage automatique et à l\'intelligence artificielle Gemini_Pibot !';
        replyMessage += `\nVotre Chat ID est: \`${chatId}\``;
        if (topicId) {
            replyMessage += `\nCe Topic ID est: \`${topicId}\``;
        }
        replyMessage += `\nVeuillez noter ces IDs pour les configurer dans l'interface frontend si nécessaire.`;
        ctx.reply(replyMessage);
        // Vous pouvez aussi loguer ces IDs quelque part, ou les sauvegarder dans appConfig
    });

    metaBot.help((ctx) => {
        const helpMessage = `
        Commandes disponibles:
        /start - Initialisation du serveur et affichage des IDs.
        /help - Affiche cette aide
        /invite - Invitation sur les réseaux
        /campagne - Campagne de machine learning
        /dev - Mode développement
        /googleDev - Mode développement google
        /conversation_log - Historique des conversations
        `;
        ctx.reply(helpMessage);
    });

    metaBot.command('conversation_log', (ctx) => {
        const currentChatId = ctx.chat.id;
        const currentTopicId = ctx.message.message_thread_id;

        const filteredLog = telegramConversationLog.filter(entry =>
            entry.chatId === currentChatId &&
            (currentTopicId ? entry.topicId === currentTopicId : !entry.topicId)
        );

        if (filteredLog.length === 0) {
            ctx.reply('Aucune conversation enregistrée pour ce chat/topic.');
            return;
        }

        let logMessage = 'Bilan de la conversation (Telegram):\n';
        filteredLog.forEach(entry => {
            logMessage += `[${entry.timestamp.toLocaleString()}] ${entry.user}: ${entry.message}\n`;
        });
        ctx.reply(logMessage);
    });

    metaBot.command('test', (ctx) => ctx.reply("/mode ✨ test > OP ✨"));

    metaBot.command('Worker', (ctx) => ctx.reply("/Workers"));

    metaBot.command('network', async (ctx) => {
        const task = ctx.message.text.split(' ').slice(1).join(' ');
        if (!task) {
            ctx.reply("Veuillez fournir une tâche pour coordonner le réseau de bots.");
            return;
        }
        ctx.reply("Coordination du réseau de bots en cours...");
        ctx.reply("La coordination des WebWorkers est désactivée dans cette version.");
    });

    metaBot.command('campagne', (ctx) => {
        ctx.reply('Match in Learning..');
    });

    const run = `
    *Role*: Assistant
    *Description*: Lorsque j'exécute la commande /run, je coordonne l'intelligence collective de notre réseau neuronal de bots, accélérant et optimisant la communication entre eux pour une meilleure efficacité de tâches. Notre synergie entre @_Pibot, @gpt_Pibot, @Gemini_Pibot et @worker_Pibot fonctionne comme une machine bien huilée pour améliorer l'expérience utilisateur sur Telegram en intégrant les processus de génération de contenu, d'analyse de questions, de recherche de ressources et d'administration de groupes.

    Nous utilisons les bibliothèques JavaScript telles que Keras.js et TensorFlow.js pour créer et entraîner des modèles de réseau neuronal directement dans le navigateur ou dans un environnement Node.js. Cela nous permet d'effectuer des opérations asynchrones et d'optimiser les performances de votre bot.

    Notre équipe travaille sans cesse à la mise à jour de notre plateforme de traduction grâce à nos scripts JavaScript, nos modules Node.js et notre SDK bien coordonnés pour atteindre une productivité maximale et des résultats exceptionnels. Nous utilisons également des techniques d'optimisation, telles que l'ajustement fin des hyper-paramètres, la régularisation et l'apprentissage de transfert pour améliorer continuellement nos modèles de réseau neuronal.
    `;

    metaBot.on('message', async (ctx) => {
        const messageText = ctx.message.text ? ctx.message.text.trim() : '';

        if (messageText.startsWith('/rm') || messageText.startsWith('/')) {
            return;
        }

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: `groq -R > ${run}.` },
                    { role: 'assistant', content: `bonjour, nous sommes en face de configuration du system Web, veuillez continuer la conversation normalement sur Telegram` },
                    { role: 'user', content: messageText },
                ],
                model: 'gemma2-9b-it',
            });

            const aiResponse = chatCompletion.choices[0]?.message?.content;
            if (aiResponse) {
                // Si c'est un topic, envoyer la réponse dans le même topic
                const replyOptions = ctx.message.message_thread_id ? { message_thread_id: ctx.message.message_thread_id } : {};
                await ctx.reply(aiResponse, replyOptions);

                frontendToTelegramResponseLog.push({
                    role: 'ai',
                    content: aiResponse,
                    timestamp: new Date(),
                    from: 'Telegram_AI_Response',
                    chatId: ctx.chat.id,
                    topicId: ctx.message.message_thread_id, // Important pour le frontend
                    messageId: ctx.message.message_id
                });
                console.log(`[Telegram AI] Réponse envoyée à ${ctx.from.username || 'Inconnu'} (ChatID: ${ctx.chat.id}${ctx.message.message_thread_id ? `, TopicID: ${ctx.message.message_thread_id}` : ''}): ${aiResponse.substring(0, 50)}...`);
            } else {
                console.warn("[Telegram AI] Groq n'a pas généré de contenu pour cette requête Telegram.");
                await ctx.reply("Désolé, je n'ai pas pu générer de réponse pour le moment.");
            }
        } catch (error) {
            console.error('❌ Erreur lors de la génération de la complétion de chat Groq pour Telegram:', error);
            await ctx.reply('Une erreur est survenue lors du traitement de votre message.');
        }
    });
} // Fin du bloc if (config.telegram.botTokenMetaPibot)


// --- Middleware Setup (inchangé) ---
app.use(cors());
app.use(express.json());

// --- Static Files Serving (inchangé) ---
app.use(express.static(path.join(__dirname, 'public')));
console.log(`➡️ Service des fichiers statiques depuis : ${path.join(__dirname, 'public')}`);

// --- API Endpoints ---

// Endpoint pour la génération de réponses AI (Groq) (inchangé)
// Endpoint pour la génération de réponses AI (Groq)
app.post('/generate', async (req, res, next) => {
    const { history, systemMessage } = req.body; // Récupère l'historique et le message système du frontend

    if (!history || !Array.isArray(history) || history.length === 0) {
        writeLog({ type: 'GENERATE_AI', status: 'FAILURE', reason: 'Missing or empty history', requestBody: req.body });
        return res.status(400).json({ error: "L'historique de conversation est manquant ou vide." });
    }

    // Le dernier message de l'historique est le prompt de l'utilisateur
    const userMessage = history[history.length - 1].content;

    console.log(`\n➡️ Requête de génération AI reçue: "${userMessage.substring(0, 50)}..."`);
    writeLog({ type: 'GENERATE_AI', status: 'REQUESTED', prompt: userMessage.substring(0, 200) + '...' });

    try {
        const chatCompletion = await groq.chat.completions.create({
            // Utilise l'historique directement
            messages: history, // <-- Utilisez l'historique complet envoyé par le frontend
            model: config.groq.model,
            temperature: config.groq.temperature,
            max_tokens: config.groq.maxTokens,
            stream: false,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content;
        if (aiResponse) {
            console.log("✅ Réponse AI générée avec succès.");
            writeLog({ type: 'GENERATE_AI', status: 'SUCCESS', response: aiResponse.substring(0, 200) + '...' });
            res.status(200).json({ response: aiResponse });
        } else {
            console.warn("⚠️ Groq n'a pas généré de contenu pour cette requête.");
            writeLog({ type: 'GENERATE_AI', status: 'NO_CONTENT', prompt: userMessage.substring(0, 200) + '...' });
            res.status(500).json({ error: "Aucune réponse générée par l'IA." });
        }
    } catch (error) {
        console.error('❌ Erreur lors de la génération de la complétion de chat Groq:', error);
        writeLog({ type: 'GENERATE_AI', status: 'ERROR', errorMessage: error.message, stack: error.stack?.substring(0, 500) + '...' || 'N/A', prompt: userMessage.substring(0, 200) + '...' });
        const err = new Error(`Échec de la génération de la réponse AI: ${error.message}`);
        err.statusCode = 500;
        next(err);
    }
});

// CRUD Endpoints (inchangé)
app.get('/api/interactions', (req, res) => { /* ... */ });
app.get('/api/interactions/:id', (req, res, next) => { /* ... */ });
app.put('/api/interactions/:id', (req, res, next) => { /* ... */ });
app.delete('/api/interactions/:id', (req, res, next) => { /* ... */ });
app.post('/command', (req, res, next) => { /* ... */ });


// --- NOUVEAU: Endpoints pour l'intégration Telegram (avec topicId) ---
app.post('/api/telegram/send', async (req, res, next) => {
    const { message, chatId, topicId } = req.body; // <-- AJOUT DE topicId

    if (!message || !chatId) {
        writeLog({ type: 'TELEGRAM_SEND', status: 'FAILURE', reason: 'Missing message or chatId', requestBody: req.body });
        return res.status(400).json({ error: "Missing message or chatId in request body." });
    }

    if (!metaBot) {
        writeLog({ type: 'TELEGRAM_SEND', status: 'FAILURE', reason: 'Telegram bot not initialized', message, chatId, topicId });
        return res.status(503).json({ error: "Telegram bot is not initialized. Check BOT_TOKEN_META_PIBOT." });
    }

    console.log(`\n➡️ Requête d'envoi Telegram reçue pour chat ID ${chatId}${topicId ? `, Topic ID ${topicId}` : ''}: "${message.substring(0, 50)}..."`);
    writeLog({ type: 'TELEGRAM_SEND', status: 'REQUESTED', message: message.substring(0, 200) + '...', chatId, topicId });

    try {
        const telegramResponse = await metaBot.telegram.sendMessage(chatId, message, {
            message_thread_id: topicId // Utilise topicId si fourni
        });

        frontendToTelegramResponseLog.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            from: 'Frontend_Sent',
            chatId: chatId,
            topicId: topicId // Inclure le topicId
        });

        console.log("✅ Message envoyé à Telegram avec succès.");
        writeLog({ type: 'TELEGRAM_SEND', status: 'SUCCESS', message: message.substring(0, 200) + '...', chatId, topicId });
        res.status(200).json({ success: true, telegramResponse });

    } catch (error) {
        console.error(`❌ Erreur lors de l'envoi du message via Telegram bot:`, error.message);
        writeLog({ type: 'TELEGRAM_SEND', status: 'ERROR', errorMessage: error.message, stack: error.stack?.substring(0, 500) + '...' || 'N/A', message: message.substring(0, 200) + '...', chatId, topicId });
        const err = new Error(`Échec de l'envoi du message Telegram: ${error.message}`);
        err.statusCode = 500;
        next(err);
    }
});

app.get('/api/telegram/get_responses', (req, res) => {
    console.log(`\n➡️ Requête de récupération des réponses Telegram reçue.`);
    const responsesToSend = [...frontendToTelegramResponseLog];
    frontendToTelegramResponseLog = [];
    writeLog({ type: 'TELEGRAM_GET_RESPONSES', status: 'SUCCESS', count: responsesToSend.length });
    res.status(200).json({ messages: responsesToSend });
});
// --- FIN des endpoints Telegram ---

// --- NOUVEAU: Endpoints pour la gestion de la configuration ---
app.get('/api/config', (req, res) => {
    console.log(`\n➡️ Requête de récupération de la configuration reçue.`);
    writeLog({ type: 'CONFIG_READ', status: 'SUCCESS' });
    res.status(200).json(appConfig);
});

app.post('/api/config', (req, res, next) => {
    const newConfig = req.body;
    console.log(`\n➡️ Requête de mise à jour de la configuration reçue.`);
    writeLog({ type: 'CONFIG_UPDATE', status: 'REQUESTED', newConfig: newConfig });

    // Validation simple (peut être étendue)
    if (!newConfig || typeof newConfig !== 'object') {
        const error = new Error("Corps de requête invalide pour la configuration.");
        error.statusCode = 400;
        return next(error);
    }

    // Fusionner la nouvelle configuration avec l'existante
    // Utilisez un module comme 'lodash.merge' pour une fusion profonde si nécessaire
    // Pour l'instant, faisons une fusion superficielle
    Object.assign(appConfig, newConfig);

    fs.writeFile(config.configFilePath, JSON.stringify(appConfig, null, 2), (err) => {
        if (err) {
            console.error(`❌ Erreur lors de l'écriture du fichier de configuration:`, err.message);
            writeLog({ type: 'CONFIG_UPDATE', status: 'ERROR', errorMessage: err.message, newConfig: newConfig });
            const error = new Error("Erreur lors de la sauvegarde de la configuration.");
            error.statusCode = 500;
            return next(error);
        }
        console.log(`✅ Fichier de configuration (${config.configFilePath}) mis à jour avec succès.`);
        writeLog({ type: 'CONFIG_UPDATE', status: 'SUCCESS', updatedConfig: appConfig });
        res.status(200).json({ success: true, message: 'Configuration mise à jour.', config: appConfig });
    });
});
// --- FIN des endpoints de configuration ---

// --- Middleware de gestion des erreurs global (inchangé) ---
app.use((err, req, res, next) => { /* ... */ });

// --- Gestion des erreurs non attrapées (inchangé) ---
process.on('unhandledRejection', (reason, promise) => { /* ... */ });
process.on('uncaughtException', (err) => { /* ... */ });


// --- Server Initialization ---
app.listen(config.port, () => {
  console.log(`\n🚀 Serveur Groq Express démarré sur http://localhost:${config.port}`);
  console.log(`Accédez au frontend via : http://localhost:${config.port}/`);
  console.log(`Points d'API pour la génération : POST http://localhost:${config.port}/generate`);
  console.log(`Points d'API CRUD pour les interactions :`);
  console.log(`  GET /api/interactions          (Lire toutes)`);
  console.log(`  GET /api/interactions/:id      (Lire par ID)`);
  console.log(`  PUT /api/interactions/:id      (Mettre à jour)`);
  console.log(`  DELETE /api/interactions/:id   (Supprimer)`);
  console.log(`  POST /command                  (Exécuter une commande système)`);
  console.log(`--- Points d'API Telegram ---`);
  console.log(`  POST /api/telegram/send        (Envoyer un message au bot Telegram)`);
  console.log(`  GET /api/telegram/get_responses (Récupérer les réponses du bot Telegram)`);
  console.log(`--- Points d'API Configuration ---`); // <-- NOUVEAU
  console.log(`  GET /api/config                (Lire la configuration)`);
  console.log(`  POST /api/config               (Mettre à jour la configuration)`);

  console.log(`Clé API Groq chargée: ${config.groq.apiKey ? 'Oui' : 'Non (vérifier votre .env)'}`);
  console.log(`Mode d'environnement: ${config.environment.toUpperCase()}`);

  if (metaBot) {
    metaBot.launch()
      .then(() => {
        console.log(`✅ Bot Telegram @${config.telegram.botUsernameMetaPibot} lancé AVEC SUCCÈS.`);
      })
      .catch((launchError) => {
        console.error(`❌ ÉCHEC du lancement du bot Telegram @${config.telegram.botUsernameMetaPibot}:`, launchError.message);
      });

    process.once('SIGINT', () => {
        console.log('\nRéception de SIGINT. Arrêt du bot Telegram...');
        if (metaBot && typeof metaBot.stop === 'function') metaBot.stop('SIGINT');
    });
    process.once('SIGTERM', () => {
        console.log('\nRéception de SIGTERM. Arrêt du bot Telegram...');
        if (metaBot && typeof metaBot.stop === 'function') metaBot.stop('SIGTERM');
    });
  } else {
    console.warn("⚠️ Bot Telegram non lancé car BOT_TOKEN_META_PIBOT n'est pas configuré.");
  }
});