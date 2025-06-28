// server.js

// --- 1. Importations des modules ---
require('dotenv').config(); // Charge les variables d'environnement dès le début
const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process'); // Pour les commandes terminal
const { spawn } = require('child_process'); // Pour lancer heavy.js
const Groq = require('groq-sdk');
// CORRECTION ICI : Importation correcte de Telegraf avec déstructuration et 'T' majuscule
const { Telegraf } = require('telegraf'); 
const index  = require('./serveur_modules/telegram'); 
const neofs  = require('./serveur_modules/neoFs'); 
const cors = require('cors'); // Importation de cors

// --- 2. Configuration Initiale ---
const app = express();
const LOG_FILE = 'logs.json';
const CONFIG_FILE = path.join(__dirname, 'public', 'config.json'); // Fichier de configuration côté client

// Initialisation des logs
if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '[]', 'utf8');
}

// Initialisation de la configuration (si elle n'existe pas)
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
        telegramChatId: null,
        telegramTopicId: null,
        pollingInterval: 5000 // 5 secondes
    }, null, 2), 'utf8');
}

// Lecture initiale de la configuration pour le bot Telegram
let appConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

// Vérification et chargement du token Telegram
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN_META_PIBOT;
if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ ERREUR: Le token du bot Telegram (BOT_TOKEN_META_PIBOT) n\'est pas défini dans le fichier .env.');
    process.exit(1);
}
// CORRECTION ICI : Utilisation de Telegraf avec 'T' majuscule
const bot = new Telegraf(TELEGRAM_BOT_TOKEN); 

// Configuration principale de l'application
const config = {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development', // 'development' ou 'production'
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        model: 'gemma2-9b-it', // Modèle Groq par défaut
        temperature: 0.7,
        maxTokens: 1024,
    },
    heavyServiceUrl: `http://localhost:${process.env.HEAVY_PORT || 4000}/heavy`,
    telegram: {
        pollingInterval: appConfig.pollingInterval // Utilise la config du fichier
    }
};

// Vérification de la clé API Groq
if (!config.groq.apiKey) {
    console.error('❌ ERREUR: La clé API Groq (GROQ_API_KEY) n\'est pas définie dans le fichier .env.');
    process.exit(1);
}
const groq = new Groq({ apiKey: config.groq.apiKey });

// --- 3. Middlewares ---
app.use(cors()); // Active CORS pour toutes les requêtes (important pour le frontend)
app.use(express.json()); // Middleware pour parser le JSON dans les requêtes
app.use(express.static(path.join(__dirname, 'public'))); // Sert les fichiers statiques du dossier 'public'

// Middleware de journalisation des requêtes
app.use((req, res, next) => {
    writeLog({
        type: 'HTTP_REQUEST',
        method: req.method,
        url: req.url,
        ip: req.ip,
        timestamp: new Date()
    });
    next();
});

// --- 4. Fonctions Utilitaires ---
/**
 * Écrit une entrée dans le fichier de log.
 * @param {object} logEntry - L'objet à journaliser.
 */
function writeLog(logEntry) {
    try {
        const logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        logs.push({ ...logEntry, serverTimestamp: new Date().toISOString() });
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Erreur lors de l\'écriture du log:', error);
    }
}

/**
 * Met à jour le fichier de configuration et relance le polling Telegram si nécessaire.
 * @param {object} newConfig - Les nouvelles configurations.
 */
function updateAppConfig(newConfig) {
    try {
        const currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        const updatedConfig = { ...currentConfig, ...newConfig };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf8');
        appConfig = updatedConfig; // Met à jour la variable globale

        // Si l'intervalle de polling Telegram change, il faudrait redémarrer le polling
        // NOTE: Une gestion plus robuste impliquerait de stocker l'instance de polling
        // et de l'arrêter/redémarrer. Pour l'instant, c'est géré côté client avec une nouvelle requête.
        console.log('⚙️ Configuration mise à jour avec succès.');
        writeLog({ type: 'CONFIG_UPDATE', config: updatedConfig });
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de la configuration:', error);
        writeLog({ type: 'CONFIG_UPDATE', status: 'ERROR', errorMessage: error.message });
    }
}

// --- 5. Routes API ---

// Endpoint pour la génération de réponses AI (Groq)
app.post('/generate', async (req, res, next) => {
    const { history } = req.body; // Récupère l'historique complet du frontend

    if (!history || !Array.isArray(history) || history.length === 0) {
        writeLog({ type: 'GENERATE_AI', status: 'FAILURE', reason: 'Missing or empty history', requestBody: req.body });
        return res.status(400).json({ error: "L'historique de conversation est manquant ou vide." });
    }

    // Le dernier message de l'historique est le prompt de l'utilisateur
    const userMessage = history[history.length - 1].content;

    console.log(`\n➡️ Requête de génération AI reçue: "${userMessage.substring(0, Math.min(userMessage.length, 50))}..."`);
    writeLog({ type: 'GENERATE_AI', status: 'REQUESTED', prompt: userMessage.substring(0, Math.min(userMessage.length, 200)) + '...' });

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: history, // Utilise l'historique complet directement
            model: config.groq.model,
            temperature: config.groq.temperature,
            max_tokens: config.groq.maxTokens,
            stream: false, // Pas de streaming pour cette version simple
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content;
        if (aiResponse) {
            console.log("✅ Réponse AI générée avec succès.");
            writeLog({ type: 'GENERATE_AI', status: 'SUCCESS', response: aiResponse.substring(0, Math.min(aiResponse.length, 200)) + '...' });
            res.status(200).json({ response: aiResponse });
        } else {
            console.warn("⚠️ Groq n'a pas généré de contenu pour cette requête.");
            writeLog({ type: 'GENERATE_AI', status: 'NO_CONTENT', prompt: userMessage.substring(0, Math.min(userMessage.length, 200)) + '...' });
            res.status(500).json({ error: "Aucune réponse générée par l'IA." });
        }
    } catch (error) {
        console.error('❌ Erreur lors de la génération de la complétion de chat Groq:', error);
        writeLog({ type: 'GENERATE_AI', status: 'ERROR', errorMessage: error.message, stack: error.stack?.substring(0, 500) + '...' || 'N/A', prompt: userMessage.substring(0, Math.min(userMessage.length, 200)) + '...' });
        const err = new Error(`Échec de la génération de la réponse AI: ${error.message}`);
        err.statusCode = 500;
        next(err); // Passe l'erreur au middleware de gestion d'erreurs
    }
});

// Endpoint pour exécuter des commandes terminal
app.post('/command', (req, res, next) => {
    const { cmd } = req.body;
    console.log(`\n➡️ Commande terminal reçue: "${cmd}"`);
    writeLog({ type: 'TERMINAL_COMMAND', command: cmd });

    // Liste blanche des commandes autorisées
    const allowedCommands = ['ls -la', 'pwd', 'git status'];
    if (!allowedCommands.includes(cmd)) {
        writeLog({ type: 'TERMINAL_COMMAND', status: 'REJECTED', command: cmd, reason: 'Command not allowed' });
        const err = new Error(`Commande non autorisée: ${cmd}`);
        err.statusCode = 403; // Forbidden
        return next(err);
    }

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Erreur d'exécution de la commande: ${error.message}`);
            writeLog({ type: 'TERMINAL_COMMAND', status: 'ERROR', command: cmd, errorMessage: error.message, stderr: stderr });
            const err = new Error(`Erreur d'exécution de la commande: ${stderr || error.message}`);
            err.statusCode = 500;
            return next(err);
        }
        if (stderr) {
            console.warn(`⚠️ Erreur standard de la commande: ${stderr}`);
            writeLog({ type: 'TERMINAL_COMMAND', status: 'WARNING', command: cmd, stderr: stderr });
            return res.status(200).json({ output: stderr, isError: true }); // Envoyer stderr mais ne pas considérer comme erreur HTTP
        }
        console.log("✅ Commande exécutée avec succès.");
        writeLog({ type: 'TERMINAL_COMMAND', status: 'SUCCESS', command: cmd, output: stdout.substring(0, Math.min(stdout.length, 200)) + '...' });
        res.status(200).json({ output: stdout });
    });
});

// Endpoint pour les paramètres de l'application (frontend)
app.get('/api/config', (req, res) => {
    try {
        const currentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        res.status(200).json(currentConfig);
    } catch (error) {
        console.error('❌ Erreur lors de la lecture de la configuration:', error);
        writeLog({ type: 'READ_CONFIG', status: 'ERROR', errorMessage: error.message });
        res.status(500).json({ error: 'Erreur lors de la lecture de la configuration.' });
    }
});

app.post('/api/config', (req, res) => {
    const newConfig = req.body;
    console.log(`\n➡️ Nouvelle configuration reçue:`, newConfig);
    updateAppConfig(newConfig);
    res.status(200).json({ message: 'Configuration mise à jour avec succès.', newConfig: appConfig });
});

// --- NOUVEAU: Endpoint pour déclencher la tâche lourde ---
app.get('/api/heavy-task', async (req, res, next) => {
    console.log("➡️ Requête reçue pour déclencher la tâche lourde.");
    writeLog({ type: 'HEAVY_TASK', status: 'REQUESTED' });

    try {
        const response = await fetch(config.heavyServiceUrl); // Appel asynchrone au service lourd
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erreur HTTP depuis le service lourd: ${response.status} - ${errorText}`);
        }
        const data = await response.text();
        console.log("✅ Réponse reçue du service lourd:", data.trim());
        writeLog({ type: 'HEAVY_TASK', status: 'SUCCESS', result: data.trim() });
        res.status(200).send(data);
    } catch (error) {
        console.error('❌ Erreur lors de l\'appel au service lourd:', error.message);
        writeLog({ type: 'HEAVY_TASK', status: 'ERROR', errorMessage: error.message, stack: error.stack?.substring(0, 500) + '...' || 'N/A' });
        const err = new Error(`Échec de l'exécution de la tâche lourde: ${error.message}`);
        err.statusCode = 500;
        next(err); // Passe l'erreur au middleware de gestion d'erreurs
    }
});

// --- 6. Intégration Telegram (Polling) ---
// Note: Le polling devrait être géré par Telegraf de manière interne.
// Nous exposons ici un endpoint pour que le frontend puisse 'demander'
// les derniers messages, et le bot lui-même recevra les mises à jour.
// C'est un modèle hybride pour l'affichage côté frontend.

// Tableau pour stocker les messages reçus de Telegram et envoyés au frontend
const telegramMessagesForFrontend = [];

// Écouteur pour les messages de Telegram
bot.on('text', (ctx) => {
    const { chat, from, text, message_thread_id } = ctx.message;
    const fromUser = from.first_name || from.username || 'Inconnu';
    const messageId = ctx.message.message_id;

    console.log(`\n💬 Message Telegram reçu de ${fromUser} (Chat ID: ${chat.id}, Topic ID: ${message_thread_id || 'N/A'}): "${text}"`);
    writeLog({
        type: 'TELEGRAM_INCOMING',
        from: fromUser,
        chatId: chat.id,
        topicId: message_thread_id,
        messageId: messageId,
        content: text
    });

    // Stocke le message pour qu'il puisse être récupéré par le frontend
    telegramMessagesForFrontend.push({
        chatId: chat.id,
        topicId: message_thread_id,
        messageId: messageId,
        from: fromUser,
        content: text,
        timestamp: new Date().toISOString()
    });

    // Répondre un message simple au même topic si le message vient d'un topic
    // if (message_thread_id) {
    //     ctx.reply(`Reçu dans le topic ${message_thread_id}: "${text}"`, { message_thread_id: message_thread_id });
    // } else {
    //     ctx.reply(`Reçu: "${text}"`);
    // }
});

// Endpoint pour que le frontend récupère les messages Telegram reçus
app.get('/api/telegram/messages', (req, res) => {
    // Renvoie tous les messages stockés et vide le tableau
    res.status(200).json({ messages: telegramMessagesForFrontend });
    telegramMessagesForFrontend.length = 0; // Vide le tableau après envoi
});

// Endpoint pour que le frontend envoie un message via le bot Telegram
app.post('/api/telegram/send', async (req, res, next) => {
    const { chatId, topicId, message } = req.body;

    if (!chatId || !message) {
        writeLog({ type: 'TELEGRAM_SEND', status: 'FAILURE', reason: 'Missing chatId or message', requestBody: req.body });
        return res.status(400).json({ error: 'Le Chat ID et le message sont requis.' });
    }

    console.log(`\n📤 Envoi de message Telegram vers Chat ID: ${chatId}, Topic ID: ${topicId || 'N/A'}: "${message}"`);
    writeLog({ type: 'TELEGRAM_SEND', status: 'REQUESTED', chatId, topicId, content: message });

    try {
        const options = {};
        if (topicId) {
            options.message_thread_id = topicId;
        }
        const sentMessage = await bot.telegram.sendMessage(chatId, message, options);
        console.log("✅ Message Telegram envoyé avec succès.");
        writeLog({
            type: 'TELEGRAM_SEND',
            status: 'SUCCESS',
            chatId,
            topicId,
            content: message,
            telegramMessageId: sentMessage.message_id
        });
        res.status(200).json({ success: true, message: 'Message envoyé.', sentMessage });
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi du message Telegram:', error.message);
        writeLog({ type: 'TELEGRAM_SEND', status: 'ERROR', errorMessage: error.message, stack: error.stack?.substring(0, 500) + '...' || 'N/A', chatId, topicId, content: message });
        const err = new Error(`Échec de l'envoi du message Telegram: ${error.message}`);
        err.statusCode = 500;
        next(err); // Passe l'erreur au middleware de gestion d'erreurs
    }
});

// Lancement du polling Telegram
bot.launch()
    .then(() => console.log('🟢 Bot Telegram démarré avec le polling.'))
    .catch(err => console.error('❌ Erreur au démarrage du bot Telegram:', err));

// --- 7. Gestion des Erreurs (Middleware) ---
app.use((err, req, res, next) => {
    console.error(`\n🚨 Erreur globale: ${err.message}`);
    writeLog({
        type: 'GLOBAL_ERROR',
        status: 'ERROR',
        errorMessage: err.message,
        statusCode: err.statusCode || 500,
        stack: err.stack?.substring(0, 500) + '...' || 'N/A',
        requestUrl: req.url,
        requestMethod: req.method
    });

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? "Une erreur interne du serveur est survenue." : err.message;
    res.status(statusCode).json({ error: message });
});


// --- 8. Démarrage du Serveur ---
app.listen(config.port, () => {
    console.log(`\n--- Démarrage de l'Application Canvas IA ---`);
    console.log(`🟢 Serveur Express démarré sur http://localhost:${config.port}`);
    console.log(`Mode d'environnement: ${config.environment}`);
    console.log(`Fichier de logs: ${LOG_FILE}`);
    console.log(`Fichier de configuration: ${CONFIG_FILE}`);
    console.log(`Clé API Groq chargée: ${config.groq.apiKey ? 'Oui' : 'Non'}`);
    console.log(`Token Telegram chargé: ${TELEGRAM_BOT_TOKEN ? 'Oui' : 'Non'}`);

    console.log(`\n--- Points d'API Frontend ---`);
    console.log(`  GET /                  (Application Web)` );
    console.log(`  POST /generate         (Génération de texte IA via Groq)`);
    console.log(`  POST /command          (Exécution de commandes terminal)`);
    console.log(`  GET /api/config        (Récupérer la configuration)` );
    console.log(`  POST /api/config       (Mettre à jour la configuration)` );
    console.log(`  GET /api/heavy-task    (Déclencher une tâche lourde asynchrone)`);

    console.log(`\n--- Points d'API Telegram ---`);
    console.log(`  GET /api/telegram/messages (Récupérer les messages Telegram)` );
    console.log(`  POST /api/telegram/send    (Envoyer un message Telegram)`);

    // Pour lancer le service lourd en parallèle avec server.js si en développement
    if (config.environment === 'development') {
        const heavyPort = process.env.HEAVY_PORT || 4000;
        console.log(`\n--- Lancement automatique du service lourd (mode dev) ---`);
        console.log(`Tentative de lancement de heavy.js sur le port ${heavyPort}...`);

        const heavyProcess = spawn('node', [path.join(__dirname, 'heavy.js')], {
            env: { ...process.env, HEAVY_PORT: heavyPort },
            stdio: 'inherit' // Permet de voir les logs de heavy.js dans le même terminal
        });

        heavyProcess.on('error', (err) => {
            console.error('❌ Échec du démarrage du processus heavy.js:', err);
            writeLog({ type: 'HEAVY_SERVICE_LAUNCH', status: 'ERROR', errorMessage: err.message });
        });
        heavyProcess.on('exit', (code) => {
            console.warn(`⚠️ Le processus heavy.js s'est terminé avec le code ${code}`);
            writeLog({ type: 'HEAVY_SERVICE_LAUNCH', status: 'EXITED', exitCode: code });
        });
        console.log(`Processus heavy.js sponné (PID: ${heavyProcess.pid}).`);
    }

    console.log(`\nPrêt à interagir!`);
});

// Gère l'arrêt propre du bot Telegram en cas de SIGINT (Ctrl+C) ou SIGTERM
process.once('SIGINT', () => {
    console.log('\n🛑 Arrêt du bot Telegram...');
    bot.stop('SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    console.log('\n🛑 Arrêt du bot Telegram...');
    bot.stop('SIGTERM');
    process.exit(0);
});