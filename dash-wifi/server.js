import express from "express";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Your MoMo credentials
const subscriptionKey = "27d5cd352e0743b0ac74302b4e196f2e";
const apiUser = "86020a90-459b-4dd5-944f-1d165e1fb410";
const apiKey = "397bdcfcf9f34f17905e0b647e7441de";
const targetEnv = "sandbox"; // change to "production" later

// Token storage
let accessToken = null;
let tokenExpiry = 0; // timestamp in milliseconds

// Function to fetch a fresh token
async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiry) {
    // token still valid
    return accessToken;
  }

  // Generate basic auth header
  const auth = Buffer.from(`${apiUser}:${apiKey}`).toString("base64");

  const res = await fetch("https://ericssonbasicapi2.azure-api.net/collection/token/", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error("Failed to fetch token: " + errorText);
  }

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000 - 5000; // subtract 5s for safety
  return accessToken;
}

// Endpoint: request payment
app.post("/api/pay", async (req, res) => {
  const { phone, amount } = req.body;
  const referenceId = uuidv4();

  try {
    const token = await getAccessToken();

    const response = await fetch("https://ericssonbasicapi2.azure-api.net/collection/v1_0/requesttopay", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": targetEnv,
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: "EUR",  // change to your desired currency
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
    res.json({ message: "❌ Error connecting to MTN API: " + err.message });
  }
});

// Callback from MTN
app.post("/api/callback", (req, res) => {
  console.log("MTN Payment Callback:", req.body);
  // ✅ Unlock WiFi access here if payment succeeded
  res.sendStatus(200);
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
