// Create the map centered at Ateneo campus
const map = L.map("map").setView([14.6394, 121.0789], 16);

// Add OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Add marker
let marker = L.marker([14.6394, 121.0789]).addTo(map);

// Function to fetch latest coords from the backend
async function fetchLocation() {
  try {
    const res = await fetch("/api/update");
    const data = await res.json();

    // Correct validation
    if (data.lat === undefined || data.lng === undefined) return;

    const lat = Number(data.lat);
    const lng = Number(data.lng);

    // Move marker
    marker.setLatLng([lat, lng]);
    map.panTo([lat, lng]);

    console.log("Updated position:", lat, lng);
  } catch (err) {
    console.error("Error fetching GPS:", err);
  }
}

// Poll every 3 seconds
setInterval(fetchLocation, 3000);


