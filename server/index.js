// @ts-nocheck
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import contactRoutes from "./routes/contact.js";

import { register } from "./controllers/auth.js";
import { createPost } from "./controllers/posts.js";
import { verifyToken } from "./middleware/auth.js";
import Contact from "./models/Contact.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

mongoose.set("strictQuery", false);

// CORS setup
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use("/assets", express.static(path.join(__dirname, "public/assets")));

/* FILE STORAGE */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/assets");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

/* ROUTES WITH FILES */
app.post("/auth/register", upload.single("picture"), register);
app.post("/posts", verifyToken, upload.single("picture"), createPost);

/* CONTACT FORM ROUTE WITH MAILTRAP SMTP */
app.post("/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Save to DB
    const newContact = new Contact({ name, email, message });
    await newContact.save();

    console.log("📩 New contact form entry saved:", newContact);

    // Validate env vars
    const mailUser = "6debbf9a506a86";
    const mailPass = "4194e1cf0dae8b";
    const mailReceiver = "sluwycis@gmail.com";

    if (!mailUser || !mailPass || !mailReceiver) {
      throw new Error("❌ Missing Mailtrap credentials in .env file");
    }

    const transporter = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 587,
      auth: {
        user: "6debbf9a506a86",
        pass: "4194e1cf0dae8b",
      },
    });

    const mailOptions = {
      from: `"Contact Form" <${email}>`,
      to: "sluwycis@gmail.com",
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

/* ROUTES */
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/posts", postRoutes);
app.use("/contact", contactRoutes);

/* ERROR HANDLING MIDDLEWARE */
app.use((err, req, res, next) => {
  console.error("🚨 Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

/* MONGOOSE SETUP */
const PORT = process.env.PORT || 3001;
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.log(`❌ MongoDB Connection Failed: ${error}`);
  });

/* GRACEFUL SHUTDOWN */
process.on("SIGINT", () => {
  mongoose.connection.close(() => {
    console.log("🔌 MongoDB connection closed");
    process.exit(0);
  });
});

/* HEALTH CHECK */
app.get("/health", (req, res) => {
  res.status(200).send("✅ API is working");
});
