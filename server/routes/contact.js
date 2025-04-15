import express from "express";
import nodemailer from "nodemailer";
import Contact from "../models/Contact.js"; // Make sure the path is correct

const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Save the contact form submission to the database
    const newContact = new Contact({ name, email, message });
    await newContact.save();
    console.log("📩 New contact form entry saved:", newContact);

    // Set up the transporter for sending email using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "sandbox.smtp.mailtrap.io",
      port: 587,
      auth: {
        user: "6debbf9a506a86",  // Your Gmail email from .env
        pass: "4194e1cf0dae8b",  // Your App Password from .env
      },
    });

    const mailOptions = {
      from: `"Contact Form" <${""}>`,  // From the email in .env
      to: process.env.EMAIL_RECEIVER || "sluwycis@gmail.com",  // Receiver email
      subject: "📨 New Contact Form Submission",
      text: `You received a new message from ${name} (${email}):\n\n${message}`,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully");

    res.status(201).json({
      message: "Message sent successfully and email delivered!",
      data: newContact,
    });
  } catch (error) {
    console.error("🔥 Contact Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
