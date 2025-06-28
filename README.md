Canvas de Conversation IA
## Introduction

Le Canvas de Conversation IA est une application web interactive qui vous permet d'explorer et d'interagir avec différentes instances d'intelligence artificielle, de gérer des commandes système (comme un terminal), et d'intégrer des services externes comme Telegram. Conçu avec Node.js (Express), JavaScript pur (Frontend) et Tailwind CSS, ce projet sert de plateforme expérimentale pour l'intégration de modèles d'IA et la gestion de tâches asynchrones.

Fonctionnalités
Chatbot IA Dynamique : Interagissez avec un modèle d'IA (Groq par défaut, configurable) avec un contexte de conversation persistant.

Rôles d'IA Spécifiques : Lancez des chatbots avec des rôles prédéfinis (ex: "Conseiller Dev") pour des interactions ciblées.

Intégration Telegram : Envoyez et recevez des messages via un bot Telegram dédié (meta_Pibot), avec gestion des Chat ID et Topic ID configurables.

Terminal Virtuel : Exécutez des commandes système autorisées (ls -la, pwd, git status) directement depuis l'interface.

Gestion des Paramètres : Une interface utilisateur dédiée pour configurer des paramètres clés de l'application, notamment les IDs Telegram, sauvegardés dans un fichier config.json.

Tâches Asynchrones (Service Lourd) : Déclenchez des opérations intensives en CPU via un service séparé, démontrant une architecture non bloquante.

Pagination des Icônes : Interface d'accueil Android-like avec des icônes paginées pour un accès facile aux différentes fonctionnalités.

WebXR (expérimental) : Préparation à l'intégration de sessions de réalité augmentée/virtuelle.

Journalisation (Logging) : Enregistrement des interactions et des erreurs dans un fichier logs.json pour le débogage et l'audit.

Technologies Utilisées
Backend :

Node.js

Express.js : Framework web pour les API REST.

Groq SDK : Intégration avec des modèles d'IA rapides (par ex., Llama 3, Gemma 2).

Telegraf : Framework pour l'intégration du bot Telegram.

dotenv : Gestion des variables d'environnement.

fs, path, child_process, worker_threads : Modules Node.js pour la gestion des fichiers, des chemins et des processus.

cors : Gestion des requêtes Cross-Origin.

Frontend :

HTML5

JavaScript (Vanilla JS) : Logique client.

Tailwind CSS : Framework CSS pour le stylisme rapide et réactif.

Font Awesome : Icônes.

WebXR Polyfill : Pour la compatibilité WebXR.

Installation
Suivez ces étapes pour configurer et exécuter le projet localement.

Prérequis
Node.js (version 18 ou supérieure recommandée)

npm (normalement inclus avec Node.js)

Une clé API Groq (obtenue sur Groq Cloud)

Un bot Telegram et son token (créé via BotFather sur Telegram)

Un Chat ID Telegram où votre bot est administrateur (obtenu en envoyant /start à votre bot et en notant l'ID).

1. Cloner le Dépôt
Bash

git clone https://github.com/ia-local/canvas.git
cd canvas
2. Installer les Dépendances
Bash

npm install
3. Configuration des Variables d'Environnement
Créez un fichier .env à la racine du projet et ajoutez-y les variables suivantes :

Extrait de code

GROQ_API_KEY=votre_cle_api_groq_ici
BOT_TOKEN_META_PIBOT=votre_token_bot_telegram_ici
HEAVY_PORT=4000 # Port pour le service de tâche lourde (peut être ajusté)
PORT=3000 # Port pour le serveur principal (peut être ajusté)
Note importante pour les Chat ID et Topic ID Telegram : Ces IDs ne sont pas dans le .env mais sont configurés directement via l'interface des Paramètres de l'application frontend et sauvegardés dans public/config.json.

4. Lancement des Services
Pour un fonctionnement complet, vous devez lancer le serveur principal et le service de tâche lourde (qui tourne sur un port séparé pour éviter le blocage).

Option A: Lancement Manuel (Recommandé pour comprendre)

Ouvrez deux terminaux distincts à la racine de votre projet.

Terminal 1 (Service de tâche lourde) :

Bash

node heavy.js
Vous devriez voir un message comme : Heavy service listening on port 4000

Terminal 2 (Serveur principal) :

Bash

node server.js
Vous devriez voir des messages indiquant que le serveur Groq Express est démarré, les APIs disponibles et le bot Telegram lancé.

Option B: Lancement Automatisé (pour le développement)

Le fichier server.js inclut une logique pour lancer heavy.js automatiquement en mode development. Vous pouvez simplement exécuter :

Bash

node server.js
Le service heavy.js sera sponné en tant que processus enfant.

5. Accès à l'Application
Après avoir lancé les serveurs, ouvrez votre navigateur web et accédez à :

http://localhost:3000/
Utilisation
Écran d'Accueil (Android-like)
L'application s'ouvre sur un écran avec des icônes.

IA Core / Conseiller Dev : Cliquez sur ces icônes pour lancer une conversation avec une IA spécialisée dans le chat. Vous pouvez ensuite taper vos prompts dans la zone de texte principale.

Telegram : Sélectionne l'intégration Telegram. Tous les messages que vous tapez seront envoyés à votre bot Telegram configuré. Les réponses du bot Telegram apparaîtront également dans le chat de l'application.

Terminal : Permet d'exécuter des commandes système spécifiques.

Tâche Lourde : Déclenche une opération intensive en CPU sur le serveur sans bloquer l'interface.

Paramètres (⚙️) : Ouvre un modal où vous pouvez configurer les Chat ID et Topic ID de votre bot Telegram, ainsi que d'autres paramètres.

Configuration des Paramètres
Cliquez sur l'icône Paramètres (⚙️).

Entrez votre Telegram Chat ID (celui que vous avez obtenu en envoyant /start à votre bot).

Si vous utilisez les topics Telegram, entrez un Topic ID pour le canal général.

Ajustez la "Fréquence de Polling Telegram" si nécessaire.

Cliquez sur Sauvegarder les paramètres.

Important : Pour que les changements Telegram prennent effet, retournez à l'écran d'accueil et re-sélectionnez l'icône Telegram.

Historique de Conversation
L'application maintient un historique de conversation pour chaque session de chatbot, permettant à l'IA de conserver le contexte.

Structure du Projet
.
├── server.js               # Serveur Node.js principal (API Groq, Telegram, Configuration)
├── heavy.js                # Serveur Express pour la tâche lourde (simule un microservice)
├── .env                    # Variables d'environnement
├── package.json            # Dépendances Node.js et scripts
├── public/                 # Fichiers frontend statiques
│   ├── index.html          # Page HTML principale de l'application
│   ├── css/
│   │   └── style.css       # Styles CSS personnalisés (si non intégré à Tailwind)
│   ├── js/
│   │   ├── app.js          # Logique globale de l'application frontend (addMessage, setLoading, etc.)
│   │   ├── chatbot.js      # Logique du chatbot IA (Groq)
│   │   ├── telegramBot.js  # Logique d'intégration du bot Telegram
│   │   ├── pagination.js   # Gestion des icônes et de la pagination
│   │   └── modal.js        # Gestion des modaux (y compris les paramètres)
│   └── config.json         # Fichier de configuration dynamique (pour les paramètres frontend)
└── logs.json               # Fichier de journalisation des interactions
└── README.md               # Ce fichier
Contribution
Les contributions sont les bienvenues ! Si vous avez des idées d'amélioration ou trouvez des bugs, n'hésitez pas à ouvrir une issue ou à soumettre une pull request.

Licence
Ce projet est sous licence MIT License.

N'oubliez pas de :

Ajouter un bon screenshot.png dans un dossier docs/ (ou renommez le chemin). C'est la première chose que les gens verront !

Créer un fichier LICENSE à la racine de votre projet (généralement LICENSE ou LICENSE.md) avec les détails de la licence MIT.

Mettre à jour les URLs si votre dépôt GitHub change.

Ce README.md couvre bien les points clés et l'architecture de votre application. Bonne continuation !