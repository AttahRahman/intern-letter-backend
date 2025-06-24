// api/generate-letter.js

const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, studentId, email, company, date } = req.body;

  if (!name || !studentId || !email || !company || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const letterContent = `
    Dear Sir/Madam,

    This letter is to confirm that ${name} (ID: ${studentId}), a student of our institution studying ${company}, 
    has requested an internship letter dated ${date}.

    Kindly assist them in any capacity available.

    Sincerely,
    Internship Coordinator
  `;

  // Set up transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  // Send email with the letter as plain text
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your Internship Letter',
      text: letterContent,
    });

    return res.status(200).json({ message: 'Letter sent successfully!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to send email.' });
  }
};
