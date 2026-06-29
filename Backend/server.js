import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// 1. UptimeRobot Ping Route (Keeps server awake)
app.get('/ping', (req, res) => {
    res.status(200).send("Server is awake!");
});

// 2. Fetch All Listings Route
app.get('/api/listings', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
        res.json(data);
    } catch (error) {
        console.error("Error reading data.json:", error);
        res.status(500).json({ error: "Failed to read data archive" });
    }
});

// 3. Groq AI Smart Search Route
app.post('/api/search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    try {
        const data = fs.readFileSync('./data.json', 'utf8');

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful Gujarati Local Directory Assistant. Below is a JSON list of available service providers in Gujarat:\n${data}\n\nYour task: Analyze the user's problem/query, find the most relevant entries from the data, and return ONLY a valid JSON array containing the matching objects. Do not include any conversational text, markdowns, or explanations. If no match is found, return an empty array [].`
                    },
                    {
                        role: "user",
                        content: query
                    }
                ],
                temperature: 0.1
            })
        });

        const groqData = await response.json();
        
        // Safety validation to protect against crashes if Groq returns an error object
        if (!groqData.choices || !groqData.choices[0]) {
            console.error("Groq API Error Payload:", groqData);
            return res.status(500).json({ error: "Invalid response layout from AI provider" });
        }

        let rawContent = groqData.choices[0].message.content.trim();
        
        // Clean up markdown block wraps if present
        if (rawContent.startsWith("```json")) {
            rawContent = rawContent.replace(/```json|```/g, "").trim();
        }

        const filteredListings = JSON.parse(rawContent);
        res.json(filteredListings);

    } catch (error) {
        console.error("Error processing search:", error);
        res.status(500).json({ error: "Failed to process search with AI" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
