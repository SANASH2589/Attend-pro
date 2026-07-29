import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const url = `${process.env.SUPABASE_URL}/v1/sql`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const response = await axios.post(
      url,
      { query: 'SELECT 1 as result;' },
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('SQL Response:', response.data);
  } catch (error: any) {
    console.error('SQL Error:', error.response?.data || error.message);
  }
}

main();
