// bots/marketingBotHandler.js

let gemini; // Will be assigned from dependencies

// Helper function to generate content with Gemini
async function generateGeminiContent(prompt, systemInstruction, modelName = 'gemini-1.5-flash') {
    try {
        if (!gemini) throw new Error("Gemini API not initialized for Marketing Bot.");
        const model = gemini.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7,
                topP: 0.95,
                topK: 60,
            },
        });
        const result = await chat.sendMessage([
            { text: systemInstruction },
            { text: prompt }
        ]);
        return result.response.text();
    } catch (error) {
        console.error("Erreur lors de la génération de contenu Gemini (Marketing Bot):", error);
        throw new Error("Impossible de générer le contenu marketing.");
    }
}

function init(bot, dependencies) {
    gemini = dependencies.gemini;

    // Commande pour générer une idée de campagne marketing
    bot.command('campaign', async (ctx) => {
        const topic = ctx.message.text.split(' ').slice(1).join(' ');
        if (!topic) {
            ctx.reply("Veuillez fournir un sujet pour la campagne marketing. Ex: `/campaign lancement nouveau produit IA`");
            return;
        }
        ctx.reply("💡 Brainstorming d'idées de campagne pour vous...");
        try {
            const systemPrompt = "Vous êtes un stratège marketing créatif. Générez des idées de campagnes innovantes et des slogans accrocheurs pour le sujet donné. Incluez des suggestions de canaux.";
            const userPrompt = `Idées de campagne et slogans pour : "${topic}"`;
            const content = await generateGeminiContent(userPrompt, systemPrompt, 'gemini-1.5-pro'); // Pro pour des idées plus riches
            await ctx.reply(`Voici quelques idées de campagne pour "${topic}" :\n\n${content}`, { parse_mode: 'Markdown' });
        } catch (error) {
            ctx.reply("Désolé, je n'ai pas pu générer d'idées de campagne. Veuillez réessayer plus tard.");
        }
    });

    // Commande pour générer un post pour les réseaux sociaux
    bot.command('socialpost', async (ctx) => {
        const postDetails = ctx.message.text.split(' ').slice(1).join(' ');
        if (!postDetails) {
            ctx.reply("Veuillez fournir les détails pour le post social. Ex: `/socialpost Annonce: Notre nouvelle fonctionnalité de chat vocal est là ! #AI #Innovation`");
            return;
        }
        ctx.reply("✍️ Rédaction de votre post pour les réseaux sociaux...");
        try {
            const systemPrompt = "Vous êtes un expert en rédaction pour les réseaux sociaux. Créez un post engageant, concis et optimisé pour le partage, en incluant des emojis pertinents et des hashtags si nécessaire.";
            const userPrompt = `Rédige un post pour les réseaux sociaux basé sur : "${postDetails}"`;
            const content = await generateGeminiContent(userPrompt, systemPrompt);
            await ctx.reply(`Votre post est prêt :\n\n${content}`);
        } catch (error) {
            ctx.reply("Désolé, je n'ai pas pu rédiger le post social. Veuillez réessayer plus tard.");
        }
    });

    // Réponse par défaut
    bot.on('message', (ctx) => {
        if (!ctx.message.text.startsWith('/')) {
            ctx.reply("Salut ! Je suis votre bot Marketing. Utilisez `/campaign [sujet]` pour des idées ou `/socialpost [détails]` pour rédiger un post.");
        }
    });

    console.log("Marketing Bot handler initialized.");
}

module.exports = { init };