// public/js/config.js

// This file contains configuration constants for the frontend.
// Do NOT put sensitive API keys here!

const config = {
    // Backend API endpoints (replace with your actual server URL if not localhost)
    backendUrl: 'http://localhost:3000', // Or process.env.PORT if you want to be dynamic for dev

    // API routes exposed by srv.js
    apiEndpoints: {
        generate: '/generate',          // For AI text generation (Groq)
        command: '/command',            // For terminal commands
        getAppConfig: '/api/config',    // To get frontend app configuration (e.g., Telegram IDs)
        saveAppConfig: '/api/config',   // To save frontend app configuration
        heavyTask: '/api/heavy-task',   // To trigger the heavy computing task
        telegramMessages: '/api/telegram/messages', // To fetch incoming Telegram messages
        sendTelegramMessage: '/api/telegram/send',  // To send messages via Telegram bot
    },

    // Default values for client-side settings (can be overridden by public/config.json)
    defaultPollingInterval: 5000, // Default Telegram message polling interval in ms (5 seconds)
    defaultTelegramChatId: null,  // Default Telegram Chat ID
    defaultTelegramTopicId: null, // Default Telegram Topic ID

    // Other frontend-specific configurations
    // Example: Feature flags, UI themes, etc.
    features: {
        webXrEnabled: true,
        terminalEnabled: true,
        heavyTaskEnabled: true,
    },

    // Message limits for UI display (example)
    maxChatMessageLength: 2000,
    maxTerminalOutputLength: 5000,
};

// Export the config object (for modules) or make it globally available
// If your frontend uses ES Modules:
// export default config;

// If your frontend uses global scripts (more common for simple HTML/JS setups):
// Make 'config' accessible globally, assuming this script loads first.
// window.appConfig = config; // Or simply 'config' if it's the only script
// For simplicity in this context, we'll assume it's directly accessible.