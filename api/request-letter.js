import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { name, studentId, company, date, email } = req.body;

  if (!name || !studentId || !company || !date || !email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Generate PDF
    const doc = new PDFDocument();
    const filePath = path.join('/tmp', `${studentId}_letter.pdf`);
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(12).text(`
${date}

TO WHOM IT MAY CONCERN,

This is to certify that ${name} with student ID ${studentId} is a student of our institution.
This letter is to support their request for internship at ${company}.

Sincerely,
InternGO Coordinator
    `);
    doc.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Send the email
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

    return res.status(200).json({ message: 'Letter sent successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
}
