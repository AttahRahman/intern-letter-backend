// /api/send-letter.js
import sgMail from '@sendgrid/mail';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// Initialize Firebase Admin SDK once
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: 'interngo-f9ffa',
      clientEmail: 'firebase-adminsdk-fbsvc@interngo-f9ffa.iam.gserviceaccount.com',
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Store this in Vercel dashboard

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req) {
  try {
    const {
      userId,
      name,
      studentId,
      programme,
      email,
      company,
      date,
      supervisorId,
    } = await req.json();

    console.log('📩 New Letter Request:', { name, studentId, company });

    // Save to Firestore
    const newDocRef = await db.collection('letter_requests').add({
      userId,
      name,
      studentId,
      programme,
      email,
      company,
      date,
      supervisorId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Generate PDF preview
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Internship Request Letter', { x: 50, y: 350, size: 20, font });
    page.drawText(`Name: ${name}`, { x: 50, y: 320, size: 14, font });
    page.drawText(`Student ID: ${studentId}`, { x: 50, y: 300, size: 14, font });
    page.drawText(`Programme: ${programme}`, { x: 50, y: 280, size: 14, font });
    page.drawText(`Company: ${company}`, { x: 50, y: 260, size: 14, font });
    page.drawText(`Date: ${date}`, { x: 50, y: 240, size: 14, font });

    const pdfBytes = await pdfDoc.save();
    const base64Pdf = Buffer.from(pdfBytes).toString('base64');

    // Confirmation email to student
    await sgMail.send({
      to: email,
      from: 'interngo6@gmail.com',
      subject: 'Your Internship Request Has Been Received',
      text: 'Attached is a preview of your internship request letter.',
      attachments: [
        {
          content: base64Pdf,
          filename: 'internship_letter_preview.pdf',
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    });

    // Notify supervisor
    const supervisorDoc = await db.collection('supervisors').doc(supervisorId).get();
    if (supervisorDoc.exists) {
      const supervisorEmail = supervisorDoc.data().email;
      const approvalLink = `https://your-app.com/supervisor/letters/${newDocRef.id}`;

      await sgMail.send({
        to: supervisorEmail,
        from: 'interngo6@gmail.com',
        subject: 'New Letter Request Approval Needed',
        html: `<p>A student has requested an internship letter.<br><a href="${approvalLink}">Click here to review and approve</a>.</p>`,
      });
    }

    return new NextResponse(
      JSON.stringify({ success: true, message: 'Request saved and emails sent.' }),
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new NextResponse(
      JSON.stringify({ success: false, message: 'Failed to handle request.' }),
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
