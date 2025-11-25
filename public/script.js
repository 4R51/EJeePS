// Create the map centered at any default location (will update automatically)
const map = L.map("map").setView([14.5995, 120.9842], 12);

// Add OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Add marker (will move later)
let marker = L.marker([14.5995, 120.9842]).addTo(map);

// Function to fetch latest coords from the backend
async function fetchLocation() {
  try {
    const res = await fetch("/api/update");
    const data = await res.json();

    if (!data.lat || !data.lng) return;

    // Update the marker position
    marker.setLatLng([data.lat, data.lng]);

    // Also pan the map smoothly
    map.panTo([data.lat, data.lng]);

    console.log("Updated position:", data.lat, data.lng);

  } catch (err) {
    console.error("Error fetching GPS:", err);
  }
}

// Poll every 3 seconds
setInterval(fetchLocation, 3000);
