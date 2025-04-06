app.post('/sms', async (req, res) => {
  try {
    let sender = '';
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

        if (key.toLowerCase().includes('sender')) sender = value;
        else if (key.toLowerCase().includes('message')) message = value;
        // If no "Message" line is found, use the last non-key line as message
        else if (
          !line.includes(':') &&
          i > 0 &&
          i === lines.length - 1 &&
          !message
        ) {
          message = line;
        }
      }
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
      console.warn('⚠️ OTP not found — forwarding anyway');
    }

    const payload = {
      number: sender,
      service,
      otp_code: otp || '',
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
