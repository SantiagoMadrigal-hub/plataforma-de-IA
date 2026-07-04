const { createClient } = require('@supabase/supabase-js');

let client;

function getDb() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configuradas');
  }
  client = createClient(url, key);
  return client;
}

module.exports = { getDb };
