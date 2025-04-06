const express = require('express');
const axios = require('axios');
const atob = require('atob');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const AUTOMATIQ_URL = 'https://sync.automatiq.com/api/gateway/sms';

app.post('/sms', async (req, res) => {
  try {
    console.log('🔵 Raw request body:', JSON.stringify(req.body, null, 2));

    const smsArray = req.body.sms;

    if (!smsArray || !Array.isArray(smsArray)) {
      console.error('🔴 "sms" array is missing or malformed.');
      return res.status(400).json({ error: 'Invalid "sms" format.' });
    }

    const sms = smsArray[0];

    if (!sms || !Array.isArray(sms) || sms.length < 6) {
      console.error('🔴 First SMS entry is missing or incomplete.');
      return res.status(400).json({ error: 'Malformed SMS entry.' });
    }

    const base64Message = sms[5];
    const decodedMsg = atob(base64Message);
    const sender = sms[3];

    // Detect service type
    let service = 'SG';
    const lowerText = decodedMsg.toLowerCase();
    if (lowerText.includes('ticketmaster')) {
      service = 'TM';
    } else if (lowerText.includes('axs')) {
      service = 'AXS';
    } else if (lowerText.includes('seatgeek')) {
      service = 'SG';
    }

    // Extract OTP
    const match = decodedMsg.match(/(\d{4,8})/);
    const otp = match ? match[1] : null;

    if (!otp) {
      console.error('🔴 OTP not found in message:', decodedMsg);
      return res.status(400).json({ error: 'OTP not found.' });
    }

    const payload = {
      number: sender,
      service,
      otp_code: otp,
      message: decodedMsg
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
