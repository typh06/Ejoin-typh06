const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();

// DO NOT use bodyParser.json or urlencoded globally — they interfere with raw
// Instead, apply bodyParser.raw ONLY to the /sms endpoint

const AUTOMATIQ_URL = 'https://sync.automatiq.com/api/gateway/sms';

app.post('/sms', bodyParser.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body)) {
      console.log('🟠 Expected raw buffer but got:', typeof req.body);
      return res.status(400).json({ error: 'Expected raw body' });
    }

    const rawText = req.body.toString('utf-8');
    console.log('🔵 Raw octet-stream body:\n' + rawText);

    // Parse key:value pairs
    const lines = rawText.split('\n');
    let sender = '', message = '';
    for (const line of lines) {
      const [key, ...rest] = line.split(':');
      const value = rest.join(':').trim();
      if (key.toLowerCase().includes('sender')) sender = value;
      if (key.toLowerCase().includes('message')) message = value;
    }

    if (!sender || !message) {
      return res.status(400).json({ error: 'Missing sender or message.' });
    }

    // Detect service
    let service = 'SG';
    const lowerText = message.toLowerCase();
    if (lowerText.includes('ticketmaster')) service = 'TM';
    else if (lowerText.includes('axs')) service = 'AXS';
    else if (lowerText.includes('seatgeek')) service = 'SG';

    // Extract OTP
    const match = message.match(/(\d{4,8})/);
    const otp = match ? match[1] : null;

    if (!otp) {
      return res.status(400).json({ error: 'OTP not found in message.' });
    }

    const payload = {
      number: sender,
      service,
      otp_code: otp,
      message
    };

    console.log('🟢 Forwarding to Automatiq:', payload);
    await axios.post(AUTOMATIQ_URL, payload);

    res.status(200).send('Forwarded to Automatiq');
  } catch (err) {
    console.error('🔥 Middleware Error:', err.message);
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Middleware running on port ${PORT}`));
