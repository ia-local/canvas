// bots/knowledgeBotHandler.js

let gemini; // Essential for information retrieval and summarization

// Helper function to query knowledge base (simulate or integrate RAG here)
async function queryKnowledgeBase(query, modelName = 'gemini-1.5-flash') {
    try {
        if (!gemini) throw new Error("Gemini API not initialized for Knowledge Bot.");
        const model = gemini.getGenerativeModel({ model: modelName });
        const systemInstruction = "Vous êtes un expert en base de connaissances. Répondez de manière concise et factuelle aux questions. Si l'information n'est pas disponible, indiquez-le.";
        const userPrompt = `Recherche d'information sur : "${query}"`;
        // In a real scenario, this would involve a RAG (Retrieval Augmented Generation) system
        // where you retrieve relevant documents from your knowledge base first,
        // then send them along with the query to Gemini.
        const result = await model.startChat({
            generationConfig: { maxOutputTokens: 1024, temperature: 0.3 }, // Basse température pour la précision
        }).sendMessage([
            { text: systemInstruction },
            { text: userPrompt }
        ]);
        return result.response.text();
    } catch (error) {
        console.error("Erreur lors de la requête de la base de connaissances (Knowledge Bot):", error);
        throw new Error("Impossible de récupérer l'information.");
    }
}

function init(bot, dependencies) {
    gemini = dependencies.gemini;

    // Commande pour rechercher dans la base de connaissances
    bot.command('find', async (ctx) => {
        const query = ctx.message.text.split(' ').slice(1).join(' ');
        if (!query) {
            ctx.reply("Veuillez spécifier ce que vous souhaitez rechercher. Ex: `/find procédure d'onboarding`");
            return;
        }
        ctx.reply("📚 Recherche dans la base de connaissances...");
        try {
            const answer = await queryKnowledgeBase(query);
            await ctx.reply(`Voici ce que j'ai trouvé sur "${query}" :\n\n${answer}`);
        } catch (error) {
            ctx.reply("Désolé, je n'ai pas pu trouver d'informations pertinentes dans la base de connaissances.");
        }
    });

    // Réponse par défaut
    bot.on('message', (ctx) => {
        if (!ctx.message.text.startsWith('/')) {
            ctx.reply("Bonjour ! Je suis le bot Base de Connaissances. Utilisez `/find [sujet]` pour rechercher des informations.");
        }
    });

    console.log("Knowledge Bot handler initialized.");
}

module.exports = { init };