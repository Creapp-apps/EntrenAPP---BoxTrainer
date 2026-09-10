import fs from 'fs';
import https from 'https';

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Error: SUPABASE_ACCESS_TOKEN environment variable is not set.");
}
const projectRef = process.env.SUPABASE_PROJECT_REF || 'qebwydkngjzronfnfigd';

export function runSql(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
    const req = https.request(
      {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${projectRef}/database/query`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            resolve(data);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// CLI usage: node scripts/supabase-query.mjs "SELECT 1" or node scripts/supabase-query.mjs path/to/file.sql
if (process.argv[2]) {
  let query = process.argv.slice(2).join(' ');
  if (fs.existsSync(query)) {
    query = fs.readFileSync(query, 'utf8');
  }
  runSql(query)
    .then((res) => {
      console.log('Result:', JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}
