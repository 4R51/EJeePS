export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing coordinates" });
  }

  // Save coordinates however your frontend reads them
  globalThis.lastLocation = { lat, lng, timestamp: Date.now() };

  res.status(200).json({ status: "OK", lat, lng });
}
