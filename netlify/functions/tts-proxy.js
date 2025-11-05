// This is a new Netlify serverless function for Text-to-Speech.
// It receives text and voice preferences, adds the secret API key,
// and calls the Google Gemini TTS API directly.

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'API_KEY environment variable not set in Netlify.' }) 
    };
  }
  
  const { text, voice } = JSON.parse(event.body);
  if (!text || !text.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Text is required.' }) };
  }

  const model = "gemini-2.5-flash-preview-tts";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      parts: [{ text: text }]
    }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice || 'Kore' } // Default to Kore (female)
        }
      }
    }
  };

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await geminiResponse.json();

    if (!geminiResponse.ok) {
       console.error('Gemini API Error:', responseData);
       return {
         statusCode: geminiResponse.status,
         body: JSON.stringify(responseData),
       };
    }

    const audioContent = responseData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioContent) {
        console.error('Failed to extract audio content from response:', responseData);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to extract audio content from Gemini response.' })
        };
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioContent: audioContent }),
    };

  } catch (error) {
    console.error('TTS Proxy Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred in the TTS proxy function.', details: error.message }),
    };
  }
};
