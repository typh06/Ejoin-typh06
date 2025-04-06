const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: true })); // handle form-encoded data

const AUTOMATIQ_URL = 'https://sync.automatiq.com/api/gateway/sms';

app.post('/sms', async (req, res) => {
  try {
    console.log('🔵 Raw form body:', JSON.stringify(req.body, null, 2));

    const sender = req.body.Sender || req.body.sender;
    const message = req.body.Message || req.body.message || '';

    if (!sender || !message) {
      return res.status(400).json({ error: 'Missing sender or message' });
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
