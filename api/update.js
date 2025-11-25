export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { lat, lng } = req.body;

  // Correct validation
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "Missing coordinates" });
  }

  globalThis.lastLocation = {
    lat: Number(lat),
    lng: Number(lng),
    timestamp: Date.now()
  };

  res.status(200).json({
    status: "OK",
    lat: Number(lat),
    lng: Number(lng)
  });
}
