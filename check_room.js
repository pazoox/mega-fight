const https = require('https');
const options = {
  hostname: 'gzffvlbocixlqwbnpint.supabase.co',
  path: '/rest/v1/rooms?id=eq.qs54ll&select=*',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZmZ2bGJvY2l4bHF3Ym5waW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NjIzMjQsImV4cCI6MjA4NjQzODMyNH0.xWgn-GlobJmC6MxnVo37600TzTdvZa1Euvi1idDB72Y',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZmZ2bGJvY2l4bHF3Ym5waW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NjIzMjQsImV4cCI6MjA4NjQzODMyNH0.xWgn-GlobJmC6MxnVo37600TzTdvZa1Euvi1idDB72Y'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); });
});

req.on('error', (e) => { console.error(e); });
req.end();