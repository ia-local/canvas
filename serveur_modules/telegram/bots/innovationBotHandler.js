// bots/innovationBotHandler.js

let gemini; // Essential for creative brainstorming

// Helper function to generate innovative ideas
async function generateInnovationIdea(prompt, modelName = 'gemini-1.5-pro') { // Use Pro for more complex ideas
    try {
        if (!gemini) throw new Error("Gemini API not initialized for Innovation Bot.");
        const model = gemini.getGenerativeModel({ model: modelName });
        const systemInstruction = "Vous êtes un catalyseur d'innovation et un expert en brainstorming. Générez des idées créatives, disruptives et réalisables pour le sujet donné. Pensez 'out of the box' mais avec une touche de pragmatisme.";
        const userPrompt = `Génère des idées d'innovation pour : "${prompt}"`;
        const result = await model.startChat({
            generationConfig: { maxOutputTokens: 1500, temperature: 0.9, topP: 1, topK: 50 }, // Température élevée pour la créativité
        }).sendMessage([
            { text: systemInstruction },
            { text: userPrompt }
        ]);
        return result.response.text();
    } catch (error) {
        console.error("Erreur lors de la génération d'idées d'innovation (Innovation Bot):", error);
        throw new Error("Impossible de générer des idées innovantes.");
    }
}

function init(bot, dependencies) {
    gemini = dependencies.gemini;

    // Commande pour lancer une session de brainstorming
    bot.command('brainstorm', async (ctx) => {
        const topic = ctx.message.text.split(' ').slice(1).join(' ');
        if (!topic) {
            ctx.reply("Veuillez fournir un sujet pour le brainstorming. Ex: `/brainstorm Nouvelle fonctionnalité pour les bots`");
            return;
        }
        ctx.reply("✨ Lancement d'une session de brainstorming. Préparez-vous à l'innovation !");
        try {
            const ideas = await generateInnovationIdea(topic);
            await ctx.reply(`Voici quelques idées innovantes pour "${topic}" :\n\n${ideas}`, { parse_mode: 'Markdown' });
        } catch (error) {
            ctx.reply("Désolé, je n'ai pas pu lancer le brainstorming. Réessayez avec un autre sujet.");
        }
    });

    // Commande pour analyser une tendance
    bot.command('trend', async (ctx) => {
        const trend = ctx.message.text.split(' ').slice(1).join(' ');
        if (!trend) {
            ctx.reply("Veuillez spécifier la tendance à analyser. Ex: `/trend IA générative dans l'éducation`");
            return;
        }
        ctx.reply("📈 Analyse de la tendance...");
        try {
            const systemPrompt = "Vous êtes un analyste de tendances futuriste. Analysez la tendance spécifiée, identifiez ses impacts potentiels, ses opportunités et ses défis pour une startup technologique.";
            const userPrompt = `Analyse de la tendance : "${trend}"`;
            const analysis = await generateInnovationIdea(userPrompt, 'gemini-1.5-pro'); // Pro pour l'analyse
            await ctx.reply(`Voici une analyse de la tendance "${trend}" :\n\n${analysis}`, { parse_mode: 'Markdown' });
        } catch (error) {
            ctx.reply("Désolé, je n'ai pas pu analyser la tendance. Veuillez réessayer.");
        }
    });

    // Réponse par défaut
    bot.on('message', (ctx) => {
        if (!ctx.message.text.startsWith('/')) {
            ctx.reply("Salut l'innovateur ! Je suis le bot Innovation. Utilisez `/brainstorm [sujet]` pour des idées ou `/trend [tendance]` pour une analyse.");
        }
    });

    console.log("Innovation Bot handler initialized.");
}

module.exports = { init };