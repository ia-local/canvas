// bots/financeBotHandler.js

// No AI model needed by default, but can be integrated if needed for analysis.
// let gemini; // Uncomment if you add AI capabilities

function init(bot, dependencies) {
    // gemini = dependencies.gemini; // Uncomment if you add AI capabilities

    // Commande pour simuler l'enregistrement d'une dépense
    bot.command('expense', async (ctx) => {
        const expenseDetails = ctx.message.text.split(' ').slice(1).join(' ');
        if (!expenseDetails) {
            ctx.reply("Veuillez fournir les détails de la dépense (ex: `/expense 150 EUR - Fournitures de bureau - 2024-06-20`).");
            return;
        }
        // Ici, vous intégreriez la logique pour enregistrer dans une base de données financière.
        ctx.reply(`💰 Dépense enregistrée : "${expenseDetails}". Merci de maintenir nos comptes à jour !`);
    });

    // Commande pour simuler un rapport budgétaire simple
    bot.command('budgetreport', async (ctx) => {
        ctx.reply("📊 Génération du rapport budgétaire (simulation)..");
        // Ici, vous généreriez un rapport réel depuis votre base de données financière.
        const report = "Rapport Budgétaire Mensuel (Juin 2024):\n\n" +
                       "Revenus: 15,000 EUR\n" +
                       "Dépenses: 7,500 EUR\n" +
                       "Profit: 7,500 EUR\n\n" +
                       "Statut: Sur la bonne voie ! ✅";
        await ctx.reply(report);
    });

    // Réponse par défaut
    bot.on('message', (ctx) => {
        if (!ctx.message.text.startsWith('/')) {
            ctx.reply("Je suis le bot Finance. Utilisez `/expense [détails]` pour enregistrer une dépense ou `/budgetreport` pour un aperçu.");
        }
    });

    console.log("Finance Bot handler initialized.");
}

module.exports = { init };