import express from "express";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json());

// Your MoMo credentials
const subscriptionKey = "27d5cd352e0743b0ac74302b4e196f2e";
const apiUser = "86020a90-459b-4dd5-944f-1d165e1fb410";
const apiKey = "397bdcfcf9f34f17905e0b647e7441de";
const targetEnv = "sandbox"; // change to "production" later

// Use existing access token or fetch a fresh one
let accessToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSMjU2In0.eyJjbGllbnRJZCI6Ijg2MDIwYTkwLTQ1OWItNGRkNS05NDRmLTFkMTY1ZTFmYjQxMCIsImV4cGlyZXMiOiIyMDI1LTA5LTI0VDEzOjE3OjU3LjczOCIsInNlc3Npb25JZCI6Ijc0ZWUxOTgxLWU2ZmMtNDFlZi1iNmUxLWMwYjk5OGE5NGJlMCJ9.eVwOhddUQJgkT57HEEGzC-Zlej_bpWAdYh7KyTGnFenbMzrsYbdMEOsqvd42WlNm1JwyqTv5nV_7xxIjMVs7jNde-AnrnpeNKxJB54JQtBhU6NLJE2lLSagF5jnfcGaE1XL-C-MPQFVAQ0fim5CQU0Mt2Zr6Gy4XiqPw-h3AXmKT_QYWWwuTLKF8Z_20_qzhOIbgJGbho4QT1DstqpHLInyhujzT78ltgQUk4zypSq2mB-EngeORPkJUTfubElm9_B8k9xxGvtl7eJ3E5nfpoECgTMKmvQjzKlrRiDomeasbWfnfHeB0r5mCo7vhiGxj39yn2geAlH0HHLHWG-IG5w";

// Endpoint: request payment
app.post("/api/pay", async (req, res) => {
  const { phone, amount } = req.body;
  const referenceId = uuidv4();

  try {
    const response = await fetch("https://ericssonbasicapi2.azure-api.net/collection/v1_0/requesttopay", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": targetEnv,
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: "UGX",
        externalId: "wifi-session",
        payer: {
          partyIdType: "MSISDN",
          partyId: phone
        },
        payerMessage: "Dash WiFi payment",
        payeeNote: "WiFi Access"
      })
    });

    if (response.status === 202) {
      res.json({ message: "✅ Please approve the MTN prompt on your phone." });
    } else {
      const errorText = await response.text();
      res.json({ message: "❌ Payment request failed: " + errorText });
    }
  } catch (err) {
    console.error(err);
    res.json({ message: "❌ Error connecting to MTN API." });
  }
});

// Callback from MTN (configure this in your MoMo dashboard)
app.post("/api/callback", (req, res) => {
  console.log("MTN Payment Callback:", req.body);
  // ✅ If payment success → unlock WiFi access
  res.sendStatus(200);
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
