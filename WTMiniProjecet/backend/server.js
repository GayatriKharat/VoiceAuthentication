require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests from frontend
app.use(express.json()); // Parse JSON request bodies

// Serve frontend files (index.html, style.css, script.js) from the /frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Root route - serves the chat UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// API Endpoint for Chat
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        // Ensure you are pulling the correct key
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error("API Key is missing from .env file");
        }

        // Gemini API Endpoint
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await axios.post(
            url,
            {
                contents: [{
                    parts: [{ text: message }]
                }]
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        // Safety check: Ensure the response structure exists
        if (response.data.candidates && response.data.candidates[0].content) {
            const botReply = response.data.candidates[0].content.parts[0].text;
            res.json({ reply: botReply });
        } else {
            throw new Error("Empty response from AI - possibly a safety filter trigger.");
        }

    } catch (error) {
        // Log the actual error from Google to your terminal
        console.error("AI API Error Details:", error.response ? error.response.data : error.message);

        res.status(500).json({
            error: "Failed to fetch response from AI",
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
