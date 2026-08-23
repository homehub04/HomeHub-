const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function callOpenRouter(messages) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      // OpenRouter asks for these two for free-tier routing/analytics — any values work locally
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:4000',
      'X-Title': 'Nzvimbo Rental Marketplace'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
      messages,
      temperature: 0.6
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ---- POST /api/ai/describe-listing ----  (landlord only)
// Body: { bedrooms, bathrooms, area_sqm, address, city, features }
router.post('/describe-listing', requireAuth, async (req, res) => {
  try {
    const { bedrooms, bathrooms, area_sqm, address, city, features } = req.body;

    const prompt = `Write a short, appealing rental listing description (max 60 words) for this
Zimbabwean property. Then on a new line, suggest a fair monthly USD rent range for the area.
Bedrooms: ${bedrooms}. Bathrooms: ${bathrooms}. Area: ${area_sqm || 'n/a'} sqm.
Location: ${address}, ${city}. Features: ${features || 'none listed'}.
Keep the tone plain and factual, no exaggeration, no emojis.`;

    const content = await callOpenRouter([
      { role: 'system', content: 'You are a concise, factual real-estate copywriter for the Zimbabwean rental market.' },
      { role: 'user', content: prompt }
    ]);

    res.json({ result: content });
  } catch (err) {
    console.error('AI describe-listing failed:', err.message);
    res.status(500).json({ error: 'AI request failed. Check OPENROUTER_API_KEY in .env' });
  }
});

// ---- POST /api/ai/chat-assist ----  (any logged-in user) — general assistant for the AI screen
// Body: { message, history: [{role, content}, ...] }
router.post('/chat-assist', requireAuth, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const messages = [
      { role: 'system', content: 'You are Nzvimbo\'s in-app assistant, helping landlords and tenants with rental listings in Zimbabwe. Be brief and practical.' },
      ...history,
      { role: 'user', content: message }
    ];
    const content = await callOpenRouter(messages);
    res.json({ result: content });
  } catch (err) {
    console.error('AI chat-assist failed:', err.message);
    res.status(500).json({ error: 'AI request failed. Check OPENROUTER_API_KEY in .env' });
  }
});

module.exports = router;
