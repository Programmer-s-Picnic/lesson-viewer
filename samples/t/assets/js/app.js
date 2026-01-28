
async function loadJSON(p){return fetch(p).then(r=>r.json());}
async function init(){
 const page=document.body.dataset.page;
 const site=await loadJSON("assets/data/site.json");
 const data=await loadJSON(`assets/data/${page}.json`);
 document.title=data.seo.title;
 document.getElementById("site-header").innerHTML=`<h1>${site.brand.name}</h1><p>${site.brand.tagline}</p>`;
 document.getElementById("content").innerHTML=`<h2>${data.hero.headline}</h2><p>${data.hero.subheadline}</p>`;
 document.getElementById("site-footer").innerHTML=`<p>WhatsApp: ${site.contact.whatsapp}</p>`;
}
init();
