import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const METAAPI_ACCESS_TOKEN = process.env.METAAPI_ACCESS_TOKEN;
const PORT = process.env.PORT || 3000;

// Helper to parse date range from the question
function parseDateRange(question) {
    const today = new Date();
    let since, until;

    // "last week"
    if (/last week/i.test(question)) {
        // Last week: previous Mon-Sun
        const nowDay = today.getDay();
        const lastSunday = new Date(today);
        lastSunday.setDate(today.getDate() - nowDay);
        const lastMonday = new Date(lastSunday);
        lastMonday.setDate(lastSunday.getDate() - 6);

        since = lastMonday.toISOString().slice(0, 10);
        until = lastSunday.toISOString().slice(0, 10);
        return { since, until };
    }

    // "yesterday"
    if (/yesterday/i.test(question)) {
        const yest = new Date(today);
        yest.setDate(today.getDate() - 1);
        since = until = yest.toISOString().slice(0, 10);
        return { since, until };
    }

    // "today"
    if (/today/i.test(question)) {
        since = until = today.toISOString().slice(0, 10);
        return { since, until };
    }

    // Match specific date in YYYY-MM-DD or DD-MM-YYYY
    const dateMatch = question.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
        since = until = dateMatch[1];
        return { since, until };
    }

    // Fallback to last 7 days
    const last7 = new Date(today);
    last7.setDate(today.getDate() - 6);
    since = last7.toISOString().slice(0, 10);
    until = today.toISOString().slice(0, 10);
    return { since, until };
}

// Query Meta Ads Insights API
async function getMetaSpend(adAccountId, since, until) {
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights`;
    try {
        const response = await axios.get(url, {
            params: {
                access_token: METAAPI_ACCESS_TOKEN,
                fields: 'spend',
                time_range: JSON.stringify({ since, until }),
            },
        });
        return response.data;
    } catch (error) {
        return { error: error.response ? error.response.data : error.message };
    }
}

// API endpoint
app.post("/query", async (req, res) => {
    const { adAccountId, question } = req.body;
    if (!adAccountId || !question) {
        return res.status(400).json({ error: "adAccountId and question are required." });
    }

    // Parse date range from question
    const { since, until } = parseDateRange(question);

    // Query Meta API
    const metaData = await getMetaSpend(adAccountId, since, until);

    if (metaData.error) {
        return res.status(500).json({ error: "Meta API error", details: metaData.error });
    }

    // Extract spend and respond
    const spend = (metaData.data && metaData.data[0] && metaData.data[0].spend) || "0";
    res.json({
        spend,
        since,
        until,
        message: `Spend from ${since} to ${until} is ${spend}`,
    });
});
app.get('/adaccounts', async (req, res) => {
  try {
    const response = await axios.get('https://graph.facebook.com/v20.0/me/adaccounts', {
      params: {
        access_token: METAAPI_ACCESS_TOKEN
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json(error.response ? error.response.data : { error: error.message });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
