import { Pool } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    const keyRes = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'");
    const apiKey = keyRes.rows[0]?.setting_value;
    
    if (!apiKey) {
      console.log('No API key found in DB');
      process.exit(1);
    }

    console.log('API Key found, first 10 chars:', apiKey.substring(0, 10));
    
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    console.log('Fetching available models...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
    const data = await response.json();
    
    if (data.error) {
       console.error('API Error:', data.error);
    } else {
       console.log('Available Models:');
       data.models.forEach(m => {
          if (m.supportedGenerationMethods.includes("generateContent")) {
            console.log('-', m.name);
          }
       });
    }

  } catch (err) {
    console.error('Script Error:', err);
  } finally {
    await pool.end();
  }
}

check();
