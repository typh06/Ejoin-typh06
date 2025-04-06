const express = require('express');
const axios = require('axios');
const atob = require('atob');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const AUTOMATIQ_URL = 'https://sync.automatiq.com/api/gateway/sms';

app.post('/sms', async (req, res) => {
  try {
    console.log('Incoming request:', JSON.stringify(req.body, null, 2));

    const smsArray = req.body.sms;
    if (!smsArray || !Array.isArray(smsArray) || smsArray.length === 0) {
      return res.status(400).json({ error: 'Invalid or missing "sms" array in payload.' });
    }

    const sms = smsArray[0];
    const base64Message = sms[5];
    const decodedMsg = atob(base64Message);
    const sender = sms[3];

    // === Auto-detect service type ===
    let service = 'SG'; // default fallback
    const lowerText = decodedMsg.toLowerCase();
    if (lowerText.includes('ticketmaster')) {
      service = 'TM';
    } else if (lowerText.includes('axs')) {
      service = 'AXS';
    } else if (lowerText.includes('seatgeek')) {
      service = 'SG';
    }

    // === Extract OTP code ===
    const match = decodedMsg.match(/(\d{4,8})/);
    const otp = match ? match[1] : null;

    if (!otp) {
      return res.status(400).json({ error: 'OTP not found in message.' });
    }

    const payload = {
      number: sender,
      service,
      otp_code: otp,
      message: decodedMsg
    };

    await axios.post(AUTOMATIQ_URL, payload);
    console.log('Forwarded to Automatiq:', payload);

    res.status(200).send('Forwarded to Automatiq');
  } catch (err) {
    console.error('Middleware Error:', err.message);
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Middleware running on port ${PORT}`));
