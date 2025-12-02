// Create the map centered at Ateneo campus
// Fixed map centered at Ateneo campus
// Limit map interactions to a tight bounding box around Ateneo (stations)
// This prevents users from panning too far away and disallows zooming out past level 16
const map = L.map("map", {
  center: [14.6394, 121.0789],
  zoom: 16,
  minZoom: 16, // don't allow zooming out past 16
  // Slightly padded bounds derived from station coords (SW, NE)
  maxBounds: L.latLngBounds([
    [14.633675319061712, 121.07404641949906],
    [14.647212556900775, 121.081723735956],
  ]),
  maxBoundsViscosity: 1.0, // make panning constrained to the bounds
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

// Replace stations coordinates with updated values for Line A and Line B
const stations = {
  a: [
    { name: "Xavier Hall", lat: 14.639966745962026, lng: 121.07850968556089 },
    { name: "Cervini Hall", lat: 14.639253157631932, lng: 121.0800841625044 },
    { name: "Old Comm Building", lat: 14.63652791238076, lng: 121.07827403693402 },
    { name: "LHS", lat: 14.636100216667035, lng: 121.08068282521631 },
    { name: "Gate 1", lat: 14.634675319061712, lng: 121.07504641949906 },
    { name: "JSEC", lat: 14.637743581877059, lng: 121.07632455062317 },
    { name: "Old Rizal Library", lat: 14.64052467759681, lng: 121.07721578701218 },
  ],
  b: [
    { name: "Xavier Hall", lat: 14.639966745962026, lng: 121.07850968556089 },
    { name: "Cervini Hall", lat: 14.639253157631932, lng: 121.0800841625044 },
    { name: "Ateneo JHS", lat: 14.644194881700924, lng: 121.0806035026449 },
    { name: "FLC", lat: 14.646212556900775, lng: 121.080723735956 },
    { name: "Bellarmine Hall", lat: 14.641526999841634, lng: 121.07937597806259 },
    { name: "SDC", lat: 14.641641188321234, lng: 121.07801140341061 },
    { name: "Arete", lat: 14.64082769226398, lng: 121.07562288338853 },
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
