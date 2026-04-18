require('dotenv').config();
const axios = require('axios');

async function test() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await axios.get(url);
        console.log(res.data.models.map(m => m.name));
    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
    }
}
test();
