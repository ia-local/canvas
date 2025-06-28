// bots/salesBotHandler.js

let gemini; // Can be integrated for generating sales scripts, objection handling, etc.

// Helper function (if using Gemini for Sales content)
async function generateGeminiContent(prompt, systemInstruction, modelName = 'gemini-1.5-flash') {
    try {
        if (!gemini) throw new Error("Gemini API not initialized for Sales Bot.");
        const model = gemini.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        });
        const result = await chat.sendMessage([
            { text: systemInstruction },
            { text: prompt }
        ]);
        return result.response.text();
    } catch (error) {
        console.error("Erreur lors de la génération de contenu Gemini (Sales Bot):", error);
        throw new Error("Impossible de générer le contenu de vente.");
    }
}

function init(bot, dependencies) {
    gemini = dependencies.gemini;

    // Commande pour simuler l'enregistrement d'un nouveau prospect
    bot.command('newlead', async (ctx) => {
        const leadDetails = ctx.message.text.split(' ').slice(1).join(' ');
        if (!leadDetails) {
            ctx.reply("Veuillez fournir les détails du nouveau prospect (ex: `/newlead Nom: Entreprise X, Contact: Alice, Intérêt: IA Chatbot`).");
            return;
        }
        ctx.reply(`🤝 Nouveau prospect enregistré : "${leadDetails}". Je vais commencer la qualification !`);
        // Ici, vous enregistreriez le prospect dans un CRM ou une base de données.
    });

    // Commande pour générer un argumentaire de vente rapide
    bot.command('pitch', async (ctx) => {
        const product = ctx.message.text.split(' ').slice(1).join(' ');
        if (!product) {
            ctx.reply("Veuillez spécifier le produit/service pour l'argumentaire. Ex: `/pitch Chatbot IA`");
            return;
        }
        ctx.reply(`✍️ Rédaction d'un argumentaire de vente pour "${product}"...`);
        try {
            const systemPrompt = "Vous êtes un commercial percutant. Rédigez un argumentaire de vente concis et convaincant pour le produit/service donné, en mettant en avant ses avantages clés.";
            const userPrompt = `Argumentaire pour : "${product}"`;
            const content = await generateGeminiContent(userPrompt, systemPrompt);
            await ctx.reply(`Voici votre argumentaire pour "${product}" :\n\n${content}`, { parse_mode: 'Markdown' });
        } catch (error) {
            ctx.reply("Désolé, je n'ai pas pu générer l'argumentaire de vente. Veuillez réessayer plus tard.");
        }
    });

    // Réponse par défaut
    bot.on('message', (ctx) => {
        if (!ctx.message.text.startsWith('/')) {
            ctx.reply("Bienvenue ! Je suis le bot Ventes. Utilisez `/newlead [détails]` pour un prospect ou `/pitch [produit]` pour un argumentaire.");
        }
    });

    console.log("Sales Bot handler initialized.");
}

module.exports = { init };