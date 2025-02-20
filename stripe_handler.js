import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import pool from "./db.js";
import nodemailer from "nodemailer";
import { hashEmail } from "./common/utils.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a Stripe Checkout Session
export const createCheckoutSession = async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: "Unlimited Access Key" },
                        unit_amount: 500, // $5.00
                    },
                    quantity: 1,
                },
            ],
            success_url: `${process.env.BASE_URL}/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL}/`,
        });

        res.json({ sessionId: session.id });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Payment failed" });
    }
};

// Process Successful Payment and Generate API Key
export const handlePaymentSuccess = async (req, res) => {
    const sessionId = req.query.session_id;

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== "paid" || !session.customer_details.email) {
            return res.status(400).json({ error: "Payment not completed" });
        }

        const email = session.customer_details.email;
        const hashedEmail = hashEmail(email); // 🔹 Hash the email
        const apiKey = uuidv4(); // Generate API Key

        // Store API Key with hashed email
        await pool.query(
            "INSERT INTO api_keys (key, hashed_email, expires_at) VALUES ($1, $2, NOW() + interval '30 days')",
            [apiKey, hashedEmail]
        );

        // Send API Key via Email
        sendApiKeyEmail(email, apiKey);

        res.json({ success: true, apiKey });
    } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({ error: "Error retrieving session" });
    }
};

// Email the API Key to the user
const transporter = nodemailer.createTransport({
    host: "smtp.office365.com", // Correct Outlook SMTP host
    port: 587, // Use port 587 (TLS) or 465 (SSL)
    secure: false, // false for STARTTLS (port 587), true for SSL (port 465)
    auth: {
        user: process.env.EMAIL_USER, // Your Outlook email
        pass: process.env.EMAIL_PASS, // App password or real password
    },
    tls: {
        ciphers: "SSLv3",
    },
});

const sendApiKeyEmail = async (email, apiKey) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "LinkStash Key",
        text: `Your Access Key is: ${apiKey}\n\nIt can be used both on the website and programmatically.\n\nPlease reach out to jj@opus.cafe with any issues!`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully:", info.response);
    } catch (error) {
        console.error("❌ Error sending email:", error);
    }
};

