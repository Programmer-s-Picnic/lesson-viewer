(() => {
  const LS_TOUR = "varanasi_tour_v3";
  const LS_COORDS = "varanasi_coords_v3";
  const LS_NEARBY_ANCHOR = "varanasi_nearby_anchor_v1";
  const LS_GHAT_CHECKED = "varanasi_ghat_checked_v1";

  // --- SVG "photo-like" placeholders (offline) ---
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
          <filter id="s" x="-10%" y="-10%" width="120%" height="120