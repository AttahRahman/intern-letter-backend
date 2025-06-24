import { createWriteStream } from 'fs';
import nodemailer from 'nodemailer';
import { join } from 'path';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  console.log('Incoming request to /api/request-letter');

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ message: 'Only POST allowed' });
  }

  const { name, studentId, company, date, email } = req.body;
  console.log('Received data:', { name, studentId, company, date, email });

  if (!name || !studentId || !company || !date || !email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Generate PDF letter
    const letterText = `
      ${date}

      TO WHOM IT MAY CONCERN,

      This is to certify that ${name} with student ID ${studentId} is a student of our institution.
      This letter is to support their request for internship at ${company}.

      Sincerely,
      InternGO Coordinator
    `;

    const pdfDoc = new PDFDocument();
    const filePath = join('/tmp', `${studentId}_letter.pdf`);
    const writeStream = createWriteStream(filePath);
    pdfDoc.pipe(writeStream);
    pdfDoc.fontSize(12).text(letterText);
    pdfDoc.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Send email
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
          path: filePath,
        },
      ],
    });

    console.log('Email sent to', email);
    return res.status(200).json({ message: 'Letter sent successfully' });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ message: 'Failed to process request' });
  }
}
