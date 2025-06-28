// bots/supportBotHandler.js

let gemini; // Essential for providing smart answers

// Helper function to generate answers with Gemini
async function generateGeminiAnswer(prompt, modelName = 'gemini-1.5-flash') {
    try {
        if (!gemini) throw new Error("Gemini API not initialized for Support Bot.");
        const model = gemini.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
            generationConfig: { maxOutputTokens: 500, temperature: 0.5 }, // Plus faible température pour des réponses factuelles
        });
        const result = await chat.sendMessage([
            { text: "Vous êtes un agent de support client serviable et clair. Répondez aux questions des utilisateurs de manière concise et utile, en vous basant sur des informations factuelles." },
            { text: prompt }
        ]);
        return result.response.text();
    } catch (error) {
        console.error("Erreur lors de la génération de réponse Gemini (Support Bot):", error);
        throw new Error("Impossible de trouver une réponse.");
    }
}

function init(bot, dependencies) {
    gemini = dependencies.gemini;

    // Commande pour simuler la création d'un ticket
    bot.command('ticket', async (ctx) => {
        const issue = ctx.message.text.split(' ').slice(1).join(' ');
        if (!issue) {
            ctx.reply("Veuillez décrire le problème pour créer un ticket. Ex: `/ticket Mon compte est bloqué.`");
            return;
        }
        // Ici, vous intégreriez la logique de création de ticket dans un système ITSM.
        ctx.reply(`🎫 Votre ticket pour le problème "${issue}" a été créé. Un agent vous contactera bientôt.`);
    });

    // Répond aux questions des utilisateurs en utilisant Gemini
    bot.on('message', async (ctx) => {
        const message = ctx.message.text;
        if (message.startsWith('/')) { // Ignore commands
            return;
        }

        ctx.reply("🔍 Je cherche une réponse pour vous...");
        try {
            const answer = await generateGeminiAnswer(message);
            await ctx.reply(`Voici une réponse :\n\n${answer}`);
        } catch (error) {
            ctx.reply("Désolé, je n'ai pas pu trouver de réponse pertinente. Veuillez reformuler votre question ou créer un ticket avec /ticket.");
        }
    });

    console.log("Support Bot handler initialized.");
}

module.exports = { init };