import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import pool from "../db/db.js";
import { hashEmail } from "../common/utils.js";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            // ✅ Both success and cancel use the same route
            success_url: `${process.env.BASE_URL}/stripe/response?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL}/stripe/response?payment_success=false`,
        });

        res.json({ sessionId: session.id });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Payment failed" });
    }
};

export const handleStripeResponse = async (req, res) => {
    const sessionId = req.query.session_id;
    const isSuccess = req.query.payment_success === "true";

    if (!sessionId) {
        return res.sendFile(path.resolve("views/stripe/payment-error.html"));
    }

    if (!isSuccess) {
        return res.sendFile(path.resolve("views/stripe/payment-canceled.html"));
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid" || !session.customer_details.email) {
            return res.sendFile(path.resolve("views/stripe/payment-error.html"));
        }

        const email = session.customer_details.email;
        const hashedEmail = hashEmail(email);

        const existingKeyResult = await pool.query(
            "SELECT key FROM api_keys WHERE session_id = $1 LIMIT 1",
            [sessionId]
        );

        let apiKey;
        if (existingKeyResult.rows.length > 0) {
            apiKey = existingKeyResult.rows[0].key;
        } else {
            apiKey = uuidv4();
            await pool.query(
                "INSERT INTO api_keys (key, hashed_email, session_id, expires_at) VALUES ($1, $2, $3, NOW() + interval '365 days')",
                [apiKey, hashedEmail, sessionId]
            );
        }

        // ✅ Store the API key in a cookie (Matching the rest of your system)
        res.cookie("apiKey", apiKey, {
            httpOnly: false,  // Let JavaScript access it
            secure: process.env.NODE_ENV === "production",  // Secure only in production
            maxAge: 1000 * 60 * 60 * 24 * 365, // ✅ 365 days expiry
            sameSite: "Strict",
        });

        return res.sendFile(path.resolve("views/stripe/payment-success.html"));
    } catch (error) {
        console.error("Error processing payment:", error);
        return res.sendFile(path.resolve("views/stripe/payment-error.html"));
    }
};
