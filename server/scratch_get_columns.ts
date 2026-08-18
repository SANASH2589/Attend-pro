import { supabaseAdmin } from './lib/supabase';

async function main() {
  const { data, error } = await supabaseAdmin.from('students').select('*').limit(1);
  if (error) {
    console.error('Error fetching student:', error);
    process.exit(1);
  }
  console.log('Current student record columns:', data ? Object.keys(data[0] || {}) : 'No data');
  console.log('Full first record details:', data?.[0]);
}

main();
