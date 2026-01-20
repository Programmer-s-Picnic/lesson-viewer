(() => {
  const LS_TOUR = "varanasi_tour_v1";
  const LS_COORDS = "varanasi_coords_v1";
  const LS_GHAT_SEL = "varanasi_ghat_sel_v1";

  // ---------- Offline SVG "photo" ----------
  const svgDataURI = (svg) =>
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  const esc = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");

  function photoSVG(title, subtitle, hue) {
    const h = Number(hue) || 30;
    return svgDataURI(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="hsl(${h}, 90%, 60%)" stop-opacity=".95"/>
            <stop offset="1" stop-color="hsl(${h + 40}, 85%, 55%)" stop-opacity=".92"/>
          </linearGradient>
          <radialGradient id="r" cx="30%" cy="20%" r="80%">
            <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
            <stop offset="1" stop-color="#fff" stop-opacity="0"/>
          </radialGradient>
          <filter id="s" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000" flood-opacity=".22"/>
          </filter>
        </defs>
        <rect width="1200" height="700" fill="url(#g)"/>
        <rect width="1200" height="700" fill="url(#r)"/>
        <path d="M0 520 C 200 490, 320 560, 520 530 C 720 500, 900 580, 1200 520 L1200 700 L0 700 Z" fill="#ffffff" fill-opacity=".20"/>
        <circle cx="960" cy="160" r="90" fill="#fff" fill-opacity=".22"/>
        <g filter="url(#s)">
          <rect x="60" y="60" width="820" height="210" rx="28" fill="#fff" fill-opacity=".86"/>
          <rect x="60" y="60" width="820" height="210" rx="28" fill="none" stroke="#eadcc5" stroke-width="6"/>
          <text x="105" y="150" font-size="56" font-family="Arial, sans-serif" font-weight="800" fill="#1f2937">${esc(title)}</text>
          <text x="105" y="210" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#6b7280">${esc(subtitle)}</text>
        </g>
      </svg>
    `);
  }

  // ---------- Data ----------
  const HOME = {
    id: "d0",
    name: "Champak's Home",
    type: "Start Point",
    bestTime: "day",
    timeNeeded: "—",
    cost: "—",
    highlights: "Your starting point (25.349304, 83.001256).",
    map: "https://www.google.com/maps/search/?api=1&query=25.349304,83.001256",
    coords: [25.349304, 83.001256],
    photos: [
      photoSVG("Champak's Home", "Start here • 25.349304, 83.001256", 35),
      photoSVG("Champak's Home", "Plan your route from here", 22),
      photoSVG("Champak's Home", "Ready for Varanasi tour", 44),
    ],
  };

  const DEST = [
    HOME,
    {
      id: "d1",
      name: "Shri Kashi Vishwanath Temple",
      type: "Temple",
      bestTime: "day",
      timeNeeded: "1–2 hrs",
      cost: "Depends (donations / queue services)",
      highlights: "Spiritual heart of Kashi; iconic temple & corridor.",
      map: "https://www.google.com/maps/search/?api=1&query=Kashi+Vishwanath+Temple+Varanasi",
      coords: [25.31085, 83.01068],
      photos: [
        photoSVG("Kashi Vishwanath", "Temple & corridor vibes", 28),
        photoSVG("Kashi Vishwanath", "Morning darshan energy", 36),
        photoSVG("Kashi Vishwanath", "Evening lanes nearby", 20),
      ],
    },
    {
      id: "d2",
      name: "Dashashwamedh Ghat",
      type: "Ghat",
      bestTime: "evening",
      timeNeeded: "1–2 hrs",
      cost: "Free (Aarti seating may cost)",
      highlights: "Famous for the Ganga Aarti; lively riverfront.",
      map: "https://www.google.com/maps/search/?api=1&query=Dashashwamedh+Ghat+Varanasi",
      coords: [25.30716889, 83.01033639],
      photos: [
        photoSVG("Dashashwamedh Ghat", "Ganga Aarti (evening)", 18),
        photoSVG("Dashashwamedh Ghat", "Crowd & lamps glow", 26),
        photoSVG("Dashashwamedh Ghat", "Riverfront view", 14),
      ],
    },
    {
      id: "d3",
      name: "Assi Ghat",
      type: "Ghat",
      bestTime: "sunrise",
      timeNeeded: "1–2 hrs",
      cost: "Free",
      highlights: "Sunrise calm, morning walks, chai & boats.",
      map: "https://www.google.com/maps/search/?api=1&query=Assi+Ghat+Varanasi",
      coords: [25.289322, 83.006499],
      photos: [
        photoSVG("Assi Ghat", "Sunrise calm", 40),
        photoSVG("Assi Ghat", "Morning walk & chai", 34),
        photoSVG("Assi Ghat", "Boats & soft light", 46),
      ],
    },
    {
      id: "d4",
      name: "Manikarnika Ghat",
      type: "Ghat",
      bestTime: "day",
      timeNeeded: "30–60 min",
      cost: "Free",
      highlights: "Major cremation ghat; be respectful.",
      map: "https://www.google.com/maps/search/?api=1&query=Manikarnika+Ghat+Varanasi",
      coords: [25.31087056, 83.01408556],
      photos: [
        photoSVG("Manikarnika Ghat", "Oldest traditions", 10),
        photoSVG("Manikarnika Ghat", "Historic riverfront", 16),
        photoSVG("Manikarnika Ghat", "Respectful viewing", 6),
      ],
    },
    {
      id: "d5",
      name: "Sarnath (Dhamek Stupa & ruins)",
      type: "Sarnath",
      bestTime: "day",
      timeNeeded: "2–4 hrs",
      cost: "Tickets may apply",
      highlights: "Buddhist pilgrimage site; serene monuments & ruins.",
      map: "https://www.google.com/maps/search/?api=1&query=Dhamek+Stupa+Sarnath",
      coords: [25.3808, 83.0245],
      photos: [
        photoSVG("Sarnath", "Dhamek Stupa", 120),
        photoSVG("Sarnath", "Peaceful lawns", 140),
        photoSVG("Sarnath", "Ruins & history", 110),
      ],
    },
    {
      id: "d6",
      name: "Sarnath Museum (Archaeological Museum)",
      type: "Sarnath",
      bestTime: "day",
      timeNeeded: "1–2 hrs",
      cost: "Tickets apply",
      highlights:
        "Artifacts & heritage exhibits; iconic Ashokan lion capital association.",
      map: "https://www.google.com/maps/search/?api=1&query=Sarnath+Museum",
      coords: [25.376165, 83.022713],
      photos: [
        photoSVG("Sarnath Museum", "Artifacts & sculpture", 200),
        photoSVG("Sarnath Museum", "Heritage exhibits", 190),
        photoSVG("Sarnath Museum", "Learning stop", 210),
      ],
    },
    {
      id: "d7",
      name: "Ramnagar Fort",
      type: "Heritage",
      bestTime: "day",
      timeNeeded: "1–2 hrs",
      cost: "Tickets may apply",
      highlights: "Historic fort across the Ganga; museum & collections.",
      map: "https://www.google.com/maps/search/?api=1&query=Ramnagar+Fort+Varanasi",
      coords: [25.269262, 83.022144],
      photos: [
        photoSVG("Ramnagar Fort", "Fort & museum", 260),
        photoSVG("Ramnagar Fort", "Royal collections", 240),
        photoSVG("Ramnagar Fort", "Ganga-side view", 280),
      ],
    },
    {
      id: "d8",
      name: "BHU & Bharat Kala Bhavan",
      type: "Heritage",
      bestTime: "day",
      timeNeeded: "2–4 hrs",
      cost: "Often free/entry rules vary",
      highlights: "Campus stroll + art museum; peaceful green spaces.",
      map: "https://www.google.com/maps/search/?api=1&query=BHU+Bharat+Kala+Bhavan+Varanasi",
      coords: [25.2677, 82.9913],
      photos: [
        photoSVG("BHU", "Green campus walk", 90),
        photoSVG("Bharat Kala Bhavan", "Art & culture", 70),
        photoSVG("BHU", "Quiet evenings", 100),
      ],
    },
    {
      id: "d9",
      name: "Kaal Bhairav Temple",
      type: "Temple",
      bestTime: "day",
      timeNeeded: "45–90 min",
      cost: "Free",
      highlights: "Popular local deity temple; often a dedicated queue.",
      map: "https://www.google.com/maps/search/?api=1&query=Kaal+Bhairav+Temple+Varanasi",
      coords: [25.3248, 83.0114],
      photos: [
        photoSVG("Kaal Bhairav", "Local devotion", 320),
        photoSVG("Kaal Bhairav", "Queue & darshan", 300),
        photoSVG("Kaal Bhairav", "Temple street", 340),
      ],
    },
    {
      id: "d10",
      name: "Sankat Mochan Hanuman Temple",
      type: "Temple",
      bestTime: "day",
      timeNeeded: "45–90 min",
      cost: "Free",
      highlights: "Beloved Hanuman temple; close to BHU area.",
      map: "https://www.google.com/maps/search/?api=1&query=Sankat+Mochan+Temple+Varanasi",
      coords: [25.281852, 82.998652],
      photos: [
        photoSVG("Sankat Mochan", "Hanuman temple", 30),
        photoSVG("Sankat Mochan", "Prasad & prayers", 22),
        photoSVG("Sankat Mochan", "Near BHU area", 38),
      ],
    },
    {
      id: "d11",
      name: "Boat Ride on the Ganga (Ghats stretch)",
      type: "Experience",
      bestTime: "sunrise",
      timeNeeded: "1–2 hrs",
      cost: "Paid",
      highlights: "See ghats from the river (sunrise is magical).",
      map: "https://www.google.com/maps/search/?api=1&query=Boat+ride+Varanasi+ghats",
      coords: [25.3075, 83.0109],
      photos: [
        photoSVG("Boat Ride", "Sunrise on Ganga", 48),
        photoSVG("Boat Ride", "Ghats panorama", 54),
        photoSVG("Boat Ride", "Quiet water moments", 42),
      ],
    },
    {
      id: "d12",
      name: "Godowlia Market (Shopping & street life)",
      type: "Market",
      bestTime: "evening",
      timeNeeded: "1–2 hrs",
      cost: "Free",
      highlights: "Shopping + lanes; Banarasi items and snacks.",
      map: "https://www.google.com/maps/search/?api=1&query=Godowlia+Market+Varanasi",
      coords: [25.3094, 83.0089],
      photos: [
        photoSVG("Godowlia Market", "Street life & shops", 5),
        photoSVG("Godowlia Market", "Snacks & lanes", 18),
        photoSVG("Godowlia Market", "Evening lights", 10),
      ],
    },
  ];

  // Ghats (bulk directory)
  const GHATS = (() => {
    const south = [
      "Assi Ghat",
      "Ganga Mahal Ghat",
      "Tulsi Ghat",
      "Kedar Ghat",
      "Harishchandra Ghat",
      "Shivala Ghat",
      "Jain Ghat",
      "Bhadaini Ghat",
      "Hanuman Ghat",
      "Lalita Ghat",
    ];
    const central = [
      "Dashashwamedh Ghat",
      "Man Mandir Ghat",
      "Ahilyabai Ghat (Keval Ghat)",
      "Meer Ghat",
      "Munshi Ghat",
      "Scindia Ghat",
      "Darbhanga Ghat",
      "Rana Mahal Ghat",
      "Panchganga Ghat",
    ];
    const north = [
      "Manikarnika Ghat",
      "Lal Ghat",
      "Naya Ghat",
      "Rajendra Prasad Ghat",
      "Adi Keshav Ghat",
      "Trilochan Ghat",
      "Prajapati Ghat",
      "Chausatti Ghat",
      "Ram Ghat",
      "Raj Ghat",
    ];
    const famous = new Set([
      "Assi Ghat",
      "Dashashwamedh Ghat",
      "Manikarnika Ghat",
      "Panchganga Ghat",
      "Harishchandra Ghat",
      "Kedar Ghat",
      "Scindia Ghat",
      "Man Mandir Ghat",
      "Raj Ghat",
      "Tulsi Ghat",
    ]);
    const mk = (name, group, i) => ({
      id: `g${group[0]}${String(i).padStart(2, "0")}`,
      name,
      group,
      type: "Ghat",
      bestTime:
        group === "south"
          ? "sunrise"
          : name === "Dashashwamedh Ghat"
            ? "evening"
            : "day",
      timeNeeded: "20–60 min",
      cost: "Free",
      highlights:
        "Ghat along the Ganga. Great for walks, boats, and riverfront life.",
      map:
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(name + " Varanasi"),
      famous: famous.has(name),
    });

    const out = [];
    south.forEach((n, i) => out.push(mk(n, "south", i + 1)));
    central.forEach((n, i) => out.push(mk(n, "central", i + 1)));
    north.forEach((n, i) => out.push(mk(n, "north", i + 1)));
    return out;
  })();

  // ---------- LocalStorage helpers ----------
  const readJSON = (k, fb) => {
    try {
      return JSON.parse(localStorage.getItem(k) || JSON.stringify(fb));
    } catch {
      return fb;
    }
  };
  const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const readTour = () => readJSON(LS_TOUR, []);
  const writeTour = (ids) => writeJSON(LS_TOUR, ids);

  function normalizeTour() {
    let ids = readTour().filter(Boolean);
    ids = ids.filter((id) => id !== HOME.id);
    ids.unshift(HOME.id);
    const exists = new Set([
      ...DEST.map((d) => d.id),
      ...GHATS.map((g) => g.id),
    ]);
    ids = ids.filter((id) => exists.has(id));
    ids = [...new Set(ids)];
    writeTour(ids);
  }
  normalizeTour();

  const getItemById = (id) =>
    DEST.find((x) => x.id === id) || GHATS.find((x) => x.id === id) || null;

  // ---------- UI refs ----------
  const leftCount = document.getElementById("leftCount");
  const leftCountLabel = document.getElementById("leftCountLabel");

  const tabPlaces = document.getElementById("tabPlaces");
  const tabGhats = document.getElementById("tabGhats");
  const panelPlaces = document.getElementById("panelPlaces");
  const panelGhats = document.getElementById("panelGhats");

  const destGrid = document.getElementById("destGrid");
  const tourList = document.getElementById("tourList");
  const tourCount = document.getElementById("tourCount");
  const topSearch = document.getElementById("topSearch");
  const rightSearch = document.getElementById("rightSearch");
  const filterType = document.getElementById("filterType");
  const filterTime = document.getElementById("filterTime");
  const summaryBox = document.getElementById("summaryBox");

  const ghatSearch = document.getElementById("ghatSearch");
  const ghatGroup = document.getElementById("ghatGroup");
  const ghatList = document.getElementById("ghatList");
  const ghatSelectFamous = document.getElementById("ghatSelectFamous");
  const ghatAddSelected = document.getElementById("ghatAddSelected");
  const ghatClearSelected = document.getElementById("ghatClearSelected");

  const mapModal = document.getElementById("mapModal");
  const openMapsLink = document.getElementById("openMapsLink");

  let leafletMap = null;
  let leafletMarkers = [];
  let leafletPolyline = null;

  // ---------- Toast ----------
  const toastWrap = document.getElementById("toast");
  function toast(title, detail) {
    const el = document.createElement("div");
    el.className = "t";
    el.innerHTML = `<div class="okdot"></div><div class="msg"><b>${esc(title)}</b><small>${esc(detail)}</small></div>`;
    toastWrap.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // ---------- Tabs ----------
  function setTab(which) {
    const isPlaces = which === "places";
    tabPlaces.classList.toggle("active", isPlaces);
    tabGhats.classList.toggle("active", !isPlaces);
    tabPlaces.setAttribute("aria-selected", isPlaces ? "true" : "false");
    tabGhats.setAttribute("aria-selected", !isPlaces ? "true" : "false");
    panelPlaces.classList.toggle("show", isPlaces);
    panelGhats.classList.toggle("show", !isPlaces);

    if (isPlaces) {
      leftCount.textContent = String(filteredDest().length);
      leftCountLabel.textContent = "places";
    } else {
      leftCount.textContent = String(filteredGhats().length);
      leftCountLabel.textContent = "ghats";
      renderGhats();
    }
  }
  tabPlaces.addEventListener("click", () => setTab("places"));
  tabGhats.addEventListener("click", () => setTab("ghats"));

  // ---------- Places Filters ----------
  const TYPES = ["all", ...new Set(DEST.map((d) => d.type))].sort((a, b) => {
    if (a === "all") return -1;
    if (b === "all") return 1;
    return a.localeCompare(b);
  });
  TYPES.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t === "all" ? "All types" : t;
    filterType.appendChild(opt);
  });

  const state = { q: "", type: "all", time: "all" };
  const prettyTime = (t) =>
    ({
      sunrise: "Sunrise",
      day: "Daytime",
      evening: "Evening",
      night: "Night",
    })[t] || t;

  function setSearch(v) {
    state.q = v || "";
    topSearch.value = state.q;
    rightSearch.value = state.q;
    renderDestinations();
    if (panelGhats.classList.contains("show")) renderGhats();
  }
  topSearch.addEventListener("input", (e) => setSearch(e.target.value));
  rightSearch.addEventListener("input", (e) => setSearch(e.target.value));
  filterType.addEventListener("change", (e) => {
    state.type = e.target.value;
    renderDestinations();
  });
  filterTime.addEventListener("change", (e) => {
    state.time = e.target.value;
    renderDestinations();
  });

  function filteredDest() {
    const q = state.q.trim().toLowerCase();
    return DEST.filter((d) => {
      const matchesQ =
        !q ||
        (d.name + " " + d.type + " " + d.highlights).toLowerCase().includes(q);
      const matchesType = state.type === "all" || d.type === state.type;
      const matchesTime = state.time === "all" || d.bestTime === state.time;
      return matchesQ && matchesType && matchesTime;
    });
  }

  // ---------- Ghats Filter + Selection ----------
  const ghatState = { q: "", group: "all" };
  ghatSearch.addEventListener("input", (e) => {
    ghatState.q = e.target.value || "";
    renderGhats();
  });
  ghatGroup.addEventListener("change", (e) => {
    ghatState.group = e.target.value;
    renderGhats();
  });

  const readGhatSelection = () => readJSON(LS_GHAT_SEL, {});
  const writeGhatSelection = (sel) => writeJSON(LS_GHAT_SEL, sel);

  function filteredGhats() {
    const q = (ghatState.q || state.q || "").trim().toLowerCase();
    return GHATS.filter((g) => {
      const matchesQ = !q || g.name.toLowerCase().includes(q);
      const groupOk =
        ghatState.group === "all"
          ? true
          : ghatState.group === "famous"
            ? g.famous
            : g.group === ghatState.group;
      return matchesQ && groupOk;
    });
  }

  // ---------- Tour ops ----------
  function addToTour(id) {
    let ids = readTour();
    if (ids.includes(id))
      return toast("Already added", "This item is already in your tour.");
    ids.push(id);
    writeTour(ids);
    normalizeTour();
    renderTour();
    toast("Added", getItemById(id)?.name || id);
  }
  function removeFromTour(id) {
    if (id === HOME.id)
      return toast("Pinned", "Champak's Home is the fixed start point.");
    writeTour(readTour().filter((x) => x !== id));
    normalizeTour();
    renderTour();
  }
  function moveTour(id, dir) {
    if (id === HOME.id) return;
    const ids = readTour();
    const idx = ids.indexOf(id);
    if (idx === -1) return;
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 1 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    writeTour(ids);
    normalizeTour();
    renderTour();
  }
  function clearTour() {
    writeTour([HOME.id]);
    normalizeTour();
    renderTour();
    summaryBox.style.display = "none";
    summaryBox.textContent = "";
    toast("Cleared", "Tour cleared (start point kept).");
  }

  // ---------- Maps route URL ----------
  function placeQuery(d) {
    if (Array.isArray(d.coords)) return `${d.coords[0]},${d.coords[1]}`;
    return `${d.name} Varanasi`;
  }
  function buildRouteUrlFromTour() {
    const ids = readTour();
    const places = ids.map(getItemById).filter(Boolean);
    if (!places.length) return null;

    if (places.length === 1) {
      const q = encodeURIComponent(placeQuery(places[0]));
      return `https://www.google.com/maps/search/?api=1&query=${q}`;
    }

    const origin = encodeURIComponent(placeQuery(places[0]));
    const destination = encodeURIComponent(
      placeQuery(places[places.length - 1]),
    );
    const middle = places
      .slice(1, -1)
      .map((p) => encodeURIComponent(placeQuery(p)));
    const waypoints = middle.slice(0, 20).join("%7C");

    const base = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${origin}&destination=${destination}`;
    return waypoints ? `${base}&waypoints=${waypoints}` : base;
  }

  // ---------- Coords cache + Nominatim fallback ----------
  const readCoordsCache = () => readJSON(LS_COORDS, {});
  const writeCoordsCache = (c) => writeJSON(LS_COORDS, c);

  async function geocodeOnce(name) {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(name + " Varanasi Uttar Pradesh India");
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return [Number(data[0].lat), Number(data[0].lon)];
  }

  async function ensureCoordsForPlace(d) {
    if (Array.isArray(d.coords)) return d.coords;
    const cache = readCoordsCache();
    if (Array.isArray(cache[d.id]) && cache[d.id].length === 2) {
      d.coords = cache[d.id];
      return d.coords;
    }
    const c = await geocodeOnce(d.name);
    if (c) {
      d.coords = c;
      cache[d.id] = c;
      writeCoordsCache(cache);
      return c;
    }
    return null;
  }

  // ---------- Leaflet map modal ----------
  function initLeafletIfNeeded() {
    if (leafletMap) return;
    leafletMap = L.map("leafletMap", { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(leafletMap);
    leafletMap.setView([25.3176, 82.9739], 12);
  }
  function clearOverlays() {
    if (!leafletMap) return;
    leafletMarkers.forEach((m) => m.remove());
    leafletMarkers = [];
    if (leafletPolyline) {
      leafletPolyline.remove();
      leafletPolyline = null;
    }
  }

  async function openMapModal() {
    const url = buildRouteUrlFromTour();
    if (!url)
      return toast("Tour empty", "Add destinations first, then view the map.");
    openMapsLink.href = url;

    mapModal.classList.add("show");
    mapModal.setAttribute("aria-hidden", "false");

    initLeafletIfNeeded();
    setTimeout(() => leafletMap.invalidateSize(), 80);
    clearOverlays();

    const places = readTour().map(getItemById).filter(Boolean);
    const coordsList = [];
    for (const p of places) {
      const c = await ensureCoordsForPlace(p);
      if (c) coordsList.push({ p, c });
    }
    if (!coordsList.length) return toast("No coordinates", "Try Open in Maps.");

    coordsList.forEach((o, i) => {
      const m = L.marker(o.c).addTo(leafletMap);
      m.bindPopup(
        `<b>${i + 1}. ${esc(o.p.name)}</b><br><small>${esc(o.p.type || "Place")} • ${esc(prettyTime(o.p.bestTime || "day"))}</small>`,
      );
      leafletMarkers.push(m);
    });

    const line = coordsList.map((x) => x.c);
    if (line.length >= 2)
      leafletPolyline = L.polyline(line, { weight: 5, opacity: 0.9 }).addTo(
        leafletMap,
      );
    leafletMap.fitBounds(L.latLngBounds(line).pad(0.18));
  }
  function closeMapModal() {
    mapModal.classList.remove("show");
    mapModal.setAttribute("aria-hidden", "true");
  }

  document.getElementById("viewMapBtn").addEventListener("click", openMapModal);
  document
    .getElementById("closeMapBtn")
    .addEventListener("click", closeMapModal);
  mapModal.addEventListener("click", (e) => {
    if (e.target === mapModal) closeMapModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mapModal.classList.contains("show"))
      closeMapModal();
  });

  document.getElementById("openMapsBtn").addEventListener("click", () => {
    const url = buildRouteUrlFromTour();
    if (!url) return toast("Tour empty", "Add destinations first.");
    window.open(url, "_blank", "noopener");
  });

  // ---------- Carousel (Places) ----------
  const carIdx = new Map();
  const carTimers = new Map();
  const setDotActive = (wrap, idx) =>
    [...wrap.children].forEach((d, i) =>
      d.classList.toggle("active", i === idx),
    );

  function mountCarousel(cardEl, d) {
    const track = cardEl.querySelector(".track");
    const dotsWrap = cardEl.querySelector(".dots");
    const prevBtn = cardEl.querySelector("[data-prev]");
    const nextBtn = cardEl.querySelector("[data-next]");
    const total = (d.photos || []).length;
    if (total <= 1) return;

    let idx = carIdx.get(d.id) ?? 0;
    const go = (newIdx) => {
      idx = (newIdx + total) % total;
      carIdx.set(d.id, idx);
      track.style.transform = `translateX(-${idx * 100}%)`;
      setDotActive(dotsWrap, idx);
    };

    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      go(idx - 1);
    });
    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      go(idx + 1);
    });

    const start = () => {
      stop();
      carTimers.set(
        d.id,
        setInterval(() => go(idx + 1), 4500),
      );
    };
    const stop = () => {
      const t = carTimers.get(d.id);
      if (t) clearInterval(t);
      carTimers.delete(d.id);
    };

    cardEl.querySelector(".carousel").addEventListener("mouseenter", stop);
    cardEl.querySelector(".carousel").addEventListener("mouseleave", start);

    go(idx);
    start();
  }

  // ---------- Render Places ----------
  function renderDestinations() {
    for (const t of carTimers.values()) clearInterval(t);
    carTimers.clear();

    const list = filteredDest();
    if (panelPlaces.classList.contains("show")) {
      leftCount.textContent = String(list.length);
      leftCountLabel.textContent = "places";
    }

    const tourIds = new Set(readTour());
    destGrid.innerHTML = "";

    list.forEach((d) => {
      const inTour = tourIds.has(d.id);
      const photos = d.photos?.length
        ? d.photos
        : [photoSVG(d.name, d.type, 32)];
      const dots = photos
        .map((_, i) => `<span class="dot ${i === 0 ? "active" : ""}"></span>`)
        .join("");
      const slides = photos
        .map(
          (src) =>
            `<div class="slide"><img src="${src}" alt="${esc(d.name)} photo"></div>`,
        )
        .join("");

      const el = document.createElement("article");
      el.className = "card";
      el.innerHTML = `
        <div class="carousel">
          <span class="car-tag">Sliding photos</span>
          <div class="track">${slides}</div>
          <div class="car-nav">
            <button class="car-btn" data-prev="${d.id}" aria-label="Previous">‹</button>
            <button class="car-btn" data-next="${d.id}" aria-label="Next">›</button>
          </div>
          <div class="dots">${dots}</div>
        </div>

        <div class="card-top">
          <div>
            <p class="title">${esc(d.name)}</p>
            <p class="meta">${esc(d.highlights || "")}</p>
          </div>
          <div class="badges">
            <span class="badge cat">${esc(d.type)}</span>
            <span class="badge time">${esc(prettyTime(d.bestTime || "day"))}</span>
            <span class="badge cost">${esc(d.timeNeeded || "—")}</span>
          </div>
        </div>

        <div class="card-mid">
          <p class="desc">
            <b>Time needed:</b> ${esc(d.timeNeeded || "—")}<br/>
            <b>Best time:</b> ${esc(prettyTime(d.bestTime || "day"))}<br/>
            <b>Cost:</b> ${esc(d.cost || "—")}
          </p>
        </div>

        <div class="card-actions">
          <button class="btn ${inTour ? "secondary" : ""}" data-add="${d.id}">
            ${inTour ? "✓ Added" : "➕ Add to Tour"}
          </button>
          <a class="btn secondary" href="${d.map}" target="_blank" rel="noopener">📍 Open Map</a>
        </div>
      `;
      destGrid.appendChild(el);
      mountCarousel(el, d);
    });
  }

  destGrid.addEventListener("click", (e) => {
    const id = e.target?.getAttribute?.("data-add");
    if (id) addToTour(id);
  });

  // ---------- Render Ghats Tab ----------
  function renderGhats() {
    const list = filteredGhats();
    if (panelGhats.classList.contains("show")) {
      leftCount.textContent = String(list.length);
      leftCountLabel.textContent = "ghats";
    }

    const sel = readGhatSelection();
    ghatList.innerHTML = "";

    if (!list.length) {
      ghatList.innerHTML = `<div class="note" style="border-top:none; margin-top:0;">No ghats match your search.</div>`;
      return;
    }

    list.forEach((g) => {
      const row = document.createElement("div");
      row.className = "ghatRow";
      row.innerHTML = `
        <input type="checkbox" data-gchk="${g.id}" ${sel[g.id] ? "checked" : ""}>
        <div>
          <b>${esc(g.name)}</b>
          <small>${esc(g.group.toUpperCase())} • Best: ${esc(prettyTime(g.bestTime))} • Time: ${esc(g.timeNeeded)}</small>
        </div>
        <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end; flex-wrap:wrap;">
          ${g.famous ? `<span class="tag famous">Famous</span>` : `<span class="tag">Ghat</span>`}
          <button class="tinybtn" data-gadd="${g.id}">➕ Add</button>
        </div>
      `;
      ghatList.appendChild(row);
    });
  }

  ghatList.addEventListener("click", (e) => {
    const id = e.target?.getAttribute?.("data-gadd");
    if (id) addToTour(id);
  });

  ghatList.addEventListener("change", (e) => {
    const id = e.target?.getAttribute?.("data-gchk");
    if (!id) return;
    const sel = readGhatSelection();
    sel[id] = e.target.checked;
    writeGhatSelection(sel);
  });

  ghatSelectFamous.addEventListener("click", () => {
    const sel = readGhatSelection();
    filteredGhats().forEach((g) => {
      if (g.famous) sel[g.id] = true;
    });
    writeGhatSelection(sel);
    renderGhats();
    toast("Selected", "Famous ghats ticked.");
  });

  ghatAddSelected.addEventListener("click", () => {
    const sel = readGhatSelection();
    const ids = Object.keys(sel).filter((k) => sel[k]);
    if (!ids.length) return toast("Nothing selected", "Tick some ghats first.");
    const ordered = filteredGhats()
      .map((g) => g.id)
      .filter((id) => ids.includes(id));
    ordered.forEach(addToTour);
    toast("Added", `${ordered.length} ghat(s) added to your tour.`);
  });

  ghatClearSelected.addEventListener("click", () => {
    writeGhatSelection({});
    renderGhats();
    toast("Cleared", "Ghat selection cleared.");
  });

  // ---------- Render Tour ----------
  function renderTour() {
    const ids = readTour();
    tourCount.textContent = String(ids.length);
    tourList.innerHTML = "";

    ids.forEach((id, idx) => {
      const d = getItemById(id);
      if (!d) return;
      const isHome = id === HOME.id;

      const item = document.createElement("div");
      item.className = "touritem";
      item.innerHTML = `
        <div>
          <b>${idx + 1}. ${esc(d.name)}${isHome ? " (Start)" : ""}</b>
          <small>${esc(d.type || "Place")} • ${esc(prettyTime(d.bestTime || "day"))} • ${esc(d.timeNeeded || "—")}</small>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="tinybtn up" data-up="${id}" ${isHome ? "disabled" : ""}>▲</button>
          <button class="tinybtn down" data-down="${id}" ${isHome ? "disabled" : ""}>▼</button>
          <button class="tinybtn remove" data-rm="${id}" ${isHome ? "disabled" : ""}>Remove</button>
        </div>
      `;
      tourList.appendChild(item);
    });

    renderDestinations();
  }

  tourList.addEventListener("click", (e) => {
    const rm = e.target?.getAttribute?.("data-rm");
    const up = e.target?.getAttribute?.("data-up");
    const down = e.target?.getAttribute?.("data-down");
    if (rm) removeFromTour(rm);
    if (up) moveTour(up, "up");
    if (down) moveTour(down, "down");
  });

  // ---------- Summary + Actions ----------
  function makeSummaryText() {
    const ids = readTour();
    const lines = ids
      .map((id, i) => {
        const d = getItemById(id);
        if (!d) return null;
        return `${i + 1}) ${d.name} — ${d.type || "Place"} — Best: ${prettyTime(d.bestTime || "day")} — Time: ${d.timeNeeded || "—"}\n   Map: ${d.map || ""}`;
      })
      .filter(Boolean);

    return `Varanasi Tour Plan (DIY)\n-----------------------\n${lines.join("\n")}\n\nTips:\n• Start early for ghats/boat ride.\n• Keep buffer time for queues.\n• Be respectful at sensitive places.`;
  }

  document.getElementById("makePlanBtn").addEventListener("click", () => {
    if (!readTour().length)
      return toast("Tour empty", "Add destinations first.");
    const text = makeSummaryText();
    summaryBox.style.display = "block";
    summaryBox.innerHTML = `<b>Your Tour Summary</b><br/><pre style="white-space:pre-wrap; margin:8px 0 0; font:inherit; font-size:12px; color:var(--ink)"></pre>`;
    summaryBox.querySelector("pre").textContent = text;
    toast("Summary created", "You can share it on WhatsApp.");
  });

  document.getElementById("clearTourBtn").addEventListener("click", clearTour);
  document
    .getElementById("saveTourBtn")
    .addEventListener("click", () =>
      toast("Saved", "Your tour is saved in this browser."),
    );

  document.getElementById("waShare").addEventListener("click", () => {
    if (!readTour().length)
      return toast("Tour empty", "Add destinations to share.");
    const text = makeSummaryText();
    window.open(
      "https://wa.me/?text=" + encodeURIComponent(text),
      "_blank",
      "noopener",
    );
  });

  // ---------- Init ----------
  renderTour();
  renderDestinations();
  renderGhats();
  setTab("places");
})();
