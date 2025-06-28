// heavy-worker.js
const { parentPort } = require('worker_threads');

parentPort.on('message', (message) => {
    if (message.type === 'startHeavyTask') {
        console.log(`[Worker Thread] Starting CPU intensive task for worker pid=${process.pid}`);
        let total = 0;
        // Simule une tâche bloquante pour 6 secondes
        for (let i = 0; i < 6_000_000_000; i++) {
            total++;
        }
        console.log(`[Worker Thread] Finished CPU intensive task. Total: ${total}`);
        parentPort.postMessage({ type: 'heavyTaskComplete', result: `The result of the CPU intensive task is ${total}\n` });
    }
});