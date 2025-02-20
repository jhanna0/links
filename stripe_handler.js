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
            success_url: `${process.env.BASE_URL}/stripe/success?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
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
            return res.status(400).send("Payment not completed.");
        }

        const email = session.customer_details.email;
        const hashedEmail = hashEmail(email);

        // ✅ Check if an API Key has already been generated for this session
        const existingKeyResult = await pool.query(
            "SELECT key FROM api_keys WHERE session_id = $1 LIMIT 1",
            [sessionId]
        );

        let apiKey;
        if (existingKeyResult.rows.length > 0) {
            apiKey = existingKeyResult.rows[0].key; // Reuse existing key
        } else {
            apiKey = uuidv4(); // Generate new API key

            await pool.query(
                "INSERT INTO api_keys (key, hashed_email, session_id, expires_at) VALUES ($1, $2, $3, NOW() + interval '30 days')",
                [apiKey, hashedEmail, sessionId]
            );
        }

        // ✅ Render a success page with the API key
        res.send(`
            <html>
                <head>
                    <title>Payment Successful</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                        .api-key { font-size: 1.5em; font-weight: bold; background: #f8f8f8; padding: 10px; display: inline-block; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <h1>✅ Payment Successful!</h1>
                    <p>Here is your API Key:</p>
                    <div class="api-key">${apiKey}</div>
                    <p><strong>Important:</strong> Copy this key now. You will not be able to see it again.</p>
                </body>
            </html>
        `);

    } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).send("Error retrieving session.");
    }
};


// Email the API Key to the user
// const transporter = nodemailer.createTransport({
//     host: "smtp.office365.com", // Correct Outlook SMTP host
//     port: 587, // Use port 587 (TLS) or 465 (SSL)
//     secure: false, // false for STARTTLS (port 587), true for SSL (port 465)
//     auth: {
//         user: process.env.EMAIL_USER, // Your Outlook email
//         pass: process.env.EMAIL_PASS, // App password or real password
//     },
//     tls: {
//         ciphers: "SSLv3",
//     },
// });

// const sendApiKeyEmail = async (email, apiKey) => {
//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: email,
//         subject: "LinkStash Key",
//         text: `Your Access Key is: ${apiKey}\n\nIt can be used both on the website and programmatically.\n\nPlease reach out to jj@opus.cafe with any issues!`,
//     };

//     try {
//         const info = await transporter.sendMail(mailOptions);
//         console.log("✅ Email sent successfully:", info.response);
//     } catch (error) {
//         console.error("❌ Error sending email:", error);
//     }
// };

