import getStream from 'get-stream';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { name, studentId, company, date, email } = req.body;

  if (!name || !studentId || !company || !date || !email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Generate PDF in memory
    const doc = new PDFDocument();
    doc.fontSize(12).text(`
${date}

TO WHOM IT MAY CONCERN,

This is to certify that ${name} with student ID ${studentId} is a student of our institution.
This letter is to support their request for internship at ${company}.

Sincerely,
InternGO Coordinator
    `);
    doc.end();

    const pdfBuffer = await getStream.buffer(doc);

    // 2. Email the PDF as an attachment
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"InternGO" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Internship Letter is Ready',
      text: 'Attached is your internship letter.',
      attachments: [
        {
          filename: `${studentId}_letter.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return res.status(200).json({ message: 'Letter sent successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}
