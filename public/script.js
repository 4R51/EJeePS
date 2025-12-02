// Create the map centered at Ateneo campus
// Fixed map centered at Ateneo campus
const map = L.map("map", {
  center: [14.6394, 121.0789],
  zoom: 16,
  zoomControl: true
});

// Add OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Add marker
let marker = L.marker([14.6394, 121.0789]).addTo(map);

// Track the last valid position to keep the marker in place when signal is lost
let lastValidCoords = { lat: 14.6394, lng: 121.0789 };

// Function to fetch latest coords from the backend
async function fetchLocation() {
  try {
    const res = await fetch("/api/update");
    const data = await res.json();

    if (data.lat === undefined || data.lng === undefined) return;

    const lat = Number(data.lat);
    const lng = Number(data.lng);

    // Validation helper
    function isValidLatLng(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
      // Ignore obvious invalid sentinel coordinates (0,0)
      if (lat === 0 && lng === 0) return false;
      return true;
    }

    if (!isValidLatLng(lat, lng)) {
      // GPS/Backend reported invalid coordinates; keep the last known valid marker position
      console.warn("Received invalid coordinates, keeping last valid coords:", lastValidCoords);
      return;
    }

    // Store and apply last-valid
    lastValidCoords = { lat, lng };
    marker.setLatLng([lat, lng]);
    console.log("Updated position:", lat, lng);
  } catch (err) {
    console.error("Error fetching GPS:", err);
  }
}

// Poll every 3 seconds
setInterval(fetchLocation, 3000);

// Ensure the map recalculates size after the banner is rendered and on window resize
window.addEventListener("load", () => {
  // Small timeout to wait for CSS/DOM layout to settle
  setTimeout(() => {
    map.invalidateSize();
  }, 50);
});
window.addEventListener("resize", () => map.invalidateSize());

/* -------------------- Station toggles & markers -------------------- */

// Approximate coordinates for station locations offset from center (replace with accurate coords as needed)
const stations = {
  a: [
    { name: "Xavier Hall", lat: 14.6400, lng: 121.0790 },
    { name: "Cervini Hall", lat: 14.6398, lng: 121.0791 },
    { name: "Old Comm Building", lat: 14.6396, lng: 121.0788 },
    { name: "LHS", lat: 14.6392, lng: 121.0787 },
    { name: "Ateneo Gate 1", lat: 14.6387, lng: 121.0785 },
    { name: "JSEC", lat: 14.6391, lng: 121.0795 },
    { name: "Old Rizal Library", lat: 14.6395, lng: 121.0796 },
  ],
  b: [
    { name: "Xavier Hall", lat: 14.6400, lng: 121.0790 },
    { name: "Cervini Hall", lat: 14.6398, lng: 121.0791 },
    { name: "Ateneo JHS", lat: 14.6390, lng: 121.0790 },
    { name: "FLC", lat: 14.6401, lng: 121.0786 },
    { name: "Bellarmine Hall", lat: 14.6396, lng: 121.0785 },
    { name: "SDC", lat: 14.6389, lng: 121.0788 },
    { name: "Arete", lat: 14.6391, lng: 121.0792 },
  ],
};

// Containers for created markers
let markersA = [];
let markersB = [];

// Create a custom div icon for a station
function createStationIcon(name, letter, line, zoom) {
  // Determine base size depending on zoom
  const baseSize = Math.max(18, Math.min(48, 10 + (zoom - 10) * 2));
  const fontSize = Math.max(10, Math.min(18, Math.round(baseSize / 2.5)));

  const circleColor = line === "a" ? "var(--ateneo-blue)" : "#0265d3";

  const html = `
    <div class="station-icon ${line}">
      <div class="station-label" style="font-size:${Math.max(10,Math.round(fontSize*0.85))}px">${name}</div>
      <div class="station-circle" style="width:${baseSize}px;height:${baseSize}px;font-size:${fontSize}px;line-height:${baseSize}px;background:${circleColor};">${letter}</div>
    </div>
  `;

  return L.divIcon({
    className: "",
    html,
    iconSize: [baseSize, baseSize + 24], // extra room for label
    iconAnchor: [baseSize / 2, baseSize / 2 + 8],
  });
}

// Instantiate station markers for a line
function createMarkersForLine(line) {
  const arr = line === "a" ? stations.a : stations.b;
  const markerArr = [];
  for (const s of arr) {
    const letter = line.toUpperCase();
    const m = L.marker([s.lat, s.lng], { icon: createStationIcon(s.name, letter, line, map.getZoom()) });
    m.station = s;
    m.line = line;
    markerArr.push(m);
  }
  return markerArr;
}

// Add initial markers (both toggle default ON)
markersA = createMarkersForLine("a");
markersB = createMarkersForLine("b");
markersA.forEach(m => m.addTo(map));
markersB.forEach(m => m.addTo(map));

// Toggle handling
function setLineVisibility(line, visible) {
  const list = line === "a" ? markersA : markersB;
  if (visible) list.forEach(m => m.addTo(map));
  else list.forEach(m => map.removeLayer(m));
}

// Update icon sizes on zoom
function refreshStationIcons() {
  const z = map.getZoom();
  for (const m of [...markersA, ...markersB]) {
    m.setIcon(createStationIcon(m.station.name, m.line.toUpperCase(), m.line, z));
  }
}

map.on("zoomend", refreshStationIcons);

// Button handling
const btnA = document.getElementById("btn-line-a");
const btnB = document.getElementById("btn-line-b");
btnA.addEventListener("click", () => {
  const isActive = btnA.classList.toggle("active");
  btnA.setAttribute("aria-pressed", isActive);
  setLineVisibility("a", isActive);
});
btnB.addEventListener("click", () => {
  const isActive = btnB.classList.toggle("active");
  btnB.setAttribute("aria-pressed", isActive);
  setLineVisibility("b", isActive);
});

// Ensure icons scale properly initially
refreshStationIcons();
