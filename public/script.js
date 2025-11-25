// Initialize map
const map = L.map('map').setView([14.0, 121.0], 13);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

// Marker that will be updated
let marker = L.marker([14.0, 121.0]).addTo(map);

// Update marker location
async function updateLocation() {
  try {
    const res = await fetch('/api/get-loc');   // <-- your Vercel endpoint
    const data = await res.json();

    console.log("Received:", data);

    // If backend has no data yet
    if (!data.lat || !data.lng) return;

    const lat = data.lat;
    const lng = data.lng;

    // Update marker position
    marker.setLatLng([lat, lng]);

    // Recenter the map smoothly
    map.setView([lat, lng], 16);

  } catch (err) {
    console.error("Error fetching location:", err);
  }
}

// Poll server every 2 seconds
setInterval(updateLocation, 2000);
