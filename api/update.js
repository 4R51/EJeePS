// A global variable to store the last known location.
// In a real application, this should be a persistent database or cache.
globalThis.lastLocation = globalThis.lastLocation || {
  lat: 14.5995, // Default/initial latitude
  lng: 120.9842, // Default/initial longitude
  timestamp: Date.now()
};

export default function handler(req, res) {
  // --- 1. Handle GET request: Return the last stored location ---
  if (req.method === "GET") {
    // Check if a location has been set, otherwise return the default
    if (globalThis.lastLocation) {
      return res.status(200).json(globalThis.lastLocation);
    } else {
      // This case should ideally not happen if a default is set, but acts as a safeguard.
      return res.status(404).json({ error: "No location data available" });
    }
  }

  // --- 2. Handle POST request: Update the location ---
  if (req.method === "POST") {
    const { lat, lng } = req.body;

    // Input Validation
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "Missing coordinates (lat or lng)" });
    }

    // Update the global state
    globalThis.lastLocation = {
      lat: Number(lat), // Ensure it is stored as a number
      lng: Number(lng), // Ensure it is stored as a number
      timestamp: Date.now()
    };

    // Respond with success
    return res.status(200).json({
      status: "OK",
      message: "Location updated successfully",
      lat: globalThis.lastLocation.lat,
      lng: globalThis.lastLocation.lng
    });
  }

  // --- 3. Handle all other methods (e.g., PUT, DELETE) ---
  return res.status(405).json({ error: "Method Not Allowed" });
}
