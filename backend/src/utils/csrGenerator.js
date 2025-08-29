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

// Generate CSR Certificate as PDF
const generateCSRPDF = (donation, donor) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      // Create a buffer to store the PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Add certificate design
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');
      
      // Header
      doc.fontSize(24)
         .fill('#2c3e50')
         .text('CERTIFICATE OF DONATION', {
           align: 'center',
           underline: true,
           lineGap: 10
         });

      // Body
      doc.moveDown(2);
      doc.fontSize(16)
         .fill('#2c3e50')
         .text('This is to certify that', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(28)
         .fill('#e74c3c')
         .text(donor.name, { align: 'center', bold: true });
      
      doc.moveDown();
      doc.fontSize(16)
         .fill('#2c3e50')
         .text('has generously donated', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(20)
         .fill('#27ae60')
         .text(`${donation.quantity} servings of ${donation.foodType}`, { 
           align: 'center',
           bold: true 
         });
      
      doc.moveDown();
      doc.fontSize(16)
         .fill('#2c3e50')
         .text(`on ${new Date(donation.createdAt).toLocaleDateString()} to ${donation.csrDetails.recipientName}`, { 
           align: 'center' 
         });
      
      // Footer
      doc.moveDown(4);
      doc.fontSize(12)
         .fill('#7f8c8d')
         .text('This certificate is issued in recognition of your contribution to reducing food waste', {
           align: 'center'
         });
      
      doc.text('and supporting those in need through the PlateShare platform.', {
        align: 'center'
      });

      doc.moveDown(3);
      doc.text('PlateShare Foundation', {
        align: 'center',
        bold: true
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Send CSR Certificate via Email
const sendCSREmail = async (donation, donor, pdfBuffer) => {
  try {
    const mailOptions = {
      from: `"PlateShare" <${process.env.EMAIL_USER}>`,
      to: donor.email,
      subject: 'Your Donation Certificate - Thank You!',
      text: `Dear ${donor.name},\n\nThank you for your generous donation of ${donation.quantity} servings of ${donation.foodType}. \n\nPlease find attached your Certificate of Donation.\n\nWarm regards,\nThe PlateShare Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Thank You for Your Generosity!</h2>
          <p>Dear ${donor.name},</p>
          <p>We are grateful for your generous donation of <strong>${donation.quantity} servings of ${donation.foodType}</strong> on ${new Date(donation.createdAt).toLocaleDateString()}.</p>
          <p>Your contribution has helped provide meals to those in need through our platform.</p>
          <p>Please find attached your Certificate of Donation as a token of our appreciation.</p>
          <p>Warm regards,<br>The PlateShare Team</p>
          <hr>
          <p style="font-size: 12px; color: #7f8c8d;">
            This is an automated message. Please do not reply to this email.
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
