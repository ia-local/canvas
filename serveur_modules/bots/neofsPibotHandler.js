// bots/neofsPibotHandler.js (avec conversation générale et complétion chatbot)

const fs = require('fs'); // Maintenu si besoin pour d'autres fonctionnalités
const path = require('path'); // Maintenu si besoin pour d'autres fonctionnalités

let groqInstance;       // Instance Groq pour la génération UI/UX et la conversation
let openaiInstance;     // Potentiellement utilisable
let geminiInstance;     // Potentiellement utilisable
let botsNetwork;        // Pour la coordination inter-bots

// Stocke l'historique de conversation par ID de chat
const conversationHistory = {};

/**
 * Fonction générique pour la génération de contenu via Groq.
 * Elle peut être utilisée pour les tâches UI/UX ou pour la conversation générale.
 */
async function generateContentWithGroq(messages, modelName = 'gemma2-9b-it', temperature = 0.7) {
    console.log("DEBUG: generateContentWithGroq (Neofs PiBot) appelée.");
    // 'messages' est maintenant un tableau d'objets { role: 'user'/'system'/'assistant', content: '...' }

    try {
        if (!groqInstance) { // Vérifie l'instance Groq
            console.error("ERREUR: Instance Groq non initialisée dans generateContentWithGroq pour Neofs PiBot.");
            throw new Error("Groq API not initialized.");
        }

        const chatCompletion = await groqInstance.chat.completions.create({
            messages: messages, // Passe le tableau complet des messages
            model: modelName,
            temperature: temperature,
            max_tokens: 4096,
        });

        const content = chatCompletion.choices[0].message.content;
        console.log("DEBUG: Réponse de Groq reçue pour Neofs PiBot. Contenu:", content.substring(0, 200) + "...");
        return content;
    } catch (error) {
        console.error("Erreur lors de la génération de contenu avec Groq pour Neofs PiBot:", error);
        throw new Error("Une erreur est survenue lors de la génération de contenu.");
    }
}

// Gestionnaire pour la commande /start
async function handleStart(ctx) {
    console.log("DEBUG: Neofs PiBot: Commande /start reçue.");
    const userId = ctx.from.id;
    // Réinitialise l'historique de conversation pour cet utilisateur
    conversationHistory[userId] = [];
    await ctx.reply('Bonjour ! Je suis le NeoFS PiBot, votre expert en UI/UX et maintenant aussi un assistant conversationnel, propulsé par Groq. Utilisez la commande /ui pour générer des idées UI/UX, ou discutez simplement avec moi.');
}

// Gestionnaire pour la commande /ui
async function handleUiCommand(ctx) {
    console.log("DEBUG: Neofs PiBot: Commande /ui reçue.");
    const userId = ctx.from.id;
    const uiTask = ctx.message.text.split(' ').slice(1).join(' ');

    if (!uiTask) {
        await ctx.reply("Veuillez spécifier la tâche UI/UX à traiter. Exemple: `/ui propose une maquette d'une page d'accueil pour une application de jardinage intelligent`");
        return;
    }

    await ctx.reply(`@neofs_Pibot est en train de générer des idées d'interface pour: "${uiTask}" via Groq... Cela peut prendre un instant.`);
    console.log(`DEBUG: Neofs PiBot: Requête de génération UI/UX pour: "${uiTask}"`);

    // Nous allons construire un tableau de messages spécifique pour la tâche UI/UX
    const messagesForUiTask = [
        { role: 'system', content: `Vous êtes un concepteur UI/UX expert et un artiste numérique. Générez des idées, des descriptions de maquettes, des spécifications d'interface ou même des extraits de code (HTML/CSS/pseudo-code) basés sur la demande de l'utilisateur. Concentrez-vous sur l'expérience utilisateur, l'esthétique et l'innovation.` },
        { role: 'user', content: uiTask }
    ];

    try {
        const uiContent = await generateContentWithGroq(messagesForUiTask, 'llama3-8b-8192'); // Modèle spécifique pour UI/UX si souhaité

        if (uiContent) {
            await ctx.reply(`Voici des propositions UI/UX pour "${uiTask}":\n\n${uiContent}`, { parse_mode: 'Markdown' });
            console.log(`DEBUG: Neofs PiBot: Réponse UI/UX envoyée pour: "${uiTask}"`);
        } else {
            await ctx.reply("Désolé, je n'ai pas pu générer de contenu UI/UX pour votre demande.");
            console.error("ERREUR: generateContentWithGroq a retourné un contenu vide pour UI/UX.");
        }
    } catch (error) {
        console.error("ERREUR: Neofs PiBot: Échec de la génération UI/UX:", error);
        if (error.message.includes("Groq API not initialized") || error.message.includes("API key not valid")) {
             await ctx.reply('⚠️ Erreur de configuration de l\'API Groq. Veuillez vérifier la clé API.');
        } else {
            await ctx.reply("Désolé, une erreur est survenue lors de la génération de l'interface. Veuillez réessayer.");
        }
    }
}

// Gestionnaire pour les messages texte non-commande (conversation générale)
async function handleTextMessage(ctx) {
    console.log(`DEBUG: Neofs PiBot: Message non-commande reçu: ${ctx.message.text}`);
    const userId = ctx.from.id;
    const userInput = ctx.message.text;

    // Initialiser l'historique pour cet utilisateur si inexistant
    if (!conversationHistory[userId]) {
        conversationHistory[userId] = [];
    }

    // Ajouter le message de l'utilisateur à l'historique
    conversationHistory[userId].push({ role: 'user', content: userInput });

    // Construire les messages pour Groq, incluant l'instruction système et l'historique
    const messagesForGroq = [
        { role: 'system', content: `Tu es le NeoFS PiBot, un assistant IA spécialisé en UI/UX et design, mais tu peux aussi avoir des conversations générales. Réponds de manière utile et amicale, en utilisant tes connaissances en technologie et design si pertinent. Maintiens le contexte de la conversation.` },
        ...conversationHistory[userId]
    ];

    try {
        const groqResponse = await generateContentWithGroq(messagesForGroq, 'llama3-8b-8192', 0.8); // Utilisez un modèle et une température adaptés à la conversation

        // Ajouter la réponse de l'IA à l'historique
        conversationHistory[userId].push({ role: 'assistant', content: groqResponse });

        await ctx.reply(groqResponse);
    } catch (error) {
        console.error('Erreur lors de la génération de la réponse Groq pour la conversation générale du Neofs PiBot:', error);
        await ctx.reply('Désolé, une erreur est survenue lors du traitement de votre demande de conversation.');
    }
}


// Fonction d'initialisation du handler du bot NeoFS
function init(bot, dependencies) {
    // Récupérez les instances d'AI et le réseau de bots passées par index.js
    groqInstance = dependencies.groq; // Assurez-vous que Groq est passé
    openaiInstance = dependencies.openai;
    geminiInstance = dependencies.gemini;
    botsNetwork = dependencies.botsNetwork;

    console.log("Neofs PiBot handler initialized.");

    // --- Commandes spécifiques à neofs_Pibot ---
    bot.start(handleStart);
    bot.command('ui', handleUiCommand);

    // Gérer tous les autres messages texte pour la conversation générale
    bot.on('text', handleTextMessage);

    // Note: 'bot.on('message')' a été remplacé par 'bot.on('text')' pour une gestion plus fine,
    // et il délègue maintenant à handleTextMessage pour la conversation Groq.
}

// Exportez la fonction init pour qu'elle puisse être appelée par index.js
module.exports = { init };