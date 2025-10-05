const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

console.log(`Starting server on port ${PORT}`);

app.get('/', (req, res) => {
  console.log('GET / request received');
  res.json({ message: 'Server is working!' });
});

app.get('/api/test', (req, res) => {
  console.log('GET /api/test request received');
  res.json({ message: 'API is working!' });
});

// Make sure to listen on 0.0.0.0, not localhost
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});