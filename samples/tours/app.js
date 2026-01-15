(() => {
  const LS_TOUR = "varanasi_tour_v3";
  const LS_COORDS = "varanasi_coords_v3";
  const LS_USER_LOC = "varanasi_user_location_v1"; // {label, coords:[lat,lng], ts}
  const LS_LOC_CACHE = "varanasi_loc_geocode_cache_v1"; // { "query": [lat,lng,label] }

  // ---------- Utilities ----------
  function now(){ return Date.now(); }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  // Haversine distance (km)
  function distKm(a, b){
    if(!a || !b) return Infinity;
    const [lat1, lon1] = a.map(Number);
    const [lat2, lon2] = b.map(Number);
    const R = 6371;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const s1 = Math.sin(dLat/2), s2 = Math.sin(dLon/2);
    const q = s1*s1 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*s2*s2;
    return 2 * R * Math.asin(Math.sqrt(q));
  }

  function fmtKm(k){
    if(!isFinite(k)) return "—";
    if(k < 1) return `${Math.round(k*1000)} m`;
    return `${k.toFixed(k < 10 ? 1 : 0)} km`;
  }

  // ---------- Offline SVG image generator ----------
  function svgDataURI(svg){ return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }
  function escapeXML(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&apos;");
  }
  function photoSVG(title, subtitle, hue){
    const h = Number(hue)||30;
    return svgDataURI(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="hsl(${h}, 90%, 60%)" stop-opacity=".95"/>
            <stop offset="1" stop-color="hsl(${h+40}, 85%, 55%)" stop-opacity=".92"/>
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
        <path d="M0 520 C 200 490, 320 560, 520 530 C 720 500, 900 580, 1200 520 L1200 700 L0 700 Z"
              fill="#ffffff" fill-opacity=".20"/>
        <path d="M0 560 C 240 540, 360 610, 600 580 C 840 550, 980 640, 1200 580 L1200 700 L0 700 Z"
              fill="#ffffff" fill-opacity=".18"/>
        <circle cx="960" cy="160" r="90" fill="#fff" fill-opacity=".22"/>
        <g filter="url(#s)">
          <rect x="60" y="60" width="860" height="220" rx="28" fill="#fff" fill-opacity=".86"/>
          <rect x="60" y="60" width="860" height="220" rx="28" fill="none" stroke="#eadcc5" stroke-width="6"/>
          <text x="105" y="155" font-size="56" font-family="Arial, sans-serif" font-weight="800" fill="#1f2937">${escapeXML(title)}</text>
          <text x="105" y="220" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#6b7280">${escapeXML(subtitle)}</text>
        </g>
        <g fill="#1f2937" fill-opacity=".22">
          <rect x="160" y="440" width="90" height="60" rx="10"/>
          <rect x="265" y="410" width="120" height="90" rx="12"/>
          <rect x="395" y="430" width="110" height="70" rx="12"/>
          <rect x="520" y="400" width="140" height="100" rx="14"/>
          <rect x="670" y="430" width="110" height="70" rx="12"/>
          <rect x="800" y="410" width="120" height="90" rx="12"/>
        </g>
      </svg>
    `);
  }
  function pics(name, a, b, c, hue){
    return [
      photoSVG(name, a, hue),
      photoSVG(name, b, hue + 10),
      photoSVG(name, c, hue + 20),
    ];
  }

  // ---------- Start Point (Pinned) ----------
  const HOME = {
    id:"d0",
    name:"Champak's Home",
    type:"Start Point",
    bestTime:"day",
    timeNeeded:"—",
    cost:"—",
    highlights:"Your starting point (25.349304, 83.001256).",
    map:"https://www.google.com/maps/search/?api=1&query=25.349304,83.001256",
    mapShort:"https://maps.app.goo.gl/bknSLrV9C48gY4yK6",
    coords:[25.349304, 83.001256],
    photos:[
      photoSVG("Champak's Home", "Start here • 25.349304, 83.001256", 35),
      photoSVG("Champak's Home", "Plan your route from here", 22),
      photoSVG("Champak's Home", "Ready for Varanasi tour", 44),
    ]
  };

  // ---------- Destinations (restored big list) ----------
  const DEST = [
    HOME,

    { id:"d1", name:"Shri Kashi Vishwanath Temple", type:"Temple", bestTime:"day", timeNeeded:"1–2 hrs", cost:"Depends", highlights:"Spiritual heart of Kashi; iconic temple area.",
      map:"https://www.google.com/maps/search/?api=1&query=Kashi+Vishwanath+Temple+Varanasi", coords:[25.31085, 83.01068],
      photos:pics("Kashi Vishwanath", "Temple & corridor vibes", "Morning darshan energy", "Old lanes nearby", 28)
    },
    { id:"d2", name:"Annapurna Temple", type:"Temple", bestTime:"day", timeNeeded:"30–60 min", cost:"Free", highlights:"Beloved temple near Vishwanath area.",
      map:"https://www.google.com/maps/search/?api=1&query=Annapurna+Temple+Varanasi",
      photos:pics("Annapurna Temple", "Devotional stop", "Near Vishwanath area", "Quiet darshan moments", 18)
    },
    { id:"d3", name:"Kaal Bhairav Temple", type:"Temple", bestTime:"day", timeNeeded:"45–90 min", cost:"Free", highlights:"Popular local deity temple; queues common.",
      map:"https://www.google.com/maps/search/?api=1&query=Kaal+Bhairav+Temple+Varanasi",
      photos:pics("Kaal Bhairav", "Local devotion", "Queue & darshan", "Temple street", 320)
    },
    { id:"d4", name:"Sankat Mochan Hanuman Temple", type:"Temple", bestTime:"day", timeNeeded:"45–90 min", cost:"Free", highlights:"Famous Hanuman temple near BHU.",
      map:"https://www.google.com/maps/search/?api=1&query=Sankat+Mochan+Temple+Varanasi", coords:[25.281852, 82.998652],
      photos:pics("Sankat Mochan", "Hanuman temple", "Prasad & prayers", "Near BHU area", 30)
    },
    { id:"d5", name:"Durga Kund Temple", type:"Temple", bestTime:"day", timeNeeded:"45–90 min", cost:"Free", highlights:"Major Shakti temple; kund adds charm.",
      map:"https://www.google.com/maps/search/?api=1&query=Durga+Kund+Temple+Varanasi",
      photos:pics("Durga Kund", "Shakti temple", "Kund surroundings", "Festival season crowds", 12)
    },
    { id:"d6", name:"Tulsi Manas Temple", type:"Temple", bestTime:"day", timeNeeded:"45–90 min", cost:"Free", highlights:"Calm temple complex; Ramcharitmanas legacy.",
      map:"https://www.google.com/maps/search/?api=1&query=Tulsi+Manas+Temple+Varanasi",
      photos:pics("Tulsi Manas", "Temple calm", "Wall inscriptions", "Near Durga Kund zone", 22)
    },
    { id:"d7", name:"New Vishwanath Temple (BHU Birla Temple)", type:"Temple", bestTime:"evening", timeNeeded:"45–90 min", cost:"Free", highlights:"Beautiful BHU campus temple; serene.",
      map:"https://www.google.com/maps/search/?api=1&query=New+Vishwanath+Temple+BHU+Varanasi", coords:[25.2763, 82.9997],
      photos:pics("New Vishwanath (BHU)", "Campus temple", "Evening lights", "Peaceful walk", 36)
    },

    { id:"d8", name:"Dashashwamedh Ghat", type:"Ghat", bestTime:"evening", timeNeeded:"1–2 hrs", cost:"Free", highlights:"Most famous ghat; grand Ganga Aarti.",
      map:"https://www.google.com/maps/search/?api=1&query=Dashashwamedh+Ghat+Varanasi", coords:[25.30716889, 83.01033639],
      photos:pics("Dashashwamedh Ghat", "Ganga Aarti (evening)", "Crowd & lamps glow", "Riverfront view", 18)
    },
    { id:"d9", name:"Assi Ghat", type:"Ghat", bestTime:"sunrise", timeNeeded:"1–2 hrs", cost:"Free", highlights:"Calm sunrise vibe; walks, yoga & chai.",
      map:"https://www.google.com/maps/search/?api=1&query=Assi+Ghat+Varanasi", coords:[25.289322, 83.006499],
      photos:pics("Assi Ghat", "Sunrise calm", "Morning walk & chai", "Boats & soft light", 40)
    },
    { id:"d10", name:"Manikarnika Ghat", type:"Ghat", bestTime:"day", timeNeeded:"30–60 min", cost:"Free", highlights:"Major cremation ghat; visit respectfully.",
      map:"https://www.google.com/maps/search/?api=1&query=Manikarnika+Ghat+Varanasi", coords:[25.31087056, 83.01408556],
      photos:pics("Manikarnika Ghat", "Old traditions", "Historic riverfront", "Respectful viewing", 6)
    },
    { id:"d11", name:"Harishchandra Ghat", type:"Ghat", bestTime:"day", timeNeeded:"30–60 min", cost:"Free", highlights:"Important cremation ghat; calm atmosphere.",
      map:"https://www.google.com/maps/search/?api=1&query=Harishchandra+Ghat+Varanasi",
      photos:pics("Harishchandra Ghat", "Historic ghat", "Quiet riverfront", "Respect and silence", 10)
    },

    { id:"d14", name:"Sarnath (Dhamek Stupa & ruins)", type:"Sarnath", bestTime:"day", timeNeeded:"2–4 hrs", cost:"Tickets may apply", highlights:"Buddhist pilgrimage; serene monuments & ruins.",
      map:"https://www.google.com/maps/search/?api=1&query=Dhamek+Stupa+Sarnath", coords:[25.3808, 83.0245],
      photos:pics("Sarnath", "Dhamek Stupa", "Peaceful lawns", "Ruins & history", 120)
    },
    { id:"d15", name:"Sarnath Museum (Archaeological Museum)", type:"Museum", bestTime:"day", timeNeeded:"1–2 hrs", cost:"Tickets apply", highlights:"Artifacts & sculpture; learning stop.",
      map:"https://www.google.com/maps/search/?api=1&query=Sarnath+Museum", coords:[25.376165, 83.022713],
      photos:pics("Sarnath Museum", "Artifacts & sculpture", "Heritage exhibits", "Learning stop", 200)
    },

    { id:"d17", name:"Ramnagar Fort", type:"Heritage", bestTime:"day", timeNeeded:"1–2 hrs", cost:"Tickets may apply", highlights:"Historic fort across the Ganga; museum collections.",
      map:"https://www.google.com/maps/search/?api=1&query=Ramnagar+Fort+Varanasi", coords:[25.269262, 83.022144],
      photos:pics("Ramnagar Fort", "Fort & museum", "Royal collections", "Ganga-side view", 260)
    },
    { id:"d18", name:"BHU & Bharat Kala Bhavan", type:"Heritage", bestTime:"day", timeNeeded:"2–4 hrs", cost:"Entry rules vary", highlights:"Campus stroll + art museum; calm green spaces.",
      map:"https://www.google.com/maps/search/?api=1&query=BHU+Bharat+Kala+Bhavan+Varanasi", coords:[25.27149, 82.995994],
      photos:pics("BHU & Kala Bhavan", "Green campus walk", "Art & culture", "Quiet evenings", 90)
    },

    { id:"d21", name:"Boat Ride on the Ganga (Ghats stretch)", type:"Experience", bestTime:"sunrise", timeNeeded:"1–2 hrs", cost:"Paid", highlights:"Classic experience—see ghats from the river.",
      map:"https://www.google.com/maps/search/?api=1&query=Boat+ride+Varanasi+ghats",
      photos:pics("Boat Ride", "Sunrise on Ganga", "Ghats panorama", "Quiet water moments", 48)
    },

    { id:"d24", name:"Godowlia Market (Shopping & street life)", type:"Market", bestTime:"evening", timeNeeded:"1–2 hrs", cost:"Free", highlights:"Local shopping lanes; Banarasi items & snacks.",
      map:"https://www.google.com/maps/search/?api=1&query=Godowlia+Market+Varanasi",
      photos:pics("Godowlia Market", "Street life & shops", "Snacks & lanes", "Evening lights", 5)
    },
    { id:"d25", name:"Banaras Silk & Weaving Lanes (Saree experience)", type:"Market", bestTime:"day", timeNeeded:"2–3 hrs", cost:"Free", highlights:"Explore Banarasi silk craft (trusted sellers).",
      map:"https://www.google.com/maps/search/?api=1&query=Banarasi+silk+weaving+Varanasi",
      photos:pics("Banarasi Silk", "Weaving craft", "Patterns & zari", "Trusted seller tip", 285)
    },
    { id:"d26", name:"Kachori-Sabzi & Jalebi Breakfast Spots", type:"Food", bestTime:"day", timeNeeded:"30–60 min", cost:"Low", highlights:"Iconic Banarasi breakfast experience.",
      map:"https://www.google.com/maps/search/?api=1&query=Kachori+Sabzi+Varanasi",
      photos:pics("Banarasi Breakfast", "Kachori-sabzi", "Jalebi & chai", "Morning energy", 55)
    },
    { id:"d27", name:"Banarasi Paan Experience", type:"Food", bestTime:"evening", timeNeeded:"15–30 min", cost:"Low", highlights:"Famous Banarasi paan (choose hygienic shops).",
      map:"https://www.google.com/maps/search/?api=1&query=Banarasi+paan+Varanasi",
      photos:pics("Banarasi Paan", "Iconic taste", "Shop lanes", "After-dinner stop", 95)
    }
  ];

  // ---------- Storage helpers ----------
  function readTour(){
    try { return JSON.parse(localStorage.getItem(LS_TOUR) || "[]"); }
    catch { return []; }
  }
  function writeTour(ids){
    localStorage.setItem(LS_TOUR, JSON.stringify(ids));
  }

  function normalizeTour(){
    let ids = readTour().filter(Boolean);
    const exists = new Set(DEST.map(d=>d.id));
    ids = ids.filter(id => exists.has(id));
    ids = [...new Set(ids)];
    ids = ids.filter(id => id !== HOME.id);
    ids.unshift(HOME.id);
    writeTour(ids);
  }

  if(readTour().length === 0) writeTour([HOME.id]);
  normalizeTour();

  // ---------- UI refs ----------
  const destGrid = document.getElementById("destGrid");
  const destCount = document.getElementById("destCount");
  const tourList = document.getElementById("tourList");
  const tourCount = document.getElementById("tourCount");
  const topSearch = document.getElementById("topSearch");
  const rightSearch = document.getElementById("rightSearch");
  const filterType = document.getElementById("filterType");
  const filterTime = document.getElementById("filterTime");
  const summaryBox = document.getElementById("summaryBox");

  // Nearby UI
  const useMyLocBtn = document.getElementById("useMyLocBtn");
  const pinHomeBtn = document.getElementById("pinHomeBtn");
  const setLocBtn = document.getElementById("setLocBtn");
  const locInput = document.getElementById("locInput");
  const radiusKm = document.getElementById("radiusKm");
  const radiusLabel = document.getElementById("radiusLabel");
  const nearbyList = document.getElementById("nearbyList");
  const addNearbyBtn = document.getElementById("addNearbyBtn");
  const addTop3Btn = document.getElementById("addTop3Btn");
  const locStatus = document.getElementById("locStatus");
  const locNote = document.getElementById("locNote");
  const showNearbyOnMapBtn = document.getElementById("showNearbyOnMapBtn");

  // Map modal refs
  const mapModal = document.getElementById("mapModal");
  const openMapsLink = document.getElementById("openMapsLink");
  const mapTitle = document.getElementById("mapTitle");
  const mapSub = document.getElementById("mapSub");

  // Leaflet state
  let leafletMap = null;
  let leafletMarkers = [];
  let leafletPolyline = null;
  let leafletUserMarker = null;
  let leafletCircle = null;

  // toast
  const toastWrap = document.getElementById("toast");
  function toast(title, detail){
    const el = document.createElement("div");
    el.className = "t";
    el.innerHTML = `<div class="okdot"></div><div class="msg"><b>${title}</b><small>${detail}</small></div>`;
    toastWrap.appendChild(el);
    setTimeout(()=> el.remove(), 2600);
  }

  // ---------- Filters ----------
  const TYPES = ["all", ...new Set(DEST.map(d=>d.type))].sort((a,b)=>{
    if(a==="all") return -1; if(b==="all") return 1;
    return a.localeCompare(b);
  });
  TYPES.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t==="all" ? "All types" : t;
    filterType.appendChild(opt);
  });

  const state = { q:"", type:"all", time:"all" };
  function setSearch(v){
    state.q = (v || "");
    topSearch.value = state.q;
    rightSearch.value = state.q;
    renderDestinations();
  }
  topSearch.addEventListener("input", e => setSearch(e.target.value));
  rightSearch.addEventListener("input", e => setSearch(e.target.value));

  filterType.addEventListener("change", e=>{ state.type = e.target.value; renderDestinations(); });
  filterTime.addEventListener("change", e=>{ state.time = e.target.value; renderDestinations(); });

  function prettyTime(t){
    const m = {sunrise:"Sunrise", day:"Daytime", evening:"Evening", night:"Night"};
    return m[t] || (t ? (t[0].toUpperCase()+t.slice(1)) : "Any");
  }

  function filteredDest(){
    const q = state.q.trim().toLowerCase();
    return DEST.filter(d=>{
      const blob = (d.name + " " + d.type + " " + d.bestTime + " " + d.highlights).toLowerCase();
      const matchesQ = !q || blob.includes(q);
      const matchesType = state.type === "all" || d.type === state.type;
      const matchesTime = state.time === "all" || d.bestTime === state.time;
      return matchesQ && matchesType && matchesTime;
    });
  }

  // ---------- Tour ops ----------
  function addToTour(id){
    let ids = readTour();
    if(ids.includes(id)){
      toast("Already added", "This destination is already in your tour.");
      return;
    }
    ids.push(id);
    writeTour(ids);
    normalizeTour();
    renderTour();
    toast("Added to tour", DEST.find(x=>x.id===id)?.name || id);
  }
  function removeFromTour(id){
    if(id === HOME.id){
      toast("Pinned", "Champak's Home is the fixed start point.");
      return;
    }
    writeTour(readTour().filter(x=>x!==id));
    normalizeTour();
    renderTour();
  }
  function moveTour(id, dir){
    if(id === HOME.id) return;
    const ids = readTour();
    const idx = ids.indexOf(id);
    if(idx === -1) return;
    const newIdx = dir === "up" ? idx-1 : idx+1;
    if(newIdx < 1 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    writeTour(ids);
    normalizeTour();
    renderTour();
  }
  function clearTour(){
    writeTour([HOME.id]);
    normalizeTour();
    renderTour();
    summaryBox.style.display="none";
    summaryBox.textContent="";
    toast("Cleared", "Tour cleared (start point kept).");
  }

  // ---------- Route URL ----------
  function placeQuery(d){
    if(Array.isArray(d.coords)) return `${d.coords[0]},${d.coords[1]}`;
    return `${d.name} Varanasi`;
  }
  function buildRouteUrlFromTour(){
    const ids = readTour();
    const places = ids.map(id => DEST.find(x=>x.id===id)).filter(Boolean);
    if(places.length === 0) return null;

    if(places.length === 1){
      const q = encodeURIComponent(placeQuery(places[0]));
      return `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    const origin = encodeURIComponent(placeQuery(places[0]));
    const destination = encodeURIComponent(placeQuery(places[places.length - 1]));
    const middle = places.slice(1, -1).map(p => encodeURIComponent(placeQuery(p)));
    const waypoints = middle.slice(0, 20).join("%7C");
    const base = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${origin}&destination=${destination}`;
    return waypoints ? `${base}&waypoints=${waypoints}` : base;
  }

  // ---------- Coords cache + geocode for destinations ----------
  function readCoordsCache(){
    try { return JSON.parse(localStorage.getItem(LS_COORDS) || "{}"); }
    catch { return {}; }
  }
  function writeCoordsCache(cache){
    localStorage.setItem(LS_COORDS, JSON.stringify(cache));
  }

  async function geocodeOnce(query){
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(query);
    const res = await fetch(url, { headers: { "Accept":"application/json" }});
    if(!res.ok) return null;
    const data = await res.json();
    if(!data || !data[0]) return null;
    return {
      coords:[Number(data[0].lat), Number(data[0].lon)],
      label:data[0].display_name || query
    };
  }

  async function ensureCoordsForPlace(d){
    if(Array.isArray(d.coords)) return d.coords;

    const cache = readCoordsCache();
    if(cache[d.id] && Array.isArray(cache[d.id]) && cache[d.id].length === 2){
      d.coords = cache[d.id];
      return d.coords;
    }

    // Try geocode the destination name
    const q = `${d.name} Varanasi Uttar Pradesh India`;
    try{
      const g = await geocodeOnce(q);
      if(g?.coords){
        d.coords = g.coords;
        cache[d.id] = g.coords;
        writeCoordsCache(cache);
        return d.coords;
      }
    }catch(e){}
    return null;
  }

  // ---------- User location storage ----------
  function readUserLoc(){
    try { return JSON.parse(localStorage.getItem(LS_USER_LOC) || "null"); }
    catch { return null; }
  }
  function writeUserLoc(obj){
    localStorage.setItem(LS_USER_LOC, JSON.stringify(obj));
  }
  function readLocCache(){
    try { return JSON.parse(localStorage.getItem(LS_LOC_CACHE) || "{}"); }
    catch { return {}; }
  }
  function writeLocCache(obj){
    localStorage.setItem(LS_LOC_CACHE, JSON.stringify(obj));
  }

  function setLocStatus(label){
    locStatus.textContent = label || "Not set";
  }

  // ---------- Nearby Engine ----------
  let nearbyState = {
    center: null, // [lat,lng]
    label: null,
    radius: 3
  };

  function loadNearbyState(){
    nearbyState.radius = Number(radiusKm.value) || 3;
    radiusLabel.textContent = String(nearbyState.radius);

    const saved = readUserLoc();
    if(saved?.coords?.length === 2){
      nearbyState.center = saved.coords;
      nearbyState.label = saved.label || "Saved location";
      setLocStatus("📍 Set");
      locNote.textContent = `Location: ${nearbyState.label}`;
    }else{
      setLocStatus("Not set");
      locNote.textContent = "Tip: Tap Near Me → choose radius → add the closest places.";
    }
  }

  async function setLocationFromCoords(coords, label){
    nearbyState.center = coords;
    nearbyState.label = label || "Custom location";
    writeUserLoc({ coords, label: nearbyState.label, ts: now() });
    setLocStatus("📍 Set");
    locNote.textContent = `Location: ${nearbyState.label}`;
    await refreshNearby();
    toast("Location set", nearbyState.label);
  }

  async function setLocationFromInput(text){
    const q = (text || "").trim();
    if(!q){
      toast("Type a location", "Example: Assi Ghat, BHU, Sigra.");
      return;
    }

    // Cache lookup
    const cache = readLocCache();
    const key = q.toLowerCase();
    if(cache[key]?.coords?.length === 2){
      await setLocationFromCoords(cache[key].coords, cache[key].label || q);
      return;
    }

    setLocStatus("Searching…");
    try{
      // Bias search to Varanasi region by appending
      const g = await geocodeOnce(q.includes("Varanasi") ? q : `${q} Varanasi Uttar Pradesh India`);
      if(!g?.coords){
        setLocStatus("Not set");
        toast("Not found", "Try a more specific landmark.");
        return;
      }
      cache[key] = { coords:g.coords, label:g.label || q };
      writeLocCache(cache);
      await setLocationFromCoords(g.coords, g.label || q);
    }catch(e){
      setLocStatus("Not set");
      toast("Location error", "Network/geocode failed. Try again.");
    }
  }

  function setLocationToHome(){
    setLocationFromCoords(HOME.coords, "Champak's Home");
  }

  function getCurrentPositionPromise(opts){
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(resolve, reject, opts);
    });
  }

  async function setLocationNearMe(){
    setLocStatus("Locating…");
    try{
      const pos = await getCurrentPositionPromise({
        enableHighAccuracy:true,
        timeout: 12000,
        maximumAge: 60000
      });
      const coords = [pos.coords.latitude, pos.coords.longitude];
      await setLocationFromCoords(coords, "My current location");
    }catch(err){
      setLocStatus("Not set");
      toast("Location blocked", "Allow location permission and try again.");
    }
  }

  async function computeNearbyList(){
    if(!nearbyState.center) return [];

    const radius = nearbyState.radius;

    // Ensure coords for all destinations (lazy)
    const candidates = DEST.filter(d=>d.id !== HOME.id);
    const results = [];

    for(const d of candidates){
      const c = await ensureCoordsForPlace(d);
      if(!c) continue;
      const k = distKm(nearbyState.center, c);
      if(k <= radius){
        results.push({ d, km:k });
      }
    }

    results.sort((a,b)=> a.km - b.km);
    return results;
  }

  async function refreshNearby(){
    radiusLabel.textContent = String(nearbyState.radius);
    nearbyList.innerHTML = `<div class="note" style="border-top:none; margin-top:0;">Finding nearby places…</div>`;

    if(!nearbyState.center){
      nearbyList.innerHTML = `<div class="note" style="border-top:none; margin-top:0;">Set a location to see nearby destinations.</div>`;
      return;
    }

    const list = await computeNearbyList();
    if(list.length === 0){
      nearbyList.innerHTML = `<div class="note" style="border-top:none; margin-top:0;">No destinations found within ${nearbyState.radius} km. Increase radius.</div>`;
      return;
    }

    const tourSet = new Set(readTour());

    nearbyList.innerHTML = "";
    list.slice(0, 12).forEach(({d, km})=>{
      const inTour = tourSet.has(d.id);
      const item = document.createElement("div");
      item.className = "nearby-item";
      item.innerHTML = `
        <div>
          <b>${d.name}</b>
          <small>${d.type} • Best: ${prettyTime(d.bestTime)} • ${d.timeNeeded}</small>
        </div>
        <div class="near-meta">
          <span class="near-tag km">${fmtKm(km)}</span>
          <span class="near-tag type">${d.type}</span>
          <button class="tinybtn" data-near-add="${d.id}">${inTour ? "✓" : "+ Add"}</button>
        </div>
      `;
      nearbyList.appendChild(item);
    });

    // Save the full computed list in DOM dataset for batch add
    nearbyList.dataset.full = JSON.stringify(list.map(x => ({ id:x.d.id, km:x.km })));
  }

  function getNearbyFullIds(){
    try{
      const arr = JSON.parse(nearbyList.dataset.full || "[]");
      return arr.map(x=>x.id);
    }catch{ return []; }
  }

  async function addAllNearby(){
    const ids = getNearbyFullIds();
    if(ids.length === 0){
      toast("No nearby list", "Set a location first.");
      return;
    }
    let tour = readTour();
    let added = 0;
    for(const id of ids){
      if(!tour.includes(id)){
        tour.push(id);
        added++;
      }
    }
    writeTour(tour);
    normalizeTour();
    renderTour();
    await refreshNearby();
    toast("Added nearby", `${added} place(s) added to your tour.`);
  }

  async function addTopN(n){
    const ids = getNearbyFullIds().slice(0, n);
    if(ids.length === 0){
      toast("No nearby list", "Set a location first.");
      return;
    }
    let tour = readTour();
    let added = 0;
    for(const id of ids){
      if(!tour.includes(id)){
        tour.push(id);
        added++;
      }
    }
    writeTour(tour);
    normalizeTour();
    renderTour();
    await refreshNearby();
    toast("Added nearest", `${added} place(s) added.`);
  }

  // Nearby events
  radiusKm.addEventListener("input", async ()=>{
    nearbyState.radius = Number(radiusKm.value) || 3;
    radiusLabel.textContent = String(nearbyState.radius);
    if(nearbyState.center) await refreshNearby();
  });

  setLocBtn.addEventListener("click", ()=> setLocationFromInput(locInput.value));
  locInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter") setLocationFromInput(locInput.value); });

  useMyLocBtn.addEventListener("click", setLocationNearMe);
  pinHomeBtn.addEventListener("click", setLocationToHome);

  nearbyList.addEventListener("click", async (e)=>{
    const id = e.target?.getAttribute?.("data-near-add");
    if(!id) return;
    addToTour(id);
    await refreshNearby();
  });

  addNearbyBtn.addEventListener("click", addAllNearby);
  addTop3Btn.addEventListener("click", ()=> addTopN(3));

  // ---------- Leaflet Map ----------
  function initLeafletIfNeeded(){
    if(leafletMap) return;

    leafletMap = L.map("leafletMap", { zoomControl:true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);

    leafletMap.setView([25.3176, 82.9739], 12);
  }

  function clearLeafletOverlays(){
    if(!leafletMap) return;
    leafletMarkers.forEach(m => m.remove());
    leafletMarkers = [];
    if(leafletPolyline){ leafletPolyline.remove(); leafletPolyline = null; }
    if(leafletUserMarker){ leafletUserMarker.remove(); leafletUserMarker = null; }
    if(leafletCircle){ leafletCircle.remove(); leafletCircle = null; }
  }

  async function openMapModal(mode = "tour"){
    const url = buildRouteUrlFromTour();
    openMapsLink.href = url || "#";

    mapModal.classList.add("show");
    mapModal.setAttribute("aria-hidden", "false");

    initLeafletIfNeeded();
    setTimeout(()=> leafletMap.invalidateSize(), 80);

    clearLeafletOverlays();

    if(mode === "nearby"){
      mapTitle.textContent = "Nearby Map";
      mapSub.textContent = "Your location + radius circle + nearby destinations";

      if(!nearbyState.center){
        toast("Set a location", "Use Near Me or type a place first.");
        leafletMap.setView([25.3176, 82.9739], 12);
        return;
      }

      // User marker + radius circle
      leafletUserMarker = L.marker(nearbyState.center).addTo(leafletMap);
      leafletUserMarker.bindPopup(`<b>📍 ${nearbyState.label || "Location"}</b>`);

      leafletCircle = L.circle(nearbyState.center, {
        radius: nearbyState.radius * 1000,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.08
      }).addTo(leafletMap);

      const list = await computeNearbyList();
      const pts = [nearbyState.center];

      list.slice(0, 25).forEach(({d, km}, i)=>{
        if(!Array.isArray(d.coords)) return;
        const m = L.marker(d.coords).addTo(leafletMap);
        m.bindPopup(`<b>${d.name}</b><br><small>${d.type} • ${fmtKm(km)} away</small>`);
        leafletMarkers.push(m);
        pts.push(d.coords);
      });

      const bounds = L.latLngBounds(pts);
      leafletMap.fitBounds(bounds.pad(0.2));
      return;
    }

    // Default: Tour Map
    mapTitle.textContent = "Tour Map";
    mapSub.textContent = "Markers + route from your selected destinations (order matters)";

    const ids = readTour();
    const places = ids.map(id => DEST.find(x=>x.id===id)).filter(Boolean);

    const coordsList = [];
    for(const p of places){
      const c = await ensureCoordsForPlace(p);
      if(c) coordsList.push({ p, c });
    }

    if(coordsList.length === 0){
      toast("No coordinates", "Could not locate places on map. Try Open in Maps.");
      leafletMap.setView([25.3176, 82.9739], 12);
      return;
    }

    coordsList.forEach((obj, i)=>{
      const { p, c } = obj;
      const marker = L.marker(c).addTo(leafletMap);
      marker.bindPopup(`<b>${i+1}. ${p.name}</b><br><small>${p.type} • ${prettyTime(p.bestTime)} • ${p.timeNeeded}</small>`);
      leafletMarkers.push(marker);
    });

    const line = coordsList.map(x => x.c);
    if(line.length >= 2){
      leafletPolyline = L.polyline(line, { weight: 5, opacity: 0.9 }).addTo(leafletMap);
    }

    const bounds = L.latLngBounds(line);
    leafletMap.fitBounds(bounds.pad(0.18));
  }

  function closeMapModal(){
    mapModal.classList.remove("show");
    mapModal.setAttribute("aria-hidden", "true");
  }

  document.getElementById("viewMapBtn").addEventListener("click", ()=> openMapModal("tour"));
  document.getElementById("closeMapBtn").addEventListener("click", closeMapModal);
  mapModal.addEventListener("click", (e)=>{ if(e.target === mapModal) closeMapModal(); });
  window.addEventListener("keydown", (e)=>{ if(e.key === "Escape" && mapModal.classList.contains("show")) closeMapModal(); });

  document.getElementById("openMapsBtn").addEventListener("click", ()=>{
    const url = buildRouteUrlFromTour();
    if(!url){
      toast("Tour empty", "Add destinations first, then open maps.");
      return;
    }
    window.open(url, "_blank", "noopener");
  });

  showNearbyOnMapBtn.addEventListener("click", ()=> openMapModal("nearby"));

  // ---------- Carousel engine ----------
  const carIdx = new Map();
  const carTimers = new Map();
  function stopAllCarousels(){
    for(const t of carTimers.values()) clearInterval(t);
    carTimers.clear();
  }
  function setDotActive(dotsWrap, idx){
    [...dotsWrap.children].forEach((dot,i)=> dot.classList.toggle("active", i===idx));
  }
  function mountCarouselHandlers(cardEl, d){
    const track = cardEl.querySelector(".track");
    const dotsWrap = cardEl.querySelector(".dots");
    const prevBtn = cardEl.querySelector('[data-prev]');
    const nextBtn = cardEl.querySelector('[data-next]');

    const total = d.photos.length;
    let idx = carIdx.get(d.id) ?? 0;

    function go(newIdx){
      idx = (newIdx + total) % total;
      carIdx.set(d.id, idx);
      track.style.transform = `translateX(-${idx * 100}%)`;
      setDotActive(dotsWrap, idx);
    }

    prevBtn.addEventListener("click", (e)=>{ e.preventDefault(); go(idx - 1); });
    nextBtn.addEventListener("click", (e)=>{ e.preventDefault(); go(idx + 1); });

    const start = () => {
      stop();
      const t = setInterval(()=> go(idx + 1), 4500);
      carTimers.set(d.id, t);
    };
    const stop = () => {
      const t = carTimers.get(d.id);
      if(t) clearInterval(t);
      carTimers.delete(d.id);
    };

    cardEl.querySelector(".carousel").addEventListener("mouseenter", stop);
    cardEl.querySelector(".carousel").addEventListener("mouseleave", start);

    go(idx);
    start();
  }
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden) stopAllCarousels();
    else renderDestinations();
  });

  // ---------- Rendering ----------
  function renderDestinations(){
    stopAllCarousels();

    const list = filteredDest();
    destCount.textContent = String(list.length);
    destGrid.innerHTML = "";

    const tourIds = new Set(readTour());

    list.forEach(d=>{
      const inTour = tourIds.has(d.id);

      const el = document.createElement("article");
      el.className = "card";

      const dots = d.photos.map((_,i)=> `<span class="dot ${i===0?"active":""}"></span>`).join("");
      const slides = d.photos.map(src => `
        <div class="slide"><img src="${src}" alt="${d.name} photo"></div>
      `).join("");

      const openMapHref = d.mapShort ? d.mapShort : d.map;

      el.innerHTML = `
        <div class="carousel" aria-label="Sliding pictures">
          <span class="car-tag">Sliding photos</span>
          <div class="track">${slides}</div>

          <div class="car-nav">
            <button class="car-btn" data-prev="${d.id}" aria-label="Previous photo">‹</button>
            <button class="car-btn" data-next="${d.id}" aria-label="Next photo">›</button>
          </div>

          <div class="dots" aria-label="Slide indicators">${dots}</div>
        </div>

        <div class="card-top">
          <div>
            <p class="title">${d.name}</p>
            <p class="meta">${d.highlights}</p>
          </div>
          <div class="badges">
            <span class="badge cat">${d.type}</span>
            <span class="badge time">${prettyTime(d.bestTime)}</span>
            <span class="badge cost">${d.timeNeeded}</span>
          </div>
        </div>

        <div class="card-mid">
          <p class="desc">
            <b>Time needed:</b> ${d.timeNeeded}<br/>
            <b>Best time:</b> ${prettyTime(d.bestTime)}<br/>
            <b>Cost:</b> ${d.cost}
          </p>
        </div>

        <div class="card-actions">
          <button class="btn ${inTour ? "secondary":""}" data-add="${d.id}">
            ${inTour ? "✓ Added" : "➕ Add to Tour"}
          </button>
          <a class="btn secondary" href="${openMapHref}" target="_blank" rel="noopener">📍 Open Map</a>
        </div>
      `;

      destGrid.appendChild(el);
      mountCarouselHandlers(el, d);
    });
  }

  function renderTour(){
    const ids = readTour();
    tourCount.textContent = String(Math.max(0, ids.length - 1));

    tourList.innerHTML = "";
    if(ids.length <= 1){
      tourList.innerHTML = `
        <div class="note" style="border-top:none; margin-top:0;">
          Only the <b>Start Point</b> is selected. Add destinations from the left list.
        </div>
      `;
      renderDestinations();
      return;
    }

    ids.forEach((id, idx)=>{
      const d = DEST.find(x=>x.id===id);
      if(!d) return;

      const isHome = (id === HOME.id);

      const item = document.createElement("div");
      item.className = "touritem";
      item.innerHTML = `
        <div>
          <b>${idx+1}. ${d.name}${isHome ? " (Start)" : ""}</b>
          <small>${d.type} • ${prettyTime(d.bestTime)} • ${d.timeNeeded}</small>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="tinybtn up" title="Move up" data-up="${id}" ${isHome ? "disabled" : ""}>▲</button>
          <button class="tinybtn down" title="Move down" data-down="${id}" ${isHome ? "disabled" : ""}>▼</button>
          <button class="tinybtn remove" title="Remove" data-rm="${id}" ${isHome ? "disabled" : ""}>Remove</button>
        </div>
      `;
      tourList.appendChild(item);
    });

    renderDestinations();
  }

  tourList.addEventListener("click", (e)=>{
    const rm = e.target?.getAttribute?.("data-rm");
    const up = e.target?.getAttribute?.("data-up");
    const down = e.target?.getAttribute?.("data-down");
    if(rm) removeFromTour(rm);
    if(up) moveTour(up, "up");
    if(down) moveTour(down, "down");
  });

  destGrid.addEventListener("click", (e)=>{
    const id = e.target?.getAttribute?.("data-add");
    if(!id) return;
    addToTour(id);
  });

  function makeSummaryText(){
    const ids = readTour();
    const places = ids.map((id, i)=>{
      const d = DEST.find(x=>x.id===id);
      if(!d) return null;
      const mapLink = d.mapShort ? d.mapShort : d.map;
      return `${i+1}) ${d.name} — ${d.type} — Best: ${prettyTime(d.bestTime)} — Time: ${d.timeNeeded}\n   Map: ${mapLink}`;
    }).filter(Boolean);

    const header = `Varanasi Tour Plan (DIY)\n-----------------------`;
    const footer = `\nTips:\n• Start early for ghats/boat ride.\n• Keep buffer time for queues.\n• Be respectful at sensitive places.`;
    return `${header}\n${places.join("\n")}${footer}`;
  }

  document.getElementById("makePlanBtn").addEventListener("click", ()=>{
    const ids = readTour();
    if(ids.length <= 1){
      toast("Tour empty", "Add destinations first.");
      return;
    }
    const text = makeSummaryText();
    summaryBox.style.display = "block";
    summaryBox.innerHTML = `<b>Your Tour Summary</b><br/><pre style="white-space:pre-wrap; margin:8px 0 0; font:inherit; font-size:12px; color:var(--ink)"></pre>`;
    summaryBox.querySelector("pre").textContent = text;
    toast("Summary created", "You can share it on WhatsApp.");
  });

  document.getElementById("clearTourBtn").addEventListener("click", clearTour);
  document.getElementById("saveTourBtn").addEventListener("click", ()=> toast("Saved", "Your tour is saved in this browser."));

  document.getElementById("waShare").addEventListener("click", ()=>{
    const ids = readTour();
    if(ids.length <= 1){
      toast("Tour empty", "Add destinations to share.");
      return;
    }
    const text = makeSummaryText();
    const url = "https://wa.me/?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener");
  });

  // ---------- Boot ----------
  loadNearbyState();
  nearbyState.radius = Number(radiusKm.value) || 3;

  // If we have saved location, show nearby immediately
  refreshNearby().catch(()=>{});

  renderTour();
})();