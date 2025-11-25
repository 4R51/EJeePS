export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Save latest GPS globally
  global.latestGPS = req.body;

  return res.status(200).json({ status: "ok" });
}
