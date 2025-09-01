const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// Load email configuration
const emailConfig = {
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

const transporter = nodemailer.createTransport(emailConfig);

// Enhanced PDF generation
const generateCSRPDF = (donation, donor) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .fill('#fdf6e3');

      // Border
      const borderWidth = 15;
      doc.rect(borderWidth, borderWidth, doc.page.width - 2*borderWidth, doc.page.height - 2*borderWidth)
         .strokeColor('#e67e22')
         .lineWidth(4)
         .stroke();

      // Logo (optional)
      // doc.image('path/to/logo.png', doc.page.width - 150, 30, { width: 100 });

      // Title
      doc.fontSize(32)
         .fillColor('#2c3e50')
         .text('Certificate of Donation', { align: 'center', underline: true });

      // Decorative line
      doc.moveDown(0.5)
         .strokeColor('#e67e22')
         .lineWidth(2)
         .moveTo(doc.page.width/4, doc.y)
         .lineTo(3*doc.page.width/4, doc.y)
         .stroke();

      // Body
      doc.moveDown(2);
      doc.fontSize(18)
         .fillColor('#2c3e50')
         .text('This certifies that', { align: 'center' });

      doc.moveDown();
      doc.fontSize(28)
         .fillColor('#c0392b')
         .text(donor.name, { align: 'center', bold: true });

      doc.moveDown();
      doc.fontSize(18)
         .fillColor('#2c3e50')
         .text('has generously donated', { align: 'center' });

      doc.moveDown();
      doc.fontSize(22)
         .fillColor('#27ae60')
         .text(`${donation.quantity} servings of ${donation.foodType}`, { align: 'center', bold: true });

      doc.moveDown();
      doc.fontSize(18)
         .fillColor('#2c3e50')
         .text(`on ${new Date(donation.createdAt).toLocaleDateString()} to ${donation.csrDetails.recipientName}`, { align: 'center' });

      // Footer message
      doc.moveDown(3);
      doc.fontSize(14)
         .fillColor('#7f8c8d')
         .text('Thank you for helping reduce food waste and supporting our mission to feed those in need.', {
           align: 'center'
         });

      doc.moveDown();
      doc.fontSize(16)
         .fillColor('#2c3e50')
         .text('PlateShare Foundation', { align: 'center', bold: true });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Enhanced Email
const sendCSREmail = async (donation, donor, pdfBuffer) => {
  try {
    const mailOptions = {
      from: `"PlateShare Foundation" <${process.env.EMAIL_USER}>`,
      to: donor.email,
      subject: 'Your Donation Certificate - Thank You!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c3e50;">
          <h2 style="color: #e67e22; text-align:center;">Thank You for Your Generosity!</h2>
          <p>Dear <strong>${donor.name}</strong>,</p>
          <p>We are thrilled to acknowledge your generous donation of <strong>${donation.quantity} servings of ${donation.foodType}</strong> made on <strong>${new Date(donation.createdAt).toLocaleDateString()}</strong>.</p>
          <p>Your contribution has directly helped <strong>${donation.csrDetails.recipientName}</strong> and supported our mission to fight hunger and reduce food waste.</p>
          <p style="text-align:center; margin: 20px 0;">
            <a href="#" style="background-color:#27ae60; color:white; padding:12px 20px; text-decoration:none; border-radius:6px;">View Your Certificate</a>
          </p>
          <p>Please find attached your official Certificate of Donation.</p>
          <p>With gratitude,<br><strong>The PlateShare Team</strong></p>
          <hr style="border:none; border-top:1px solid #ccc;">
          <p style="font-size:12px; color:#7f8c8d; text-align:center;">
            This is an automated message. Please do not reply.
          </p>
        </div>
      `,
      attachments: [{
        filename: `Donation-Certificate-${donation._id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending CSR email:', error);
    return false;
  }
};

module.exports = {
  generateCSRPDF,
  sendCSREmail
};
