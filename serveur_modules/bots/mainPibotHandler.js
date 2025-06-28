// bots/mainPibotHandler.js
const fs = require('fs');

let groq;       // Instance Groq (maintenant utilisée par défaut pour le texte)
let openai;
let genAI;      // Instance Gemini (maintenue si des usages spécifiques sont prévus, mais non utilisée par défaut ici)
let botsNetwork;

// Fonction générique pour la génération de contenu AVEC GROQ
async function generateContentWithGroq(prompt, systemInstruction, modelName = 'gemma2-9b-it') {
    console.log("DEBUG: generateContentWithGroq (pour Groq) appelée.");
    console.log("DEBUG: Prompt Groq:", prompt);
    console.log("DEBUG: System Instruction Groq:", systemInstruction);
    console.log("DEBUG: Modèle Groq:", modelName);

    try {
        if (!groq) {
            console.error("ERREUR: Instance Groq non initialisée dans generateContentWithGroq.");
            throw new Error("Groq API not initialized.");
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt },
            ],
            model: modelName,
            temperature: 0.7,
            max_tokens: 4048,
        });

        const content = chatCompletion.choices[0].message.content;
        console.log("DEBUG: Réponse de Groq reçue. Contenu:", content.substring(0, 200) + "...");
        return content;
    } catch (error) {
        console.error("Erreur lors de la génération de contenu avec Groq:", error);
        throw new Error("Une erreur est survenue lors de la génération de contenu avec Groq.");
    }
}

// Les fonctions suivantes utiliseront maintenant generateContentWithGroq
async function generateArabicContent(prompt) {
    try {
        const systemInstruction = "Vous êtes une AGI, une intelligence artificielle spécialisée dans la génération de contenu de tout type/format dans tout secteur d'activité. Répondez de manière informative, créative et précise en arabe. Votre objectif est de fournir des informations de haute qualité ou des textes créatifs en arabe.";
        const arabicContent = await generateContentWithGroq(prompt, systemInstruction); // <-- Utilise Groq
        return arabicContent;
    } catch (error) {
        console.error("Détails de l'erreur dans generateArabicContent (mainPibotHandler):", error);
        throw new Error("Une erreur est survenue lors de la génération de contenu en arabe.");
    }
}

async function generateGuide(subject) {
    try {
        const systemInstruction = `Génération d'un guide. Votre rôle est de créer un guide étape par étape sur le sujet donné.`;
        const guideContent = await generateContentWithGroq(`Génère un guide sur ${subject}.`, systemInstruction, 'gemma2-9b-it'); // <-- Utilise Groq

        const outputFilePath = `HowTo-${subject}_` + new Date().toISOString().replace(/[-:TZ]/g, "") + ".md";
        fs.writeFileSync(outputFilePath, guideContent);
        return { content: guideContent, filePath: outputFilePath };
    } catch (error) {
        console.error("Une erreur s'est produite lors de la génération du guide (mainPibotHandler):", error);
        throw new Error(`Erreur : ${error.message}`);
    }
}

async function generateBusinessPlan(projectDetails) {
    try {
        const systemInstruction = `Vous êtes un expert en création de business plans détaillés et structurés. Vous allez générer un plan complet basé sur les informations fournies par l'utilisateur. Le plan doit inclure les sections suivantes, formatées en Markdown pour une meilleure lisibilité, Tu utiliseras des emoji intélligent lorsque c'est possible :
                    1. Résumé Exécutif 📝
                    2. Description de l'Entreprise/Projet 💡
                    3. Analyse du Marché (Clientèle Cible, Concurrence) 📊
                    4. Produit/Service 🚀
                    5. Stratégie Marketing et Ventes 🎯
                    6. Plan Opérationnel ⚙️
                    7. Équipe de Gestion (si l'information est disponible) 🤝
                    8. Plan Financier (Hypothèses, Projections de revenus, Coûts principaux) 💰
                    9. Stratégie de Monétisation (si applicable) 💲
                    10. Annexe (si nécessaire) 📎

                    Rédigez le business plan de manière professionnelle, concise et claire. Adaptez le contenu aux détails fournis par l'utilisateur.`;

        const bpContent = await generateContentWithGroq(`Génère un business plan basé sur les informations suivantes :
                    ${projectDetails}`, systemInstruction, 'gemma2-9b-it'); // <-- Utilise Groq

        if (!bpContent) {
            throw new Error("La génération du business plan n'a retourné aucun contenu.");
        }

        const projectName = projectDetails.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_');
        const outputFilePath = `BusinessPlan-${projectName}_` + new Date().toISOString().replace(/[-:TZ]/g, "") + ".md";
        fs.writeFileSync(outputFilePath, bpContent);

        return { content: bpContent, filePath: outputFilePath };
    } catch (error) {
        console.error("Erreur détaillée lors de la génération du business plan avec Groq (mainPibotHandler):", error);
        throw new Error("Une erreur est survenue lors de la génération du business plan.");
    }
}

// NOTE: La fonction generateImage nécessite toujours l'instance OpenAI si elle est utilisée.
async function generateImage(prompt) {
    if (!openai) {
        throw new Error("OpenAI API not initialized. Cannot generate images.");
    }
    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
    });
    return response.data[0].url;
}


// This function will be called by the main server file to initialize the bot
function init(bot, dependencies) {
    groq = dependencies.groq;
    openai = dependencies.openai;
    genAI = dependencies.gemini; // Garde l'instance Gemini, même si non utilisée par défaut
    botsNetwork = dependencies.botsNetwork;

    // Définition de votre rôle spécifique pour le chatbot principal (pour Groq)
    const context = "Tu es une AGI, une intelligence artificielle de haut potentiel maîtrisant les normes du Web sémantique W3C, langage de programmation associée les techniques et les méthodes d'apprentissage automatique. Tu es au cœur de notre salon télégram.'";


    // --- Telegram Commands for this bot ---

    bot.command('start', (ctx) => {
        console.log("DEBUG: Commande /start reçue.");
        ctx.reply('Bonjour ! Je suis votre AGI principal, propulsé par Groq, et je suis opérationnel ! Comment puis-je vous aider ?');
    });

    // Commande /arabe (maintenant propulsée par Groq)
    bot.command('arabe', async (ctx) => {
        console.log("DEBUG: Commande /arabe reçue.");
        const userInput = ctx.message.text.split(' ').slice(1).join(' ');
        if (!userInput) {
            ctx.reply("يرجى تقديم وصف للمحتوى العربي الذي ترغب في إنشائه. مثال: `/arabe اكتب مقالًا عن أهمية الذكاء الاصطناعي في التعليم`");
            return;
        }
        ctx.reply("جاري إنشاء المحتوى العربي via Groq, يرجى الانتظار...");
        try {
            const arabicContent = await generateArabicContent(userInput); // Utilise la fonction adaptée (Groq)
            await ctx.reply(arabicContent);
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande /arabe:", error);
            ctx.reply("عذرًا، حدث خطأ أثناء إنشاء المحتوى.");
        }
    });

    bot.command('network', async (ctx) => {
        console.log("DEBUG: Commande /network reçue.");
        const task = ctx.message.text.split(' ').slice(1).join(' ');
        if (!task) {
            ctx.reply("Veuillez fournir une tâche pour coordonner le réseau de bots.");
            return;
        }
        ctx.reply("Coordination du réseau de bots en cours...");
        try {
            // Note: Ces appels simulent l'interaction. Pour une vraie interaction,
            // le bot principal devrait envoyer un message ou une commande au bot worker, etc.
            const backendResult = await botsNetwork.worker_Pibot.processBackend(task); // <-- Notez le _Pibot
            const frontendResult = await botsNetwork.neofs_Pibot.processFrontend(task); // <-- Notez le _Pibot
            const visualResult = await botsNetwork.Pi_ia_bot.processVisualAnalysis(task); // <-- Notez le _ia_bot

            const finalResult = `Coordination réussie entre les bots :\n\n${backendResult}\n${frontendResult}\n${visualResult}`;
            ctx.reply(finalResult);
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande /network:", error);
            ctx.reply("Erreur lors de la coordination.");
        }
    });

    // Commande /imagine (utilise toujours OpenAI pour DALL-E)
    bot.command('imagine', async (ctx) => {
        console.log("DEBUG: Commande /imagine reçue.");
        const userInput = ctx.message.text.split(' ').slice(1).join(' ');
        if (!userInput) {
            ctx.reply("Veuillez fournir une description pour générer l'image. Exemple: `[ Génère une image multidimensionnelle de haute définition illustrant la beauté des meta données mettant en lumière la nature des choses. l'image doit être format 16:9 .webp]`");
            return;
        }
        ctx.reply("Génération de l'image en cours via OpenAI, veuillez patienter...");
        try {
            const imageUrl = await generateImage(userInput);
            const responseFetch = await fetch(imageUrl);
            const arrayBuffer = await responseFetch.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const fileName = `Image_${new Date().toISOString().replace(/[:.]/g, "-")}.webp`;
            fs.writeFileSync(fileName, buffer);
            await ctx.replyWithPhoto({ source: fileName }, { caption: `Voici votre image générée : ${userInput}` });
            fs.unlinkSync(fileName);
        } catch (error) {
            console.error("Erreur lors de l'envoi de l'image (mainPibotHandler):", error);
            ctx.reply("Désolé, une erreur s'est produite lors de la génération de l'image.");
        }
    });

    // Commande /generate (maintenant propulsée par Groq)
    bot.command('generate', async (ctx) => {
        console.log("DEBUG: Commande /generate reçue.");
        const subject = ctx.message.text.split(' ')[1] || 'HowTo_';
        ctx.reply(`Génération du guide pour le sujet : ${subject} via Groq...`);
        try {
            const { content: mdContent, filePath } = await generateGuide(subject); // Utilise la fonction adaptée (Groq)
            await ctx.reply(mdContent, { parse_mode: 'Markdown' });
            await ctx.replyWithDocument({ source: filePath }, { caption: `Le guide sur ${subject} a été généré !` });
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande /generate:", error);
            ctx.reply(`Erreur lors de la génération du guide.`);
        }
    });

    // Commande /plan (maintenant propulsée par Groq)
    bot.command('plan', async (ctx) => {
        console.log("DEBUG: Commande /plan reçue.");
        const userInput = ctx.message.text.split(' ').slice(1).join(' ');
        if (!userInput) {
            ctx.reply("Veuillez fournir les détails de votre projet pour générer un business plan. \n\nExemple : `/businessplan Nom du projet: EcoGarden; Secteur: Agriculture urbaine; Produit: Kits de jardinage intelligents; Cible: Particuliers éco-conscients; Objectifs: Vente 1000 kits en an 1.`");
            return;
        }
        ctx.reply("Génération de votre business plan en cours via Groq, cela peut prendre quelques instants en fonction de la complexité. Veuillez patienter...");
        try {
            const { content: bpContent, filePath } = await generateBusinessPlan(userInput); // Utilise la fonction adaptée (Groq)
            await ctx.reply(bpContent, { parse_mode: 'Markdown' });
            await ctx.replyWithDocument({ source: filePath }, { caption: `Votre business plan a été généré avec succès !` });
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error("Erreur lors de l'exécution de la commande /plan:", error);
            ctx.reply("Désolé, une erreur s'est produite lors de la génération de votre business plan. Veuillez vérifier votre requête et réessayer.");
        }
    });

    // Gestionnaire de messages par défaut pour le chat général (propulsé par GROQ)
    bot.on('message', async (ctx) => {
        const message = ctx.message.text;
        console.log("DEBUG: Message non-commande reçu pour le chat général (via Groq):", message);

        if (message.startsWith('/')) {
            console.log("DEBUG: Message est une commande, ignoré par bot.on('message').");
            return;
        }

        if (!message || message.trim() === '') {
            console.log("DEBUG: Message vide ou juste des espaces, ignoré.");
            return;
        }

        ctx.reply('Réflexion en cours via Groq... 🤖');
        console.log("DEBUG: Message de 'Réflexion en cours...' envoyé.");

        try {
            const systemPrompt = context;
            const userPrompt = `Lorsque j'exécute la commande /myprompt une Machine à optimiser les prompts pour le \"Projet\". Voici ## votre contexte, ## vos rôles, ## vos compétences, ## vos tâches, ## votre processus, et ## les caractéristiques, ## Actions Immédiates recherchées, ## emoji intelligence associée: ${message}`;

            console.log("DEBUG: Appelle generateContentWithGroq pour le chat général.");
            const chatCompletion = await generateContentWithGroq(userPrompt, systemPrompt, 'gemma2-9b-it');

            if (chatCompletion) {
                await ctx.reply(chatCompletion);
                console.log("DEBUG: Réponse du chatbot (Groq) envoyée avec succès.");
            } else {
                await ctx.reply("Désolé, je n'ai pas pu générer de réponse via Groq. Le contenu est vide.");
                console.error("ERREUR: generateContentWithGroq a retourné un contenu vide.");
            }

        } catch (error) {
            console.error('ERREUR: Échec de la génération de la complétion de chat avec Groq:', error);
            if (error.message.includes("Groq API not initialized") || error.message.includes("API key not valid")) {
                 await ctx.reply('⚠️ Erreur de configuration de l\'API Groq. Veuillez vérifier la clé API.');
            } else if (error.message.includes("Quota exceeded") || error.message.includes("rate limit")) {
                 await ctx.reply('⚠️ Limite de requêtes API Groq atteinte. Veuillez patienter ou vérifier votre quota.');
            } else {
                await ctx.reply('Désolé, une erreur est survenue lors de la conversation avec l\'IA Groq.');
            }
        } 
    });

    console.log("Main PiBot handler initialized with full Groq support for text generation.");
}

module.exports = { init };