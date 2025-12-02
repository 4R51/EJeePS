// Create the map centered at Ateneo campus
// Fixed map centered at Ateneo campus
// Limit map interactions to a tight bounding box around Ateneo (stations)
// This prevents users from panning too far away and enforces a minimum zoom level
// Minimum zoom depends on viewport aspect: horizontal -> 16, vertical -> 17
function preferredMinZoomForAspect() {
  try {
    return window.innerWidth >= window.innerHeight ? 16 : 17;
  } catch (e) {
    return 16;
  }
}

const initialMinZoom = preferredMinZoomForAspect();

const map = L.map("map", {
  center: [14.6394, 121.0789],
  zoom: 16,
  minZoom: initialMinZoom,
  // Slightly padded bounds derived from station coords (SW, NE)
  maxBounds: L.latLngBounds([
    [14.633675319061712, 121.07404641949906],
    [14.647212556900775, 121.081723735956],
  ]),
  maxBoundsViscosity: 1.0, // make panning constrained to the bounds
  zoomControl: true
});

// Update minZoom responsively when the window / orientation changes
function updateMinZoomForAspect() {
  const newMin = preferredMinZoomForAspect();
  // If Leaflet exposes setMinZoom use it, otherwise update options directly
  if (typeof map.setMinZoom === 'function') {
    map.setMinZoom(newMin);
  } else {
    map.options.minZoom = newMin;
  }

  // If we're currently zoomed out further (smaller number) than allowed, bump to allowed minimum
  if (map.getZoom && map.getZoom() < newMin) {
    map.setZoom(newMin);
  }
}

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
    // ensure minZoom is correct for current aspect
    try { updateMinZoomForAspect(); } catch (e) {}
  }, 50);
});
window.addEventListener("resize", () => {
  map.invalidateSize();
  try { updateMinZoomForAspect(); } catch (e) {}
});

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
      <div class="station-label" style="font-size:${Math.max(16,Math.round(fontSize * 2))}px;font-weight:800;">${name}</div>
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

/* -------------------- Right-side pull-out stop lists -------------------- */

// Build the static stop lists for Line A and Line B into the pull-out panels
function initPullouts() {
  const tabA = document.getElementById('tab-line-a');
  const tabB = document.getElementById('tab-line-b');
  const panelA = document.getElementById('sidebar-line-a');
  const panelB = document.getElementById('sidebar-line-b');
  const listA = document.getElementById('list-line-a');
  const listB = document.getElementById('list-line-b');

  function renderList(ul, stops) {
    ul.innerHTML = '';
    for (const s of stops) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stop-btn';
      btn.textContent = s.name;
      btn.dataset.lat = s.lat;
      btn.dataset.lng = s.lng;
      btn.addEventListener('click', () => {
        // Center on the stop and zoom in
        map.setView([s.lat, s.lng], Math.max(20, map.getZoom()), { animate: true });
        // Close panel after selection
        panelA.classList.remove('open');
        panelB.classList.remove('open');
        tabA.setAttribute('aria-expanded', 'false');
        tabB.setAttribute('aria-expanded', 'false');
      });
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  renderList(listA, stations.a);
  renderList(listB, stations.b);

  // Toggle behavior: when a tab is clicked, open that panel and close the other
  function openPanel(panel, tab) {
    // close both then open requested
    panelA.classList.remove('open');
    panelB.classList.remove('open');
    tabA.setAttribute('aria-expanded', 'false');
    tabB.setAttribute('aria-expanded', 'false');

    panel.classList.add('open');
    tab.setAttribute('aria-expanded', 'true');
  }

  tabA.addEventListener('click', () => {
    const isOpen = panelA.classList.contains('open');
    if (isOpen) {
      panelA.classList.remove('open');
      tabA.setAttribute('aria-expanded', 'false');
    } else {
      openPanel(panelA, tabA);
    }
  });

  tabB.addEventListener('click', () => {
    const isOpen = panelB.classList.contains('open');
    if (isOpen) {
      panelB.classList.remove('open');
      tabB.setAttribute('aria-expanded', 'false');
    } else {
      openPanel(panelB, tabB);
    }
  });

  // Close buttons
  panelA.querySelector('.pullout-close').addEventListener('click', () => {
    panelA.classList.remove('open');
    tabA.setAttribute('aria-expanded', 'false');
  });
  panelB.querySelector('.pullout-close').addEventListener('click', () => {
    panelB.classList.remove('open');
    tabB.setAttribute('aria-expanded', 'false');
  });
}

// initialize pullouts after DOM is ready
window.addEventListener('load', () => {
  try {
    initPullouts();
  } catch (err) {
    console.warn('Pullouts init failed', err);
  }
});

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
