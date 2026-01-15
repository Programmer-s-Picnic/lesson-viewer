(() => {
  const LS_TOUR = "varanasi_tour_v1";
  const LS_COORDS = "varanasi_coords_v1"; // cache geocoded coords per destination id

  // --- Simple "photo-like" SVG images (offline, no external links) ---
  function svgDataURI(svg){ return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); }
  function escapeXML(s){
    return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
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
          <rect x="60" y="60" width="820" height="210" rx="28" fill="#fff" fill-opacity=".86"/>
          <rect x="60" y="60" width="820" height="210" rx="28" fill="none" stroke="#eadcc5" stroke-width="6"/>
          <text x="105" y="150" font-size="56" font-family="Arial, sans-serif" font-weight="800" fill="#1f2937">${escapeXML(title)}</text>
          <text x="105" y="210" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#6b7280">${escapeXML(subtitle)}</text>
        </g>
        <g fill="#1f2937" fill-opacity=".22">
          <rect x="160" y="440" width="90" height="60" rx="10"/>
          <rect x="265" y="410" width="120" height="90" rx="12"/>
          <rect x="395" y="430" width="110" height="70" rx="12"/>
          <rect x="520" y="400" width="140" height="100" rx="14"/>
          <rect x="670" y="430" width="110" height="70" rx="12"/>
        </g>
      </svg>
    `);
  }

  // --- Champak's Home as first destination ---
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

  // Destinations (HOME first)
  const DEST = [
    HOME,
    {
      id:"d1",
      name:"Shri Kashi Vishwanath Temple",
      type:"Temple",
      bestTime:"day",
      timeNeeded:"1–2 hrs",
      cost:"Depends (donations / queue services)",
      highlights:"One of the most revered Shiva temples; spiritual heart of Kashi.",
      map:"https://www.google.com/maps/search/?api=1&query=Kashi+Vishwanath+Temple+Varanasi",
      coords:[25.31085, 83.01068],
      photos:[
        photoSVG("Kashi Vishwanath", "Temple & corridor vibes", 28),
        photoSVG("Kashi Vishwanath", "Morning darshan energy", 36),
        photoSVG("Kashi Vishwanath", "Evening lanes nearby", 20),
      ]
    },
    {
      id:"d2",
      name:"Dashashwamedh Ghat",
      type:"Ghat",
      bestTime:"evening",
      timeNeeded:"1–2 hrs",
      cost:"Free (Aarti seating may cost)",
      highlights:"Famous for the Ganga Aarti; lively atmosphere by the river.",
      map:"https://www.google.com/maps/search/?api=1&query=Dashashwamedh+Ghat+Varanasi",
      coords:[25.30716889, 83.01033639],
      photos:[
        photoSVG("Dashashwamedh Ghat", "Ganga Aarti (evening)", 18),
        photoSVG("Dashashwamedh Ghat", "Crowd & lamps glow", 26),
        photoSVG("Dashashwamedh Ghat", "Riverfront view", 14),
      ]
    },
    {
      id:"d3",
      name:"Assi Ghat",
      type:"Ghat",
      bestTime:"sunrise",
      timeNeeded:"1–2 hrs",
      cost:"Free",
      highlights:"Calmer vibe; sunrise scenes and morning walks by the ghats.",
      map:"https://www.google.com/maps/search/?api=1&query=Assi+Ghat+Varanasi",
      coords:[25.289322, 83.006499],
      photos:[
        photoSVG("Assi Ghat", "Sunrise calm", 40),
        photoSVG("Assi Ghat", "Morning walk & chai", 34),
        photoSVG("Assi Ghat", "Boats & soft light", 46),
      ]
    },
    {
      id:"d4",
      name:"Manikarnika Ghat",
      type:"Ghat",
      bestTime:"day",
      timeNeeded:"30–60 min",
      cost:"Free",
      highlights:"A major cremation ghat; deeply traditional and powerful to witness (be respectful).",
      map:"https://www.google.com/maps/search/?api=1&query=Manikarnika+Ghat+Varanasi",
      coords:[25.31087056, 83.01408556],
      photos:[
        photoSVG("Manikarnika Ghat", "Oldest traditions", 10),
        photoSVG("Manikarnika Ghat", "Historic riverfront", 16),
        photoSVG("Manikarnika Ghat", "Respectful viewing", 6),
      ]
    },
    {
      id:"d5",
      name:"Sarnath (Dhamek Stupa & ruins)",
      type:"Sarnath",
      bestTime:"day",
      timeNeeded:"2–4 hrs",
      cost:"Tickets may apply",
      highlights:"Buddhist pilgrimage site; serene monuments and historical ruins.",
      map:"https://www.google.com/maps/search/?api=1&query=Dhamek+Stupa+Sarnath",
      coords:[25.3808, 83.0245],
      photos:[
        photoSVG("Sarnath", "Dhamek Stupa", 120),
        photoSVG("Sarnath", "Peaceful lawns", 140),
        photoSVG("Sarnath", "Ruins & history", 110),
      ]
    },
    {
      id:"d6",
      name:"Sarnath Museum (Archaeological Museum)",
      type:"Sarnath",
      bestTime:"day",
      timeNeeded:"1–2 hrs",
      cost:"Tickets apply",
      highlights:"Artifacts from Sarnath; iconic Ashokan lion capital association.",
      map:"https://www.google.com/maps/search/?api=1&query=Sarnath+Museum",
      coords:[25.376165, 83.022713],
      photos:[
        photoSVG("Sarnath Museum", "Artifacts & sculpture", 200),
        photoSVG("Sarnath Museum", "Heritage exhibits", 190),
        photoSVG("Sarnath Museum", "Learning stop", 210),
      ]
    },
    {
      id:"d7",
      name:"Ramnagar Fort",
      type:"Heritage",
      bestTime:"day",
      timeNeeded:"1–2 hrs",
      cost:"Tickets may apply",
      highlights:"Historic fort across the Ganga; museum and royal-era collections.",
      map:"https://www.google.com/maps/search/?api=1&query=Ramnagar+Fort+Varanasi",
      coords:[25.269262, 83.022144],
      photos:[
        photoSVG("Ramnagar Fort", "Fort & museum", 260),
        photoSVG("Ramnagar Fort", "Royal collections", 240),
        photoSVG("Ramnagar Fort", "Ganga-side view", 280),
      ]
    },
    {
      id:"d8",
      name:"BHU & Bharat Kala Bhavan",
      type:"Heritage",
      bestTime:"day",
      timeNeeded:"2–4 hrs",
      cost:"Often free/entry rules vary",
      highlights:"Campus stroll + art museum; peaceful green spaces.",
      map:"https://www.google.com/maps/search/?api=1&query=BHU+Bharat+Kala+Bhavan+Varanasi",
      // Added explicit coords to avoid relying on Nominatim
      coords:[25.27149, 82.995994],
      photos:[
        photoSVG("BHU", "Green campus walk", 90),
        photoSVG("Bharat Kala Bhavan", "Art & culture", 70),
        photoSVG("BHU", "Quiet evenings", 100),
      ]
    },
    {
      id:"d9",
      name:"Kaal Bhairav Temple",
      type:"Temple",
      bestTime:"day",
      timeNeeded:"45–90 min",
      cost:"Free",
      highlights:"Popular local deity temple; often a dedicated queue.",
      map:"https://www.google.com/maps/search/?api=1&query=Kaal+Bhairav+Temple+Varanasi",
      photos:[
        photoSVG("Kaal Bhairav", "Local devotion", 320),
        photoSVG("Kaal Bhairav", "Queue & darshan", 300),
        photoSVG("Kaal Bhairav", "Temple street", 340),
      ]
    },
    {
      id:"d10",
      name:"Sankat Mochan Hanuman Temple",
      type:"Temple",
      bestTime:"day",
      timeNeeded:"45–90 min",
      cost:"Free",
      highlights:"Beloved Hanuman temple; close to BHU area.",
      map:"https://www.google.com/maps/search/?api=1&query=Sankat+Mochan+Temple+Varanasi",
      coords:[25.281852, 82.998652],
      photos:[
        photoSVG("Sankat Mochan", "Hanuman temple", 30),
        photoSVG("Sankat Mochan", "Prasad & prayers", 22),
        photoSVG("Sankat Mochan", "Near BHU area", 38),
      ]
    },
    {
      id:"d11",
      name:"Boat Ride on the Ganga (Ghats stretch)",
      type:"Experience",
      bestTime:"sunrise",
      timeNeeded:"1–2 hrs",
      cost:"Paid",
      highlights:"Classic Varanasi experience—see ghats from the river (sunrise is magical).",
      map:"https://www.google.com/maps/search/?api=1&query=Boat+ride+Varanasi+ghats",
      photos:[
        photoSVG("Boat Ride", "Sunrise on Ganga", 48),
        photoSVG("Boat Ride", "Ghats panorama", 54),
        photoSVG("Boat Ride", "Quiet water moments", 42),
      ]
    },
    {
      id:"d12",
      name:"Vishalakshi Temple / Shakti Peeth area",
      type:"Temple",
      bestTime:"day",
      timeNeeded:"45–90 min",
      cost:"Free",
      highlights:"Close to the Vishwanath corridor region; devotional circuit-friendly.",
      map:"https://www.google.com/maps/search/?api=1&query=Vishalakshi+Temple+Varanasi",
      photos:[
        photoSVG("Vishalakshi Temple", "Shakti Peeth area", 15),
        photoSVG("Vishalakshi Temple", "Temple lane", 24),
        photoSVG("Vishalakshi Temple", "Devotional circuit", 12),
      ]
    },
    {
      id:"d13",
      name:"Godowlia Market (Shopping & street life)",
      type:"Market",
      bestTime:"evening",
      timeNeeded:"1–2 hrs",
      cost:"Free",
      highlights:"Local shopping + lanes; great for Banarasi items and snacks.",
      map:"https://www.google.com/maps/search/?api=1&query=Godowlia+Market+Varanasi",
      photos:[
        photoSVG("Godowlia Market", "Street life & shops", 5),
        photoSVG("Godowlia Market", "Snacks & lanes", 18),
        photoSVG("Godowlia Market", "Evening lights", 10),
      ]
    },
    {
      id:"d14",
      name:"Banaras Silk & Weaving lanes (Saree experience)",
      type:"Market",
      bestTime:"day",
      timeNeeded:"2–3 hrs",
      cost:"Free",
      highlights:"Explore famous Banarasi silk craft (buy only from trusted sellers).",
      map:"https://www.google.com/maps/search/?api=1&query=Banarasi+silk+weaving+Varanasi",
      photos:[
        photoSVG("Banarasi Silk", "Weaving craft", 285),
        photoSVG("Banarasi Silk", "Patterns & zari", 300),
        photoSVG("Banarasi Silk", "Shopping tip: trusted", 270),
      ]
    }
  ];

  // ------- LocalStorage Tour Helpers -------
  function readTour(){
    try { return JSON.parse(localStorage.getItem(LS_TOUR) || "[]"); }
    catch { return []; }
  }
  function writeTour(ids){
    localStorage.setItem(LS_TOUR, JSON.stringify(ids));
  }

  // Ensure Home is ALWAYS first in the tour
  function normalizeTour(){
    let ids = readTour().filter(Boolean);
    ids = ids.filter(id => id !== HOME.id);
    ids.unshift(HOME.id);
    const exists = new Set(DEST.map(d=>d.id));
    ids = ids.filter(id => exists.has(id));
    ids = [...new Set(ids)];
    writeTour(ids);
  }
  normalizeTour();

  // ------- UI refs -------
  const destGrid = document.getElementById("destGrid");
  const destCount = document.getElementById("destCount");
  const tourList = document.getElementById("tourList");
  const tourCount = document.getElementById("tourCount");
  const topSearch = document.getElementById("topSearch");
  const rightSearch = document.getElementById("rightSearch");
  const filterType = document.getElementById("filterType");
  const filterTime = document.getElementById("filterTime");
  const summaryBox = document.getElementById("summaryBox");

  // Map modal refs
  const mapModal = document.getElementById("mapModal");
  const openMapsLink = document.getElementById("openMapsLink");

  // Leaflet map refs
  let leafletMap = null;
  let leafletLayer = null;
  let leafletMarkers = [];
  let leafletPolyline = null;

  const toastWrap = document.getElementById("toast");
  function toast(title, detail){
    const el = document.createElement("div");
    el.className = "t";
    el.innerHTML = `<div class="okdot"></div><div class="msg"><b>${title}</b><small>${detail}</small></div>`;
    toastWrap.appendChild(el);
    setTimeout(()=> el.remove(), 2600);
  }

  // ------- Filters -------
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
    return m[t] || t;
  }

  function filteredDest(){
    const q = state.q.trim().toLowerCase();
    return DEST.filter(d=>{
      const matchesQ = !q || (d.name + " " + d.type + " " + d.bestTime + " " + d.highlights).toLowerCase().includes(q);
      const matchesType = state.type === "all" || d.type === state.type;
      const matchesTime = state.time === "all" || d.bestTime === state.time;
      return matchesQ && matchesType && matchesTime;
    });
  }

  // ------- Tour ops -------
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

    // Keep index 0 fixed for HOME
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

  // ------- Google Maps route URL (new tab / share) -------
  function placeQuery(d){
    if(Array.isArray(d.coords)) return `${d.coords[0]},${d.coords[1]}`;
    return `${d.name} Varanasi`;
  }
  function buildRouteUrlFromTour(){
    const ids = readTour();
    if(ids.length === 0) return null;
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

  // ------- Coords cache + geocode fallback (OpenStreetMap Nominatim) -------
  function readCoordsCache(){
    try { return JSON.parse(localStorage.getItem(LS_COORDS) || "{}"); }
    catch { return {}; }
  }
  function writeCoordsCache(cache){
    localStorage.setItem(LS_COORDS, JSON.stringify(cache));
  }

  async function geocodeOnce(name){
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(name + " Varanasi Uttar Pradesh India");
    const res = await fetch(url, { headers: { "Accept":"application/json" }});
    if(!res.ok) return null;
    const data = await res.json();
    if(!data || !data[0]) return null;
    return [Number(data[0].lat), Number(data[0].lon)];
  }

  async function ensureCoordsForPlace(d){
    if(Array.isArray(d.coords)) return d.coords;

    const cache = readCoordsCache();
    if(cache[d.id] && Array.isArray(cache[d.id]) && cache[d.id].length === 2){
      d.coords = cache[d.id];
      return d.coords;
    }

    try{
      const c = await geocodeOnce(d.name);
      if(c){
        d.coords = c;
        cache[d.id] = c;
        writeCoordsCache(cache);
        return c;
      }
    }catch(e){
      // ignore
    }
    return null;
  }

  // ------- Map modal (Leaflet) -------
  function initLeafletIfNeeded(){
    if(leafletMap) return;

    leafletMap = L.map("leafletMap", { zoomControl:true });
    leafletLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);

    // initial view near Varanasi
    leafletMap.setView([25.3176, 82.9739], 12);
  }

  function clearLeafletOverlays(){
    if(!leafletMap) return;
    for(const m of leafletMarkers) m.remove();
    leafletMarkers = [];
    if(leafletPolyline){ leafletPolyline.remove(); leafletPolyline = null; }
  }

  async function openMapModal(){
    const url = buildRouteUrlFromTour();
    if(!url){
      toast("Tour empty", "Add destinations first, then view the map.");
      return;
    }
    openMapsLink.href = url;

    mapModal.classList.add("show");
    mapModal.setAttribute("aria-hidden", "false");

    initLeafletIfNeeded();
    // Leaflet needs a resize after showing modal
    setTimeout(()=> leafletMap.invalidateSize(), 80);

    clearLeafletOverlays();

    const ids = readTour();
    const places = ids.map(id => DEST.find(x=>x.id===id)).filter(Boolean);

    // Resolve coords (cached / known / geocoded)
    const coordsList = [];
    for(const p of places){
      const c = await ensureCoordsForPlace(p);
      if(c) coordsList.push({ p, c });
    }

    if(coordsList.length === 0){
      toast("No coordinates", "Could not locate places on map. Try Open in Maps.");
      return;
    }

    // Markers
    coordsList.forEach((obj, i)=>{
      const { p, c } = obj;
      const marker = L.marker(c).addTo(leafletMap);
      marker.bindPopup(`<b>${i+1}. ${p.name}</b><br><small>${p.type} • ${prettyTime(p.bestTime)} • ${p.timeNeeded}</small>`);
      leafletMarkers.push(marker);
    });

    // Route line in chosen order (only among resolved coords)
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

  document.getElementById("viewMapBtn").addEventListener("click", openMapModal);
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

  // ------- Carousel state -------
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

  // Pause carousels when tab is hidden (battery friendly)
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden) stopAllCarousels();
    else renderDestinations();
  });

  // ------- Render destinations -------
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

          <div class="car-nav" aria-hidden="false">
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

  // ------- Render tour -------
  function renderTour(){
    const ids = readTour();

    // FIX: show stops count excluding pinned HOME
    const stops = Math.max(0, ids.length - 1);
    tourCount.textContent = String(stops);

    tourList.innerHTML = "";

    // FIX: "empty" means only start point
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

  // Tour list events
  tourList.addEventListener("click", (e)=>{
    const rm = e.target?.getAttribute?.("data-rm");
    const up = e.target?.getAttribute?.("data-up");
    const down = e.target?.getAttribute?.("data-down");
    if(rm) removeFromTour(rm);
    if(up) moveTour(up, "up");
    if(down) moveTour(down, "down");
  });

  // Destination grid events
  destGrid.addEventListener("click", (e)=>{
    const id = e.target?.getAttribute?.("data-add");
    if(!id) return;
    addToTour(id);
  });

  // Summary generator
  function makeSummaryText(){
    const ids = readTour();
    const places = ids.map((id, i)=>{
      const d = DEST.find(x=>x.id===id);
      if(!d) return null;
      const mapLink = d.mapShort ? d.mapShort : d.map;
      return `${i+1}) ${d.name} — ${d.type} — Best: ${prettyTime(d.bestTime)} — Time: ${d.timeNeeded}\n   Map: ${mapLink}`;
    }).filter(Boolean);

    const header = `Varanasi Tour Plan (DIY)\n-----------------------`;
    const footer = `\nTips:\n• Start early for ghats/boat ride.\n• Keep buffer time for queues.\n• Be respectful at sensitive places (e.g., Manikarnika Ghat).`;
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
    toast("Summary