const express = require('express');
const Groq = require('groq-sdk');
const cors = require('cors'); // Middleware pour gérer les requêtes CORS
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs'); // Node.js File System module for file operations

// Load environment variables from .env file
require('dotenv').config();

// --- Server and AI Configuration ---
const config = {
  port: process.env.PORT || 3000,
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama3-8b-8192', // Modèle Groq utilisé
    temperature: 0.7,        // Température de la génération (créativité)
    maxTokens: 2048,         // Nombre maximum de tokens dans la réponse
  },
  ai: {
    role: "Un assistant IA expert en développement et en conseil technique.",
    context: "Fournir des réponses précises, concises et utiles sur des sujets de programmation, d'architecture logicielle et de technologies web. Votre logique métier est d'être un conseiller technique fiable.",
  },
  logFilePath: path.join(__dirname, 'logs.json') // Chemin vers le fichier de log des interactions
};

// Validate Groq API Key
if (!config.groq.apiKey) {
  console.error("❌ Erreur: La clé API Groq (GROQ_API_KEY) n'est pas configurée dans les variables d'environnement.");
  console.error("Veuillez créer un fichier .env à la racine de votre projet avec GROQ_API_KEY=votre_clé_ici");
  process.exit(1); // Arrête le processus si la clé API est manquante
}

const groq = new Groq({ apiKey: config.groq.apiKey });
const app = express();

// --- Data Storage (In-memory - for demonstration purposes) ---
// Ce tableau stocke les interactions IA en mémoire. Pour une application réelle,
// vous utiliseriez une base de données (ex: MongoDB, PostgreSQL, SQLite).
let interactions = [];

// --- Logging Setup ---
/**
 * Fonction pour écrire les logs dans le fichier `logs.json`.
 * Ajoute un timestamp à chaque entrée de log.
 * @param {object} logEntry - L'objet à logger.
 */
const writeLog = (logEntry) => {
  const timestamp = new Date().toISOString();
  const log = { timestamp, ...logEntry };

  // Lit les logs existants, ajoute la nouvelle entrée et réécrit le fichier
  fs.readFile(config.logFilePath, (err, data) => {
    let logs = [];
    if (!err) {
      try {
        logs = JSON.parse(data.toString());
      } catch (parseError) {
        console.error("❌ Erreur de parsing du fichier de log existant:", parseError.message);
        logs = []; // Réinitialise les logs si le fichier est corrompu
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

// Initialise le fichier logs.json s'il n'existe pas ou est un JSON invalide
if (!fs.existsSync(config.logFilePath)) {
  fs.writeFileSync(config.logFilePath, JSON.stringify([]));
  console.log(`➡️ Fichier de log créé: ${config.logFilePath}`);
} else {
  // Tente de parser les logs existants pour s'assurer qu'ils sont un JSON valide
  fs.readFile(config.logFilePath, (err, data) => {
    if (!err) {
      try {
        JSON.parse(data.toString());
      } catch (parseError) {
        console.error(`⚠️ Fichier de log existant corrompu (${config.logFilePath}). Réinitialisation.`);
        fs.writeFileSync(config.logFilePath, JSON.stringify([])); // Réinitialise le fichier de log corrompu
      }
    }
  });
}
console.log(`➡️ Les interactions seront loggées dans : ${config.logFilePath}`);


// --- Middleware Setup ---
// Permet à toutes les origines (domaines) d'accéder à l'API. C'est crucial pour le développement local
// car le frontend (index.html) s'exécute souvent sur une origine différente (ex: file:// ou port différent).
app.use(cors());
// Middleware pour parser les corps de requêtes entrants en JSON.
// Nécessaire pour accéder à `req.body` dans les gestionnaires de route.
app.use(express.json());

// --- Static Files Serving ---
// Configure Express pour servir les fichiers statiques (HTML, CSS, JavaScript du frontend)
// depuis le dossier 'public'. Cela signifie que si votre index.html est dans 'public/',
// il sera accessible via l'URL racine du serveur (ex: http://localhost:3000/).
app.use(express.static(path.join(__dirname, 'public')));
console.log(`➡️ Service des fichiers statiques depuis : ${path.join(__dirname, 'public')}`);

// --- API Endpoints ---

/**
 * Endpoint pour l'interaction avec l'IA.
 * Gère les requêtes POST vers l'endpoint '/generate'.
 * Attend un corps JSON avec un champ 'prompt' : { "prompt": "Votre question ici" }.
 * Interagit avec l'API Groq pour générer une réponse, puis stocke l'interaction.
 */
app.post('/generate', async (req, res) => {
  const userPrompt = req.body.prompt;

  // Vérifie si le champ 'prompt' est présent dans la requête
  if (!userPrompt) {
    writeLog({ type: 'AI_INTERACTION', status: 'FAILURE', reason: 'Missing prompt', userPrompt: userPrompt });
    return res.status(400).json({ error: "Le champ 'prompt' est manquant dans le corps de la requête." });
  }

  console.log(`\n➡️ Requête AI reçue pour le prompt: "${userPrompt.substring(0, Math.min(userPrompt.length, 50))}..."`);
  writeLog({ type: 'AI_INTERACTION', status: 'REQUESTED', userPrompt: userPrompt.substring(0, 200) + '...' });

  try {
    // Message système qui définit le rôle et le contexte de l'IA
    const systemMessage = `Vous êtes ${config.ai.role}. Votre rôle est de ${config.ai.context}.`;

    // Appel à l'API Groq pour obtenir une complétion de chat
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt },
      ],
      model: config.groq.model,
      temperature: config.groq.temperature,
      max_tokens: config.groq.maxTokens,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;

    if (aiResponse) {
      // Si une réponse est générée, la stocke
      const newInteraction = {
        id: uuidv4(), // Génère un ID unique pour l'interaction
        timestamp: new Date().toISOString(),
        userPrompt: userPrompt,
        aiResponse: aiResponse,
      };
      interactions.push(newInteraction); // Ajoute à la liste des interactions en mémoire

      console.log("✅ Réponse de l'IA générée et interaction stockée avec succès.");
      writeLog({ type: 'AI_INTERACTION', status: 'SUCCESS', interactionId: newInteraction.id, userPrompt: newInteraction.userPrompt.substring(0, 200) + '...', aiResponse: newInteraction.aiResponse.substring(0, 200) + '...' });
      // Renvoie la réponse de l'IA et l'ID de l'interaction au client
      res.status(200).json({
        response: aiResponse,
        interactionId: newInteraction.id
      });
    } else {
      // Gère le cas où Groq ne renvoie pas de contenu
      console.warn("⚠️ Groq n'a pas généré de contenu pour cette requête.");
      writeLog({ type: 'AI_INTERACTION', status: 'FAILURE', reason: 'No content from AI', userPrompt: userPrompt.substring(0, 200) + '...' });
      res.status(500).json({ error: "L'IA n'a pas pu générer de réponse." });
    }

  } catch (error) {
    // Gère les erreurs lors de l'appel à l'API Groq ou du stockage
    console.error("❌ Erreur lors de l'appel à l'API Groq ou du stockage de l'interaction:", error);
    writeLog({ type: 'AI_INTERACTION', status: 'ERROR', errorMessage: error.message, stack: error.stack?.substring(0, 500) + '...' || 'N/A', userPrompt: userPrompt.substring(0, 200) + '...' });
    res.status(500).json({ error: "Une erreur interne est survenue lors de la communication avec l'IA ou le stockage des données." });
  }
});

// --- CRUD Endpoints for 'Interactions' ---
// Ces endpoints gèrent les opérations de base de données (lecture, mise à jour, suppression)
// pour les interactions stockées en mémoire.

/**
 * READ All Interactions
 * GET /api/interactions
 * Renvoie une liste de toutes les interactions IA stockées.
 */
app.get('/api/interactions', (req, res) => {
    console.log(`\n➡️ Requête reçue : Lire toutes les interactions.`);
    writeLog({ type: 'CRUD_READ_ALL', status: 'SUCCESS', count: interactions.length });
    res.status(200).json(interactions);
});

/**
 * READ Specific Interaction by ID
 * GET /api/interactions/:id
 * Renvoie une seule interaction basée sur son ID unique.
 */
app.get('/api/interactions/:id', (req, res) => {
    const { id } = req.params;
    console.log(`\n➡️ Requête reçue : Lire l'interaction avec l'ID ${id}.`);
    const interaction = interactions.find(int => int.id === id);

    if (interaction) {
        writeLog({ type: 'CRUD_READ_ONE', status: 'SUCCESS', interactionId: id });
        res.status(200).json(interaction);
    } else {
        writeLog({ type: 'CRUD_READ_ONE', status: 'NOT_FOUND', interactionId: id });
        res.status(404).json({ error: `Interaction avec l'ID ${id} non trouvée.` });
    }
});

/**
 * UPDATE an Interaction
 * PUT /api/interactions/:id
 * Attend un corps JSON avec les champs à mettre à jour (ex: { "userPrompt": "nouveau prompt" }).
 */
app.put('/api/interactions/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    console.log(`\n➡️ Requête reçue : Mettre à jour l'interaction avec l'ID ${id}.`);

    const interactionIndex = interactions.findIndex(int => int.id === id);

    if (interactionIndex !== -1) {
        const oldInteraction = { ...interactions[interactionIndex] }; // Clone pour le logging
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
        res.status(404).json({ error: `Interaction avec l'ID ${id} non trouvée.` });
    }
});

/**
 * DELETE an Interaction
 * DELETE /api/interactions/:id
 * Supprime une interaction basée sur son ID unique.
 */
app.delete('/api/interactions/:id', (req, res) => {
    const { id } = req.params;
    console.log(`\n➡️ Requête reçue : Supprimer l'interaction avec l'ID ${id}.`);

    const initialLength = interactions.length;
    const deletedInteraction = interactions.find(int => int.id === id); // Récupère l'interaction pour le logging
    interactions = interactions.filter(int => int.id !== id); // Filtre pour supprimer l'interaction

    if (interactions.length < initialLength) {
        writeLog({ type: 'CRUD_DELETE', status: 'SUCCESS', interactionId: id, deletedData: { userPrompt: deletedInteraction?.userPrompt?.substring(0, 100) + '...' || 'N/A' } });
        res.status(204).send(); // 204 No Content pour une suppression réussie
    } else {
        writeLog({ type: 'CRUD_DELETE', status: 'NOT_FOUND', interactionId: id });
        res.status(404).json({ error: `Interaction avec l'ID ${id} non trouvée.` });
    }
});

// --- Server Initialization ---
// Démarre le serveur Express sur le port configuré.
app.listen(config.port, () => {
  console.log(`\n🚀 Serveur Groq Express démarré sur http://localhost:${config.port}`);
  console.log(`Accédez au frontend via : http://localhost:${config.port}/`);
  console.log(`Points d'API pour la génération : POST http://localhost:${config.port}/generate`);
  console.log(`Points d'API CRUD pour les interactions :`);
  console.log(`  GET /api/interactions          (Lire toutes)`);
  console.log(`  GET /api/interactions/:id      (Lire par ID)`);
  console.log(`  PUT /api/interactions/:id      (Mettre à jour)`);
  console.log(`  DELETE /api/interactions/:id   (Supprimer)`);
  console.log(`Clé API Groq chargée: ${config.groq.apiKey ? 'Oui' : 'Non (vérifier votre .env)'}`);
});
