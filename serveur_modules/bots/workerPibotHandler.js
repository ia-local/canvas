// bots/workerPibotHandler.js
const { Telegraf } = require('telegraf');

let groqInstance; // Sera défini par init
let openaiInstance; // Pourrait être utilisé si nécessaire
let geminiInstance; // Pourrait être utilisé si nécessaire
let botsNetwork;    // Pour la collaboration inter-bots

// Stocke l'historique de conversation par ID de chat
const conversationHistory = {};

// Fonction pour générer du contenu avec Groq (maintenant prend un tableau de messages)
async function generateContentWithGroq(messages, model = 'llama3-8b-8192') { // Ancien 'llama3-8b-8192' ou 'gemma2-9b-it'
    try {
        console.log("DEBUG: Appelle generateContentWithGroq pour Worker PiBot.");
        console.log("DEBUG: Prompt Groq (Worker):", messages);

        const chatCompletion = await groqInstance.chat.completions.create({
            messages: messages, // Prend directement le tableau de messages
            model: model,
            temperature: 0.7,
            max_tokens: 4048,
        });

        console.log("DEBUG: Réponse de Groq reçue pour Worker PiBot.");
        return chatCompletion.choices[0].message.content;
    } catch (error) {
        console.error('Erreur lors de la génération de contenu avec Groq pour Worker PiBot:', error);
        return 'Désolé, une erreur est survenue lors de la communication avec le modèle IA.';
    }
}

async function handleStart(ctx) {
    console.log('DEBUG: Worker PiBot: Commande /start reçue.');
    const userId = ctx.from.id;
    // Réinitialise l'historique pour l'utilisateur lors d'un nouveau /start
    conversationHistory[userId] = [];
    await ctx.reply(`Bonjour ! Je suis le Worker PiBot, propulsé par Groq. Envoyez-moi des tâches backend avec /process ou discutez avec moi.`);
}

async function handleProcessCommand(ctx) {
    console.log('DEBUG: Worker PiBot: Commande /process reçue.');
    const userId = ctx.from.id;
    const task = ctx.message.text.substring('/process'.length).trim();

    if (!conversationHistory[userId]) {
        conversationHistory[userId] = [];
    }

    if (task) {
        // Ajouter la tâche au contexte de la conversation si pertinent
        conversationHistory[userId].push({ role: 'user', content: `/process ${task}` });

        // Appeler la fonction backend simulée via le réseau de bots
        const result = await botsNetwork.workerPibot.processBackend(task);

        const aiResponse = `Tâche backend "${task}" reçue et traitée. Résultat : ${result}`;
        conversationHistory[userId].push({ role: 'assistant', content: aiResponse }); // Ajouter la réponse du bot
        await ctx.reply(aiResponse);
    } else {
        const aiResponse = 'Veuillez spécifier la tâche à traiter avec /process [votre tâche].';
        conversationHistory[userId].push({ role: 'assistant', content: aiResponse }); // Ajouter la réponse du bot
        await ctx.reply(aiResponse);
    }
}

async function handleTextMessage(ctx) {
    console.log(`DEBUG: Worker PiBot: Message non-commande reçu: ${ctx.message.text}`);
    const userId = ctx.from.id;
    const userInput = ctx.message.text;

    // Initialiser l'historique pour cet utilisateur si inexistant
    if (!conversationHistory[userId]) {
        conversationHistory[userId] = [];
    }

    // Ajouter le message de l'utilisateur à l'historique
    conversationHistory[userId].push({ role: 'user', content: userInput });

    // Construire les messages pour Groq, incluant l'instruction système et l'historique
    // Nous allons passer un tableau de messages complet à Groq, pas seulement le prompt
    const messagesForGroq = [
        { role: 'system', content: `Tu es un assistant IA de type Worker PiBot. Tu es spécialisé dans l'exécution de tâches backend et la collaboration avec d'autres IA. Tu es concis et axé sur les tâches, mais capable de conversations simples pour comprendre les requêtes. Ne réponds pas avec des phrases de type "veuillez utiliser /process" à moins que l'utilisateur ne tente de te donner une tâche sans la commande. Essaye d'engager une conversation naturelle et d'utiliser tes compétences IA.` },
        ...conversationHistory[userId]
    ];

    try {
        // Appelle la fonction generateContentWithGroq avec le tableau de messages
        const groqResponse = await generateContentWithGroq(messagesForGroq);

        // Ajouter la réponse de l'IA à l'historique
        conversationHistory[userId].push({ role: 'assistant', content: groqResponse });

        await ctx.reply(groqResponse);
    } catch (error) {
        console.error('Erreur lors de la génération de la réponse Groq pour Worker PiBot:', error);
        await ctx.reply('Désolé, une erreur est survenue lors du traitement de votre demande de conversation.');
    }
}

function init(bot, dependencies) {
    groqInstance = dependencies.groq;
    openaiInstance = dependencies.openai;
    geminiInstance = dependencies.gemini;
    botsNetwork = dependencies.botsNetwork; // Assurez-vous que botsNetwork est bien passé

    // Définir les commandes du bot
    bot.start(handleStart);
    bot.command('process', handleProcessCommand);

    // Gérer tous les autres messages texte
    bot.on('text', handleTextMessage);

    console.log('Worker PiBot handler initialized.');
}

module.exports = { init };