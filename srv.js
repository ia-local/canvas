// --- Importations des modules requis ---
const express = require('express');
const Groq = require('groq-sdk');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { exec } = require('child_process');

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
  authorizedCommands: [
    'ls -la',
    'pwd',
    'git status',
  ],
  // Nouveau: Environnement d'exécution (développement ou production)
  // Utilise NODE_ENV si défini, sinon 'development' par défaut
  environment: process.env.NODE_ENV || 'development'
};

// Validate Groq API Key
if (!config.groq.apiKey) {
  console.error("❌ Erreur: La clé API Groq (GROQ_API_KEY) n'est pas configurée dans les variables d'environnement.");
  console.error("Veuillez créer un fichier .env à la racine de votre projet avec GROQ_API_KEY=votre_clé_ici");
  process.exit(1);
}

const groq = new Groq({ apiKey: config.groq.apiKey });
const app = express();

let interactions = [];

// --- Logging Setup ---
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


// --- Middleware Setup ---
app.use(cors());
app.use(express.json());

// --- Static Files Serving ---
app.use(express.static(path.join(__dirname, 'public')));
console.log(`➡️ Service des fichiers statiques depuis : ${path.join(__dirname, 'public')}`);

// --- API Endpoints ---

app.post('/generate', async (req, res, next) => {
  // Récupère le prompt, l'historique et le message système du corps de la requête
  const { prompt: userPrompt, history: conversationHistory, systemMessage: customSystemMessage } = req.body;

  if (!userPrompt) {
    writeLog({ type: 'AI_INTERACTION', status: 'FAILURE', reason: 'Missing prompt', userPrompt: userPrompt });
    return res.status(400).json({ error: "Le champ 'prompt' est manquant dans le corps de la requête." });
  }

  console.log(`\n➡️ Requête AI reçue pour le prompt: "${userPrompt.substring(0, Math.min(userPrompt.length, 50))}..."`);
  writeLog({ type: 'AI_INTERACTION', status: 'REQUESTED', userPrompt: userPrompt.substring(0, 200) + '...' });

  try {
    // Utilise le message système personnalisé si fourni, sinon le message système par défaut
    const finalSystemMessage = customSystemMessage || `Vous êtes ${config.ai.role}. Votre rôle est de ${config.ai.context}.`;

    // Construit les messages pour l'API Groq
    const messages = [
        { role: 'system', content: finalSystemMessage }
    ];

    // Ajoute l'historique de la conversation (s'il existe) avant le prompt actuel
    if (conversationHistory && Array.isArray(conversationHistory)) {
        messages.push(...conversationHistory);
    }

    // Ajoute le prompt de l'utilisateur actuel
    messages.push({ role: 'user', content: userPrompt });

    // Appel à l'API Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: messages, // Utilise l'historique complet et le message système
      model: config.groq.model,
      temperature: config.groq.temperature,
      max_tokens: config.groq.maxTokens,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;

    if (aiResponse) {
      const newInteraction = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userPrompt: userPrompt,
        aiResponse: aiResponse,
        // Optionnel: stocker le rôle et l'historique pour une persistance plus riche
        aiRole: customSystemMessage,
        conversationHistory: conversationHistory
      };
      interactions.push(newInteraction);

      console.log("✅ Réponse de l'IA générée et interaction stockée avec succès.");
      writeLog({ type: 'AI_INTERACTION', status: 'SUCCESS', interactionId: newInteraction.id, userPrompt: newInteraction.userPrompt.substring(0, 200) + '...', aiResponse: newInteraction.aiResponse.substring(0, 200) + '...' });
      res.status(200).json({
        response: aiResponse,
        interactionId: newInteraction.id
      });
    } else {
      console.warn("⚠️ Groq n'a pas généré de contenu pour cette requête.");
      writeLog({ type: 'AI_INTERACTION', status: 'FAILURE', reason: 'No content from AI', userPrompt: userPrompt.substring(0, 200) + '...' });
      const error = new Error("L'IA n'a pas pu générer de réponse.");
      error.statusCode = 500;
      next(error);
    }

  } catch (error) {
    console.error("❌ Erreur lors de l'appel à l'API Groq ou du stockage de l'interaction:", error);
    writeLog({ type: 'AI_INTERACTION', status: 'ERROR', errorMessage: error.message, stack: error.stack?.substring(0, 500) + '...' || 'N/A', userPrompt: userPrompt.substring(0, 200) + '...' });
    error.statusCode = error.statusCode || 500;
    next(error);
  }
});

app.get('/api/interactions', (req, res) => {
    console.log(`\n➡️ Requête reçue : Lire toutes les interactions.`);
    writeLog({ type: 'CRUD_READ_ALL', status: 'SUCCESS', count: interactions.length });
    res.status(200).json(interactions);
});

app.get('/api/interactions/:id', (req, res, next) => { // Ajout de 'next'
    const { id } = req.params;
    console.log(`\n➡️ Requête reçue : Lire l'interaction avec l'ID ${id}.`);
    const interaction = interactions.find(int => int.id === id);

    if (interaction) {
        writeLog({ type: 'CRUD_READ_ONE', status: 'SUCCESS', interactionId: id });
        res.status(200).json(interaction);
    } else {
        writeLog({ type: 'CRUD_READ_ONE', status: 'NOT_FOUND', interactionId: id });
        const error = new Error(`Interaction avec l'ID ${id} non trouvée.`);
        error.statusCode = 404;
        next(error);
    }
});

app.put('/api/interactions/:id', (req, res, next) => { // Ajout de 'next'
    const { id } = req.params;
    const updates = req.body;
    console.log(`\n➡️ Requête reçue : Mettre à jour l'interaction avec l'ID ${id}.`);

    const interactionIndex = interactions.findIndex(int => int.id === id);

    if (interactionIndex !== -1) {
        const oldInteraction = { ...interactions[interactionIndex] };
        interactions[interactionIndex] = { ...interactions[interactionIndex], ...updates };
        writeLog({
            type: 'CRUD_UPDATE',
            status: 'SUCCESS',
            interactionId: id,
            oldData: { userPrompt: oldInteraction.userPrompt?.substring(0, 100) + '...' || 'N/A', aiResponse: oldInteraction.aiResponse?.substring(0, 100) + '...' || 'N/A' },
            newData: { userPrompt: updates.userPrompt?.substring(0, 100) + '...' || 'N/A', aiResponse: updates.aiResponse?.substring(0, 100) + '...' || 'N/A' }
        });
        res.status(200).json(interactions[interactionIndex]);
    } else {
        writeLog({ type: 'CRUD_UPDATE', status: 'NOT_FOUND', interactionId: id, updates: updates });
        const error = new Error(`Interaction avec l'ID ${id} non trouvée.`);
        error.statusCode = 404;
        next(error);
    }
});

app.delete('/api/interactions/:id', (req, res, next) => { // Ajout de 'next'
    const { id } = req.params;
    console.log(`\n➡️ Requête reçue : Supprimer l'interaction avec l'ID ${id}.`);

    const initialLength = interactions.length;
    const deletedInteraction = interactions.find(int => int.id === id);
    interactions = interactions.filter(int => int.id !== id);

    if (interactions.length < initialLength) {
        writeLog({ type: 'CRUD_DELETE', status: 'SUCCESS', interactionId: id, deletedData: { userPrompt: deletedInteraction?.userPrompt?.substring(0, 100) + '...' || 'N/A' } });
        res.status(204).send();
    } else {
        writeLog({ type: 'CRUD_DELETE', status: 'NOT_FOUND', interactionId: id });
        const error = new Error(`Interaction avec l'ID ${id} non trouvée.`);
        error.statusCode = 404;
        next(error);
    }
});

app.post('/command', (req, res, next) => { // Ajout de 'next'
    const { command } = req.body;

    if (!command) {
        writeLog({ type: 'COMMAND_EXECUTION', status: 'FAILURE', reason: 'Missing command', requestedCommand: command });
        return res.status(400).json({ error: "Le champ 'command' est manquant dans le corps de la requête." });
    }

    console.log(`\n➡️ Requête de commande reçue: "${command}"`);
    writeLog({ type: 'COMMAND_EXECUTION', status: 'REQUESTED', requestedCommand: command });

    if (!config.authorizedCommands.includes(command)) {
        console.warn(`❌ Commande non autorisée tentée: "${command}"`);
        writeLog({ type: 'COMMAND_EXECUTION', status: 'FAILURE', reason: 'Unauthorized command', requestedCommand: command });
        const error = new Error("Commande non autorisée.");
        error.statusCode = 403;
        return next(error); // Utilise next(error) pour passer à la gestion globale
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Erreur lors de l'exécution de la commande "${command}":`, error.message);
            writeLog({ type: 'COMMAND_EXECUTION', status: 'ERROR', requestedCommand: command, errorMessage: error.message, stderr: stderr });
            const err = new Error(`Erreur lors de l'exécution de la commande: ${error.message}`);
            err.statusCode = 500;
            err.stderr = stderr; // Ajoute stderr à l'objet erreur
            return next(err);
        }
        if (stderr) {
            console.warn(`⚠️ La commande "${command}" a produit des erreurs sur stderr:`, stderr);
            writeLog({ type: 'COMMAND_EXECUTION', status: 'SUCCESS_WITH_STDERR', requestedCommand: command, stdout: stdout, stderr: stderr });
            return res.status(200).json({ success: true, stdout, stderr });
        }
        console.log(`✅ Commande "${command}" exécutée avec succès.`);
        writeLog({ type: 'COMMAND_EXECUTION', status: 'SUCCESS', requestedCommand: command, stdout: stdout });
        res.status(200).json({ success: true, stdout });
    });
});

// --- Middleware de gestion des erreurs global ---
// Ce middleware doit être défini APRÈS toutes les routes et tous les autres middlewares.
app.use((err, req, res, next) => {
  console.error("🚨 Erreur détectée par le middleware global:", err.stack); // Log la stack trace complète sur le serveur

  // Préparer la réponse d'erreur pour le client
  let statusCode = err.statusCode || 500; // Utilise le code de statut défini dans l'erreur, sinon 500 par défaut
  let message = "Une erreur interne du serveur est survenue."; // Message générique pour la production

  // En mode développement, fournir plus de détails
  if (config.environment === 'development') {
    message = err.message; // Affiche le message d'erreur spécifique
    // Ajoute la stack trace si l'erreur l'a
    const errorDetails = {
      message: message,
      stack: err.stack,
      ...(err.stderr && { stderr: err.stderr }) // Ajoute stderr si présent (pour les erreurs de commande)
    };
    writeLog({ type: 'GLOBAL_ERROR', status: 'ERROR_DEV', error: errorDetails, path: req.path });
    return res.status(statusCode).json(errorDetails);
  }

  // En mode production, ne pas exposer de détails sensibles
  writeLog({ type: 'GLOBAL_ERROR', status: 'ERROR_PROD', errorMessage: err.message, path: req.path });
  res.status(statusCode).json({ error: message });
});


// --- Gestion des erreurs non attrapées (Unhandled Rejections & Uncaught Exceptions) ---
// Ces gestionnaires sont pour les erreurs qui se produisent en dehors des pipelines Express normaux
// et qui pourraient autrement faire crasher le processus Node.js.
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Erreur: Promesse non gérée (Unhandled Rejection) :', reason);
  writeLog({ type: 'CRITICAL_ERROR', event: 'Unhandled Rejection', reason: reason.message || reason, stack: reason.stack || 'N/A' });
  // Optionnel: Arrêter le processus après un délai pour permettre aux logs d'être écrits.
  // En production, vous pourriez vouloir qu'un service de surveillance redémarre l'application.
  // process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('🚨 Erreur: Exception non attrapée (Uncaught Exception) :', err);
  writeLog({ type: 'CRITICAL_ERROR', event: 'Uncaught Exception', errorMessage: err.message, stack: err.stack });
  // Important: Pour les exceptions non attrapées, il est souvent recommandé de quitter le processus
  // car l'application pourrait être dans un état incohérent.
  process.exit(1);
});


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
  console.log(`Clé API Groq chargée: ${config.groq.apiKey ? 'Oui' : 'Non (vérifier votre .env)'}`);
  console.log(`Mode d'environnement: ${config.environment.toUpperCase()}`);
});