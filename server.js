const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const AUTOMATIQ_URL = 'https://app.sync.automatiq.com/webhook/sms';

// ✅ Helper to ensure phone number starts with "1" and has only digits
function normalizePhone(num) {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 10) {
    return '1' + digits;
  }
  return digits;
}

// Custom parser for multiple content types
app.use('/sms', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    bodyParser.json()(req, res, next);
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    bodyParser.urlencoded({ extended: true })(req, res, next);
  } else {
    bodyParser.raw({ type: '*/*', limit: '1mb' })(req, res, next);
  }
});

app.post('/sms', async (req, res) => {
  try {
    let toNumber = '';
    let message = '';
    const contentType = req.headers['content-type'] || '';
    console.log('📦 Content-Type:', contentType);

    if (Buffer.isBuffer(req.body)) {
      const rawText = req.body.toString('utf-8');
      console.log('🔵 Raw buffer body:\n' + rawText);

      const lines = rawText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const [key, ...rest] = line.split(':');
        const value = rest.join(':').trim();

        if (key.toLowerCase().includes('receiver')) {
          toNumber = value.replace(/"[^"]*"\s*/, '').trim(); // remove "1.01" or similar
        } else if (key.toLowerCase().includes('message')) {
          message = value;
        } else if (
          !line.includes(':') &&
          i > 0 &&
          i === lines.length - 1 &&
          !message
        ) {
          message = line;
        }
      }
    } else if (typeof req.body === 'object') {
      console.log('🔵 Parsed structured body:', req.body);
      console.log('🧩 Available keys:', Object.keys(req.body));
      toNumber = req.body.Receiver || req.body.receiver || '';
      message = req.body.Message || req.body.message || '';
    } else {
      console.log('🟠 Unknown body type:', typeof req.body);
    }

    if (!toNumber || !message) {
      return res.status(400).json({ error: 'Missing receiver (TO number) or message.' });
    }

    const normalizedNumber = normalizePhone(toNumber);

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
      console.warn('⚠️ OTP not found — forwarding anyway');
    }

    const payload = {
      number: normalizedNumber,
      service,
      otp_code: otp || '',
      message
    };

    console.log('📤 Sending JSON to Automatiq:', JSON.stringify(payload, null, 2));

    await axios.post(AUTOMATIQ_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.status(200).send('Forwarded to Automatiq');
  } catch (err) {
    console.error('🔥 Middleware Error:', err.message);
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Middleware running on port ${PORT}`));
