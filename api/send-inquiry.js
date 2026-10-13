const Busboy = require('busboy');
const nodemailer = require('nodemailer');

const MAX_FILE = 20 * 1024 * 1024;
const ALLOWED = /\.(pdf|dwg|jpe?g|png)$/i;
const lastSeen = new Map();

const parse = req => new Promise((resolve, reject) => {
  const fields = {};
  const files = [];
  let tooBig = false;
  const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: 10, fields: 20 } });
  bb.on('field', (name, value) => { fields[name] = value; });
  bb.on('file', (name, stream, info) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('limit', () => { tooBig = true; });
    stream.on('end', () => {
      if (info.filename) files.push({ filename: info.filename, content: Buffer.concat(chunks) });
    });
  });
  bb.on('error', reject);
  bb.on('close', () => resolve({ fields, files, tooBig }));
  req.pipe(bb);
});

const clean = (value, max) => String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  const reply = (code, message) => res.status(code).json({ ok: code === 200, message });
  if (req.method !== 'POST') return reply(405, 'Method not allowed.');

  try {
    const { fields, files, tooBig } = await parse(req);
    if (fields.website) return reply(200, 'Thank you. Your inquiry has been sent.');

    const name = clean(fields.name, 150);
    const company = clean(fields.company, 150);
    const email = clean(fields.email, 254);
    const phone = clean(fields.phone, 50);
    const message = String(fields.message || '').trim().slice(0, 5000);
    if (!name || !company || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fields.consent) {
      return reply(422, 'Please complete all required fields with a valid email.');
    }
    if (tooBig || files.some(file => !ALLOWED.test(file.filename))) {
      return reply(422, 'One of the files is invalid. Use PDF, DWG, JPG or PNG up to 20 MB.');
    }

    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (Date.now() - (lastSeen.get(ip) || 0) < 30000) return reply(429, 'Please wait a moment before sending another inquiry.');

    const port = Number(process.env.SMTP_PORT || 465);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.INQUIRY_TO,
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      subject: `Website inquiry from ${name} (${company})`,
      text: `Name: ${name}\nCompany: ${company}\nEmail: ${email}\nPhone: ${phone || '-'}\n\nMessage:\n${message}\n`,
      attachments: files.map(file => ({ filename: file.filename.replace(/[^\w.\- ]/g, '_'), content: file.content })),
    });
    lastSeen.set(ip, Date.now());
    return reply(200, 'Thank you. Your inquiry has been sent.');
  } catch (error) {
    console.error('send-inquiry:', error);
    return reply(500, 'Sorry, we could not send your inquiry. Please email us directly.');
  }
};
