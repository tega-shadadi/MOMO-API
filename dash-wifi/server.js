import express from "express";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const app = express();
app.use(express.json());

// Enable CORS with debug logs
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use((req, res, next) => {
  console.log(`DEBUG: Incoming ${req.method} request to ${req.url}`);
  next();
});

app.use(express.static("public"));

// MoMo credentials
const subscriptionKey = "27d5cd352e0743b0ac74302b4e196f2e";
const apiUser = "86020a90-459b-4dd5-944f-1d165e1fb410";
const apiKey = "397bdcfcf9f34f17905e0b647e7441de";
const targetEnv = "sandbox"; // change to "production"

// Token handling
let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiry) {
    console.log("DEBUG: Using cached access token");
    return accessToken;
  }

  console.log("DEBUG: Fetching new access token");
  const auth = Buffer.from(`${apiUser}:${apiKey}`).toString("base64");
  const res = await fetch("https://ericssonbasicapi2.azure-api.net/collection/token/", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("DEBUG: Token fetch failed", errText);
    throw new Error("Failed to fetch token: " + errText);
  }

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000 - 5000;
  console.log("DEBUG: Token fetched successfully", { expiresIn: data.expires_in });
  return accessToken;
}

// Plan tracking
const activePlans = {};
const planDurations = { 1000: 24*60*60*1000, 6000: 7*24*60*60*1000, 20000: 30*24*60*60*1000 };

// Payment endpoint
app.post("/api/pay", async (req, res) => {
  const { phone, amount, planType } = req.body; // planType: 'day', 'week', 'month'
  const referenceId = uuidv4();

  try {
    // Get fresh token
    const token = await getAccessToken();

    // Build request payload
    const payload = {
      amount: amount.toString(),
      currency: targetEnv === "production" ? "UGX" : "EUR",
      externalId: `wifi-${planType || 'session'}`,
      payer: {
        partyIdType: "MSISDN",
        partyId: phone
      },
      payerMessage: `Dash WiFi payment (${planType || 'session'})`,
      payeeNote: `WiFi Access (${planType || 'session'})`
    };

    // DEBUG: show payload
    console.log("DEBUG: Request payload:", JSON.stringify(payload, null, 2));

    const response = await fetch("https://ericssonbasicapi2.azure-api.net/collection/v1_0/requesttopay", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": targetEnv,
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey
      },
      body: JSON.stringify(payload)
    });

    // DEBUG: show status
    console.log("DEBUG: MoMo API response status", response.status);

    const responseBody = await response.text();

    // DEBUG: show body
    console.log("DEBUG: MoMo API response body", responseBody);

    if (response.status === 202) {
      res.json({ message: "✅ Please approve the MTN prompt on your phone." });
    } else {
      res.json({ message: "❌ Payment request failed: " + responseBody });
    }

  } catch (err) {
    console.error("DEBUG: Error connecting to MoMo API", err);
    res.json({ message: "❌ Error connecting to MTN API: " + err.message });
  }
});


// MTN callback
app.post("/api/callback", (req, res) => {
  console.log("DEBUG: MTN callback received", req.body);
  const { amount, payer } = req.body;

  if (planDurations[amount]) {
    const now = Date.now();
    const duration = planDurations[amount];
    activePlans[payer.partyId] = now + duration;
    console.log(`DEBUG: Activated plan for ${payer.partyId} for ${amount} UGX`);
  }

  res.sendStatus(200);
});

// Status endpoint
app.get("/api/status/:phone", (req, res) => {
  const phone = req.params.phone;
  const now = Date.now();
  const expiry = activePlans[phone];
  const active = expiry && expiry > now;
  console.log(`DEBUG: Status check for ${phone} → active: ${active}`);
  res.json({ active, expiresInMs: active ? expiry - now : 0 });
});



app.listen(3000, () => console.log("🚀 Server running on port 3000"));


