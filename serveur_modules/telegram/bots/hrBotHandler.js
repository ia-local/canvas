// bots/hrBotHandler.js

let gemini; // Can be integrated for generating job descriptions, FAQ answers etc.

// Helper function (if using Gemini for HR content)
async function generateGeminiContent(prompt, systemInstruction, modelName = 'gemini-1.5-flash') {
    try {
        if (!gemini) throw new Error("Gemini API not initialized for HR Bot.");
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
        console.error("Erreur lors de la génération de contenu Gemini (HR Bot):", error);
        throw new Error("Impossible de générer le contenu RH.");
    }
}

function init(bot, dependencies) {
    gemini = dependencies.gemini;

    // Commande pour simuler une demande de congé
    bot.command('leave', async (ctx) => {
        const details = ctx.message.text.split(' ').slice(1).join(' ');
        if (!details) {
            ctx.reply("Veuillez spécifier les dates de votre demande de congé. Ex: `/leave du 1er au 5 juillet`.");
            return;
        }
        ctx.reply(`🏖️ Votre demande de congé "${details}" a été soumise pour approbation. Merci !`);
        // Ici, vous intégreriez la logique pour enregistrer la demande dans un système RH.
    });

    // Commande pour générer une description de poste (avec Gemini)
    bot.command('jobdesc', async (ctx) => {
        const role = ctx.message.text.split(' ').slice(1).join(' ');
        if (!role) {
            ctx.reply("Veuillez spécifier le rôle pour la description de poste. Ex: `/jobdesc Développeur Full-stack`");
            return;
        }
        ctx.reply(`✍️ Rédaction de la description de poste pour "${role}"...`);
        try {
            const systemPrompt = "Vous êtes un recruteur RH expérimenté. Rédigez une description de poste détaillée, attrayante et claire pour le rôle spécifié. Incluez les responsabilités, les qualifications requises et les avantages.";
            const userPrompt = `Description de poste pour : "${role}"`;
            const content = await generateGeminiContent(userPrompt, systemPrompt, 'gemini-1.5-pro'); // Pro pour plus de détails
            await ctx.reply(`Voici la description de poste pour "${role}" :\n\n${content}`, { parse_mode: 'Markdown' });
        } catch (error) {
            ctx.reply("Désolé, je n'ai pas pu générer la description de poste. Veuillez réessayer plus tard.");
        }
    });

    // Réponse par défaut
    bot.on('message', (ctx) => {
        if (!ctx.message.text.startsWith('/')) {
            ctx.reply("Bonjour ! Je suis votre bot RH. Utilisez `/leave [dates]` pour une demande de congé ou `/jobdesc [rôle]` pour une description de poste.");
        }
    });

    console.log("HR Bot handler initialized.");
}

module.exports = { init };