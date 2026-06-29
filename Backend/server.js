import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Route to get all listings
app.get('/api/listings', (req, res) => {
    const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
    res.json(data);
});

// Add this route to handle UptimeRobot pings
app.get('/ping', (req, res) => {
    res.status(200).send("Server is awake!");
});

// Route for Groq AI Search
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
                model: "llama-3.1-70b-versatile",
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
        let rawContent = groqData.choices[0].message.content.trim();
        
        // Clean up markdown block if Groq wraps it in ```json
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
