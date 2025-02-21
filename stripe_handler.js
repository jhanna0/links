import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import pool from "./db.js";
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
        return res.send(paymentErrorPage("We couldn't retrieve your payment session. Please try again."));
    }

    if (!isSuccess) {
        return res.send(paymentCanceledPage());
    }

    // ✅ Handle Successful Payment
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid" || !session.customer_details.email) {
            return res.send(paymentErrorPage("Your payment was not successful or could not be verified."));
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

        // ✅ Render a success page with the API key and auto-save it
        res.send(paymentSuccessPage(apiKey));

    } catch (error) {
        console.error("Error processing payment:", error);
        return res.send(paymentErrorPage("Stripe couldn't find your payment. Email support if this is a mistake."));
    }
};

// Helper function to return success page with auto-saving script
const paymentSuccessPage = (apiKey) => `
    <html>
        <head>
            <title>Payment Successful</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                .api-key { font-size: 1.5em; font-weight: bold; background: #f8f8f8; padding: 10px; display: inline-block; margin-top: 20px; }
                .copy-btn { cursor: pointer; background: blue; color: white; padding: 5px 10px; border: none; margin-left: 10px; }
            </style>
        </head>
        <body>
            <h1>✅ Payment Successful!</h1>
            <p>Here is your API Key:</p>
            <div class="api-key">${apiKey}</div>
            <button class="copy-btn" onclick="copyApiKey()">Copy</button>
            <p><strong>Important:</strong> Your API key has been saved locally. Copy it if you need to store it elsewhere.</p>

            <script>
                // ✅ Save API Key to localStorage automatically
                localStorage.setItem("userApiKey", "${apiKey}");
                alert("✅ Your API key has been saved locally!");

                function copyApiKey() {
                    const keyText = document.querySelector('.api-key').textContent;
                    navigator.clipboard.writeText(keyText).then(() => {
                        alert("✅ API Key copied to clipboard!");
                    }).catch(() => {
                        alert("❌ Failed to copy API Key. Please copy manually.");
                    });
                }
            </script>
        </body>
    </html>
`;

// Helper function for error pages
const paymentErrorPage = (message) => `
    <html>
        <head>
            <title>Payment Error</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                .error { font-size: 1.2em; color: red; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1>⚠️ Payment Error</h1>
            <p class="error">${message}</p>
            <a href="/" style="text-decoration: none; font-size: 1.1em;">Go Back</a>
        </body>
    </html>
`;

// Helper function for canceled payments
const paymentCanceledPage = () => `
    <html>
        <head>
            <title>Payment Canceled</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
                .message { font-size: 1.2em; color: red; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1>❌ Payment Canceled</h1>
            <p class="message">Your payment was not completed. If this was a mistake, you can try again.</p>
            <a href="/" style="text-decoration: none; font-size: 1.1em;">Go Back</a>
        </body>
    </html>
`;


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

