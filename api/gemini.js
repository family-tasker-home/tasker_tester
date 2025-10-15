// api/gemini.js
// Vercel Serverless Function для проксі-запитів до Gemini API
// Кожен користувач має свій виділений API ключ

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
    // Всі ключі використовують gemini-2.0-flash (кращі ліміти)
    const API_CONFIGS = [
      {
        key: process.env.GEMINI_API_KEY_1, // Admin
        model: 'gemini-2.0-flash',
        user: 'Admin'
      },
      {
        key: process.env.GEMINI_API_KEY_2, // Настя
        model: 'gemini-2.0-flash',
        user: 'Настя'
      },
      {
        key: process.env.GEMINI_API_KEY_3, // Микола
        model: 'gemini-2.0-flash',
        user: 'Микола'
      },
      {
        key: process.env.GEMINI_API_KEY_4, // Лев
        model: 'gemini-2.0-flash',
        user: 'Лев'
      },
      {
        key: process.env.GEMINI_API_KEY_5, // Ярик та Анонім (спільний)
        model: 'gemini-2.0-flash',
        user: 'Ярик/Анонім'
      }
    ].filter(config => config.key); // Фільтруємо тільки ті, що мають ключі

    if (API_CONFIGS.length === 0) {
      return res.status(500).json({ 
        error: 'No API keys configured',
        message: 'Please add GEMINI_API_KEY_1 through GEMINI_API_KEY_5 to Vercel Environment Variables'
      });
    }

    // Отримуємо індекс API з запиту (кожен користувач має свій виділений індекс)
    const requestedIndex = req.body.apiKeyIndex !== undefined ? req.body.apiKeyIndex : 4;
    
    // Перевіряємо що індекс існує
    if (requestedIndex >= API_CONFIGS.length) {
      return res.status(400).json({ 
        error: 'Invalid API key index',
        message: `Requested index ${requestedIndex} but only ${API_CONFIGS.length} keys available`,
        availableKeys: API_CONFIGS.length
      });
    }

    const currentConfig = API_CONFIGS[requestedIndex];

    // Отримуємо дані з тіла запиту
    const { contents, generationConfig } = req.body;

    if (!contents) {
      return res.status(400).json({ error: 'Missing required field: contents' });
    }

    console.log(`🔑 Using API key ${requestedIndex} for user: ${currentConfig.user}`);

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
      console.error(`❌ Gemini API error for key ${requestedIndex}:`, errorText);
      
      return res.status(geminiResponse.status).json({ 
        error: 'Gemini API error',
        details: errorText,
        usedApiIndex: requestedIndex,
        assignedUser: currentConfig.user,
        model: currentConfig.model
      });
    }

    const data = await geminiResponse.json();
    
    console.log(`✅ Success for API key ${requestedIndex} (${currentConfig.user})`);
    
    // Відправляємо відповідь клієнту
    return res.status(200).json({
      ...data,
      usedApiIndex: requestedIndex,
      assignedUser: currentConfig.user,
      model: currentConfig.model
    });

  } catch (error) {
    console.error('❌ Internal error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};
