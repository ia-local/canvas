// heavy.js - Corrected to be a standalone Express service
const express = require('express');
const app = express();
require('dotenv').config(); // Load environment variables for the heavy service too

// Get the port from environment variables, defaulting to 4000
const HEAVY_PORT = process.env.HEAVY_PORT || 4000;

app.use(express.json()); // Middleware to parse JSON if needed, though not strictly for this task

// Define the endpoint for the heavy task
app.get('/heavy', (req, res) => {
    console.log(`[Heavy Service] Received request for CPU intensive task. Process ID: ${process.pid}`);

    // Simulate a CPU-intensive, blocking task
    // In a real application, you might offload this to a true worker thread or another service
    // if the task is truly blocking and needs to be handled within this process.
    // For now, we'll keep it simple and just simulate a delay.
    let total = 0;
    const startTime = process.hrtime.bigint(); // High-resolution time

    // Simulate a blocking computation for about 6 seconds (adjust based on CPU power)
    // This loop is intentionally CPU-bound.
    for (let i = 0; i < 6_000_000_000; i++) { // Adjusted loop count for a noticeable delay
        total++;
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    const result = `Heavy task completed. Total calculations: ${total}. Duration: ${durationMs.toFixed(2)} ms.`;
    console.log(`[Heavy Service] ${result}`);

    res.status(200).send(result);
});

// Start the heavy service
app.listen(HEAVY_PORT, () => {
    console.log(`🟢 Heavy service listening on port ${HEAVY_PORT}. PID: ${process.pid}`);
    console.log(`Access at: http://localhost:${HEAVY_PORT}/heavy`);
});

// Optional: Basic error handling for the heavy service
app.use((err, req, res, next) => {
    console.error(`[Heavy Service] ❌ Error: ${err.message}`);
    res.status(500).send(`Heavy service error: ${err.message}`);
});