// api/gemini.js
// Vercel Serverless Function для проксі-запитів до Gemini API

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // API конфігурації з environment variables
    const API_CONFIGS = [
      {
        key: process.env.GEMINI_API_KEY_1,
        model: 'gemini-2.0-flash-exp'
      },
      {
        key: process.env.GEMINI_API_KEY_2,
        model: 'gemini-2.0-flash'
      },
      {
        key: process.env.GEMINI_API_KEY_3,
        model: 'gemini-1.5-flash'
      },
      {
        key: process.env.GEMINI_API_KEY_4,
        model: 'gemini-2.5-flash'
      },
      {
        key: process.env.GEMINI_API_KEY_5,
        model: 'gemini-2.0-flash-lite'
      }
    ].filter(config => config.key); // Фільтруємо тільки ті, що мають ключі

    if (API_CONFIGS.length === 0) {
      return res.status(500).json({ 
        error: 'No API keys configured',
        message: 'Please add GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc. to Vercel Environment Variables'
      });
    }

    // Отримуємо індекс API з запиту або використовуємо перший
    const requestedIndex = req.body.apiKeyIndex || 0;
    const apiIndex = requestedIndex % API_CONFIGS.length;
    const currentConfig = API_CONFIGS[apiIndex];

    // Отримуємо дані з тіла запиту
    const { contents, generationConfig } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Missing required field: contents' });
    }

    // Робимо запит до Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${currentConfig.model}:generateContent?key=${currentConfig.key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: generationConfig || {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return res.status(geminiResponse.status).json({ 
        error: 'Gemini API error',
        details: errorText,
        usedApiIndex: apiIndex,
        totalApis: API_CONFIGS.length
      });
    }

    const data = await geminiResponse.json();
    
    // Відправляємо відповідь клієнту
    return res.status(200).json({
      ...data,
      usedApiIndex: apiIndex,
      totalApis: API_CONFIGS.length
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
