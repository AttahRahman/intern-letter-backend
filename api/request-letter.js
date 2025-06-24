import { writeFileSync } from 'fs';
import nodemailer from 'nodemailer';
import { join } from 'path';
import { pdf } from 'pdfkit';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST allowed' });

  const { name, studentId, company, date, email } = req.body;

  if (!name || !studentId || !company || !date || !email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Create the letter content
  const letterText = `
    ${date}

    TO WHOM IT MAY CONCERN,

    This is to certify that ${name} with student ID ${studentId} is a student of our institution.
    This letter is to support their request for internship at ${company}.

    Sincerely,
    InternGO Coordinator
  `;

  // Generate PDF
  const doc = new pdf();
  const filePath = join('/tmp', `${studentId}_letter.pdf`);
  const writeStream = writeFileSync(filePath);
  doc.pipe(writeStream);
  doc.fontSize(12).text(letterText);
  doc.end();

  // Wait for PDF generation to finish
  await new Promise(resolve => writeStream.on('finish', resolve));

  // Send mail with Gmail
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
}
