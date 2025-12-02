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

// Containers for created markers (single marker per station)
let markersMap = new Map(); // stationName => { marker, station }

// Create a custom div icon for a station
function createStationIcon(name, lines, zoom) {
  // Determine base size depending on zoom
  const baseSize = Math.max(18, Math.min(48, 10 + (zoom - 10) * 2));
  const fontSize = Math.max(10, Math.min(18, Math.round(baseSize / 2.5)));
  // lines: array of 'a','b' (one or both)
  const hasA = lines.includes("a");
  const hasB = lines.includes("b");
  // Determine background: single color for A/B or split gradient for both
  let background = "var(--ateneo-blue)";
  if (hasA && hasB) {
    background = "linear-gradient(90deg, var(--ateneo-blue) 50%, #0265d3 50%)";
  } else if (hasB) {
    background = "#0265d3";
  }
  const letter = hasA && hasB ? "A/B" : (hasA ? "A" : "B");

  const html = `
    <div class="station-icon ${hasA && hasB ? 'both' : (hasB ? 'line-b' : 'line-a')}">
      <div class="station-label" style="font-size:${Math.max(10,Math.round(fontSize*0.85))}px">${name}</div>
      <div class="station-circle" style="width:${baseSize}px;height:${baseSize}px;font-size:${fontSize}px;line-height:${baseSize}px;background:${background};">${letter}</div>
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
// Build a unified station map keyed by station name, merging lines
function buildUnifiedStations() {
  const unified = new Map();
  function addToUnified(stationList, line) {
    for (const s of stationList) {
      const key = s.name;
      if (!unified.has(key)) {
        unified.set(key, { name: s.name, lat: s.lat, lng: s.lng, lines: new Set([line]) });
      } else {
        unified.get(key).lines.add(line);
      }
    }
  }
  addToUnified(stations.a, "a");
  addToUnified(stations.b, "b");
  return unified;
}

const unifiedStations = buildUnifiedStations();

// Create markers for unified stations
function createUnifiedMarkers() {
  for (const [name, s] of unifiedStations.entries()) {
    const lines = Array.from(s.lines);
    const m = L.marker([s.lat, s.lng], { icon: createStationIcon(s.name, lines, map.getZoom()) });
    m.station = s; // {name, lat, lng, lines:Set}
    markersMap.set(name, m);
  }
}

// Add markers to map depending on active toggles
function refreshMarkersVisibility() {
  const active = getActiveLines();
  for (const [name, m] of markersMap.entries()) {
    const stationLines = m.station.lines; // Set
    // Intersection
    const visible = Array.from(stationLines).some(l => active.has(l));
    if (visible) {
      // set appropriate icon: depends on which lines active relative to station lines
      const linesForIcon = Array.from(stationLines).filter(l => active.has(l));
      m.setIcon(createStationIcon(m.station.name, linesForIcon, map.getZoom()));
      m.addTo(map);
    } else {
      map.removeLayer(m);
    }
  }
}

// Build markers and initially display them both (default toggles ON)
createUnifiedMarkers();
refreshMarkersVisibility();

// Toggle handling
function setLineVisibility(line, visible) {
  // simply refresh visibility based on current toggles
  refreshMarkersVisibility();
}

// Update icon sizes on zoom
function refreshStationIcons() {
  const z = map.getZoom();
  const active = getActiveLines();
  for (const m of markersMap.values()) {
    const linesForIcon = Array.from(m.station.lines).filter(l => active.has(l));
    m.setIcon(createStationIcon(m.station.name, linesForIcon.length ? linesForIcon : Array.from(m.station.lines), z));
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

// Helper to get currently active lines from button states
function getActiveLines() {
  const aEl = document.getElementById("btn-line-a");
  const bEl = document.getElementById("btn-line-b");
  const aActive = aEl ? aEl.classList.contains("active") : false;
  const bActive = bEl ? bEl.classList.contains("active") : false;
  const set = new Set();
  if (aActive) set.add("a");
  if (bActive) set.add("b");
  return set;
}

// Ensure icons scale properly initially and after a small delay
refreshStationIcons();
refreshMarkersVisibility();
