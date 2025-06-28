// bots/piIaBotHandler.js
const fs = require('fs');

let openai; // Will be set by init

async function generateImage(prompt) {
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1792x1024",
        });
        return response.data[0].url;
    } catch (error) {
        console.error("Erreur lors de la génération de l'image (piIaBotHandler):", error);
        throw new Error("Impossible de générer l'image.");
    }
}

function init(bot, dependencies) {
    openai = dependencies.openai;

    bot.command('visual', async (ctx) => {
        const visualInput = ctx.message.text.split(' ').slice(1).join(' ');
        if (!visualInput) {
            ctx.reply("Veuillez fournir un prompt pour l'analyse visuelle ou la génération d'image.");
            return;
        }
        ctx.reply("Analyse visuelle ou génération d'image en cours par @Pi-ia_bot...");
        try {
            const imageUrl = await generateImage(visualInput);
            const responseFetch = await fetch(imageUrl);
            const arrayBuffer = await responseFetch.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const fileName = `Visual_${new Date().toISOString().replace(/[:.]/g, "-")}.webp`;
            fs.writeFileSync(fileName, buffer);
            await ctx.replyWithPhoto({ source: fileName }, { caption: `@Pi-ia_bot a analysé et généré cette image pour: ${visualInput}` });
            fs.unlinkSync(fileName);
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande /visual (piIaBotHandler):", error);
            ctx.reply("Désolé, une erreur s'est produite lors de l'analyse visuelle.");
        }
    });

    bot.on('message', async (ctx) => {
        if (!ctx.message.text.startsWith('/')) {
            ctx.reply(`@Pi-ia_bot: Je gère l'analyse visuelle et la génération d'images. Utilisez /visual pour interagir.`);
        }
    });

    console.log("Pi-IA Bot handler initialized.");
}

module.exports = { init };