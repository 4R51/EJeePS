// Initialize map
const map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

let marker = L.marker([0, 0]).addTo(map);

async function updateGPS() {
  try {
    const res = await fetch('/api/latest');
    const data = await res.json();

    if (data.lat && data.lon) {
      marker.setLatLng([data.lat, data.lon]);
      map.setView([data.lat, data.lon], 16);
    }
  } catch (err) {
    console.log("GPS fetch error:", err);
  }
}

setInterval(updateGPS, 1000);
