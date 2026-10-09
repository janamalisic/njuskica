/* =================================================================
   1. CONFIG
   ================================================================= */
const IMG={sedi:"pas-sedi.webp",trci:"pas-trci.webp",portret:"pas-portret.webp"};
// Društvene mreže: ovde se menjaju adrese, sajt ih sam upiše na sva mesta.
// TODO: upišite tačan TikTok nalog (ako ga nema, ostavite "" i link se sakriva).
const SOCIAL={
  instagram:"https://www.instagram.com/salon_za_sisanje_pasanjuskica/",
  tiktok:"https://www.tiktok.com/@salon_za_sisanje_pasanjuskica"
};
function fillSocial(root=document){root.querySelectorAll("[data-social]").forEach(a=>{const u=SOCIAL[a.dataset.social];if(u)a.href=u;else a.hidden=true})}
const SIZES=[
  {id:"mali",name:"Maleni",desc:"do 10 kg",h:"30px"},
  {id:"srednji",name:"Srednji",desc:"10–25 kg",h:"42px"},
  {id:"veliki",name:"Veliki",desc:"preko 25 kg",h:"56px"}
];
// TODO: okvirne cene (RSD) i trajanje (min) po veličini [mali, srednji, veliki] — zamenite cenama salona
const TREATMENTS=[
  {id:"sisanje",name:"Šišanje & Stajling",short:"Šišanje",desc:"Kupanje, feniranje, šišanje po rasi ili po želji, nokti i uši.",price:[[2500,3200],[3200,4200],[4200,5500]],dur:[90,120,150]},
  {id:"kupanje",name:"Kupanje & Feniranje",short:"Kupanje",desc:"Dubinsko pranje šamponom za tip dlake, maska i fen.",price:[[1500,2000],[2000,2800],[2800,3800]],dur:[60,75,90]},
  {id:"nokti",name:"Higijena noktiju & ušiju",short:"Nokti & uši",desc:"Skraćivanje i turpijanje noktiju, čišćenje ušiju, šapice.",price:[[600,900],[700,1000],[900,1300]],dur:[30,30,30]},
  {id:"linjanje",name:"Tretman protiv linjanja",short:"Linjanje",desc:"Raščešljavanje podlake, kupka protiv linjanja i jak fen.",price:[[2000,2600],[2600,3400],[3400,4500]],dur:[75,90,120]}
];
const DAYS=["Nedelja","Ponedeljak","Utorak","Sreda","Četvrtak","Petak","Subota"];
const DAYS_SHORT=["Ned","Pon","Uto","Sre","Čet","Pet","Sub"];
const MONTHS=["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec"];
const DEFAULT_SETTINGS={slotStep:30,bookAhead:28,
  hours:{"1":{on:true,open:"09:00",close:"17:00"},"2":{on:true,open:"09:00",close:"17:00"},"3":{on:true,open:"09:00",close:"17:00"},
         "4":{on:true,open:"09:00",close:"17:00"},"5":{on:true,open:"09:00",close:"17:00"},"6":{on:true,open:"09:00",close:"14:00"},
         "0":{on:false,open:"09:00",close:"14:00"}},
  blocks:[]};

/* =================================================================
   2. HELPERS
   ================================================================= */
const $=(s,el=document)=>el.querySelector(s);
const h=(html)=>{const t=document.createElement("template");t.innerHTML=html.trim();return t.content.firstElementChild};
const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toMin=(t)=>{const [a,b]=t.split(":").map(Number);return a*60+b};
const toHM=(m)=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
const ymd=(d)=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const parseYmd=(s)=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const fmtRSD=(n)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,".");
const fmtDur=(m)=>m<60?m+" min":(Math.floor(m/60)+" h"+(m%60?" "+(m%60)+" min":""));
const prettyDate=(s)=>{const d=parseYmd(s);return DAYS_SHORT[d.getDay()]+", "+d.getDate()+". "+MONTHS[d.getMonth()]};
const rid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
function toast(msg){const t=h(`<div class="toast" role="status">${esc(msg)}</div>`);document.body.append(t);setTimeout(()=>t.remove(),2600)}
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const SKETCH=`<svg viewBox="0 0 260 90" preserveAspectRatio="none" aria-hidden="true"><path d="M20 22C70 8 150 4 200 12c40 6 56 22 52 38-6 26-70 38-130 36C56 84 8 70 8 48 8 30 30 18 74 12"/></svg>`;

/* =================================================================
   3. STORE — shared db when available, browser-local demo otherwise
     salon/config                 hours + blocks                  (all read, editors write)
     termini/<id>                 {date,start,dur,svc,size,uid}   public, no personal data
     zahtevi/<uid>/stavke/<id>    {owner,phone,dog,note}          client + editors only
   ================================================================= */
const Store={
  mode:"init",settings:structuredClone(DEFAULT_SETTINGS),bookings:[],isAdmin:false,canWrite:true,uid:null,db:null,subs:new Set(),
  emit(){this.subs.forEach(f=>f())},on(f){this.subs.add(f)},
  _k:"njuskica-demo-v1",
  _loadLocal(){try{const r=localStorage.getItem(this._k);if(r){const j=JSON.parse(r);this.settings=Object.assign(structuredClone(DEFAULT_SETTINGS),j.settings||{});this.bookings=j.bookings||[]}}catch(e){}},
  _saveLocal(){try{localStorage.setItem(this._k,JSON.stringify({settings:this.settings,bookings:this.bookings}))}catch(e){}},
  async init(){
    const c=window.claude;let db=null,user=null;
    if(c&&typeof c.use==="function"){try{[db,user]=await Promise.all([c.use("db"),c.use("user")])}catch(e){db=null}}
    if(!db){this.mode="local";this.isAdmin=true;this._loadLocal();this.emit();return}
    this.mode="live";this.db=db;
    try{this.isAdmin=user?await user.canEdit():false}catch(e){}
    try{this.uid=user?await user.id():null}catch(e){}
    try{const w=user?await user.can("data.write"):null;this.canWrite=(w!==false)&&!!this.uid}catch(e){}
    db.doc("salon/config").onSnapshot(s=>{const d=s.exists?s.data():null;
      this.settings=d?{...structuredClone(DEFAULT_SETTINGS),...JSON.parse(JSON.stringify(d))}:structuredClone(DEFAULT_SETTINGS);this.emit()},()=>{});
    db.collection("termini").where("date",">=",ymd(new Date())).onSnapshot(s=>{this.bookings=s.docs.map(d=>({id:d.id,...d.data()}));this.emit()},()=>{});
    this.emit();
  },
  async saveSettings(next){
    if(this.mode==="local"){this.settings=next;this._saveLocal();this.emit();return}
    await this.db.doc("salon/config").set(JSON.parse(JSON.stringify(next)));
  },
  async book(slot,details){
    if(this.mode==="local"){
      if(!isFree(slot.date,toMin(slot.start),slot.dur,this.bookings,this.settings)) throw new Error("taken");
      this.bookings.push({id:rid(),...slot,uid:"demo",details,created:Date.now()});this._saveLocal();this.emit();return;
    }
    if(!this.canWrite) throw new Error("nowrite");
    const got=await this.db.doc("brave/"+slot.date).acquire({holder:this.uid,ttlMs:8000});
    if(!got.acquired) throw new Error("busy");
    const day=await this.db.collection("termini").where("date","==",slot.date).get();
    if(!isFree(slot.date,toMin(slot.start),slot.dur,day.docs.map(d=>d.data()),this.settings)) throw new Error("taken");
    const id=rid();
    await this.db.doc(`zahtevi/${this.uid}/stavke/${id}`).set({...details,created:Date.now()});
    await this.db.doc("termini/"+id).set({...slot,uid:this.uid,created:Date.now()});
  },
  async details(b){
    if(this.mode==="local") return b.details||null;
    try{const s=await this.db.doc(`zahtevi/${b.uid}/stavke/${b.id}`).get();return s.exists?s.data():null}catch(e){return null}
  },
  async cancel(b){
    if(this.mode==="local"){this.bookings=this.bookings.filter(x=>x.id!==b.id);this._saveLocal();this.emit();return}
    await this.db.doc("termini/"+b.id).delete();
    try{await this.db.doc(`zahtevi/${b.uid}/stavke/${b.id}`).delete()}catch(e){}
  }
};

/* =================================================================
   4. AVAILABILITY
   ================================================================= */
function dayWindow(ds,s){
  const hrs=s.hours[String(parseYmd(ds).getDay())];if(!hrs||!hrs.on) return null;
  const bl=(s.blocks||[]).filter(b=>b.date===ds);if(bl.some(b=>b.allDay)) return null;
  return {open:toMin(hrs.open),close:toMin(hrs.close),blocks:bl.map(b=>[toMin(b.from),toMin(b.to)])};
}
const overlaps=(a1,a2,b1,b2)=>a1<b2&&b1<a2;
function isFree(ds,start,dur,bookings,s){
  const w=dayWindow(ds,s);if(!w) return false;const end=start+dur;
  if(start<w.open||end>w.close) return false;
  if(w.blocks.some(([f,t])=>overlaps(start,end,f,t))) return false;
  if(bookings.some(b=>b.date===ds&&overlaps(start,end,toMin(b.start),toMin(b.start)+b.dur))) return false;
  if(ds===ymd(new Date())){const n=new Date();if(start<n.getHours()*60+n.getMinutes()+30) return false}
  return true;
}
function freeSlots(ds,dur,s=Store.settings,b=Store.bookings){
  const w=dayWindow(ds,s);if(!w) return [];const out=[],step=s.slotStep||30;
  for(let t=w.open;t+dur<=w.close;t+=step) if(isFree(ds,t,dur,b,s)) out.push(toHM(t));
  return out;
}
function nextFree(dur=60){
  const d=new Date();
  for(let i=0;i<(Store.settings.bookAhead||28);i++){const ds=ymd(d),sl=freeSlots(ds,dur);
    if(sl.length) return (i===0?"danas":i===1?"sutra":prettyDate(ds))+" u "+sl[0];d.setDate(d.getDate()+1)}
  return "trenutno nema slobodnih";
}

/* =================================================================
   5. LANDING
   ================================================================= */
function setWord(w){$("#heroWord").innerHTML=[...w].map((c,i)=>`<span class="ch" style="animation-delay:${i*45}ms">${esc(c)}</span>`).join("")}
function wiggle(){["#heroDog"].forEach(s=>{const d=$(s);if(!d)return;d.classList.remove("wiggle");void d.offsetWidth;d.classList.add("wiggle")})}
function petDog(e){
  wiggle();if(reduced) return;
  const hero=$(".hero"),r=hero.getBoundingClientRect(),src=(e&&e.currentTarget&&e.currentTarget.offsetParent)?e.currentTarget:$("#heroDog"),b=src.getBoundingClientRect();
  for(let i=0;i<9;i++){
    const s=h(`<span class="burst" aria-hidden="true">♥</span>`);
    s.style.left=(b.left-r.left+b.width/2-10)+"px";s.style.top=(b.top-r.top+20)+"px";
    s.style.setProperty("--dx",(Math.random()*240-120)+"px");s.style.setProperty("--dy",(-120-Math.random()*160)+"px");s.style.setProperty("--r",(Math.random()*60-30)+"deg");
    s.style.fontSize=(18+Math.random()*22)+"px";hero.append(s);setTimeout(()=>s.remove(),1300);
  }
}
function heroParallax(){
  if(reduced) return;
  const hero=$(".hero"),fl=[...hero.querySelectorAll("[data-depth]")];
  let mx=0,my=0,cx=0,cy=0,raf=0;
  hero.addEventListener("pointermove",e=>{const r=hero.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5;if(!raf)raf=requestAnimationFrame(tick)});
  window.addEventListener("scroll",()=>{if(!raf)raf=requestAnimationFrame(tick)},{passive:true});
  function tick(){raf=0;cx+=(mx-cx)*.12;cy+=(my-cy)*.12;const sy=Math.min(scrollY,900);
    fl.forEach(el=>{const d=+el.dataset.depth;el.style.translate=`${-cx*d}px ${-cy*d-sy*d/90}px`});
    $("#heroWord").style.translate=`${cx*-14}px ${sy*.12}px`;
    if(Math.abs(mx-cx)>.002||Math.abs(my-cy)>.002) raf=requestAnimationFrame(tick)}
}
const ICONS={
  drop:`<svg viewBox="0 0 60 60"><path d="M30 4c11 15 18 25 18 34a18 18 0 0 1-36 0c0-9 7-19 18-34Z" fill="url(#ib)"/><ellipse cx="23" cy="36" rx="4" ry="8" fill="#fff" opacity=".7"/></svg>`,
  scissors:`<svg viewBox="0 0 60 60"><g fill="none" stroke="url(#ib)" stroke-width="5" stroke-linecap="round"><circle cx="14" cy="44" r="8"/><circle cx="14" cy="16" r="8"/><path d="M21 20l35 26M21 40l35-26"/></g></svg>`,
  bottle:`<svg viewBox="0 0 60 60"><rect x="24" y="2" width="12" height="8" rx="2" fill="#a9c0cb"/><path d="M36 6h12" stroke="#a9c0cb" stroke-width="4" stroke-linecap="round"/><rect x="14" y="12" width="32" height="46" rx="10" fill="url(#ib)"/><path d="M30 26v18M21 35h18" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  comb:`<svg viewBox="0 0 60 60"><rect x="4" y="12" width="52" height="12" rx="5" fill="url(#ib)"/><g stroke="#9fb7c3" stroke-width="3.5" stroke-linecap="round"><path d="M10 24v22M17 24v22M24 24v22M31 24v22M38 24v22M45 24v22M52 24v16"/></g></svg>`,
  heart:`<svg viewBox="0 0 60 60"><rect x="6" y="8" width="48" height="38" rx="12" fill="url(#ib)"/><path d="M18 46l-4 10 14-10" fill="#b6cbd5"/><path d="M30 38c-8-6-12-10-12-15 0-4 3-6 6-6 3 0 5 2 6 4 1-2 3-4 6-4 3 0 6 2 6 6 0 5-4 9-12 15Z" fill="#fff"/></svg>`,
  camera:`<svg viewBox="0 0 60 60"><rect x="4" y="16" width="52" height="36" rx="9" fill="url(#ib)"/><rect x="18" y="9" width="18" height="10" rx="3" fill="#a9c0cb"/><circle cx="30" cy="34" r="11" fill="#e8f0f4"/><circle cx="30" cy="34" r="6" fill="#8aa6b4"/></svg>`
};
function renderServices(){
  const blob=$("#blob");
  if(!reduced) for(let i=0;i<9;i++){const s=8+Math.random()*60;const b=h(`<span class="bubble" aria-hidden="true"></span>`);
    Object.assign(b.style,{width:s+"px",height:s+"px",left:(32+Math.random()*36)+"%",bottom:(5+Math.random()*30)+"%"});
    b.style.setProperty("--d",(7+Math.random()*7)+"s");b.style.setProperty("--dl",(-Math.random()*12)+"s");b.style.setProperty("--sx",(Math.random()*80-40)+"px");blob.append(b)}
  const spots=[["o1","drop","kupanje"],["o2","scissors","sisanje"],["o3","bottle","nokti"],["o4","heart",null],["o5","comb","linjanje"],["o6","camera",null]];
  spots.forEach(([cls,icon,svc])=>{
    const t=TREATMENTS.find(x=>x.id===svc);
    const label=t?t.short:(icon==="heart"?"Maženje":"Foto za Instagram");
    const o=h(`<button class="orbit ${cls}" aria-expanded="false" aria-label="${esc(label)}">${ICONS[icon]}<span class="lbl">${esc(label)}</span></button>`);
    o.addEventListener("click",()=>{ if(t&&!matchMedia("(min-width:761px)").matches) openBooking({svc:t.id}); else showPop(o,t,label)});
    o.addEventListener("mouseenter",()=>{if(matchMedia("(hover:hover)").matches)showPop(o,t,label)});
    blob.append(o);
  });
  blob.addEventListener("mouseleave",hidePop);
  const list=$("#svcList");
  list.innerHTML=TREATMENTS.map(t=>`<div class="svc-item reveal"><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p>
    <span class="price">od ${fmtRSD(t.price[0][0])} RSD · ${fmtDur(t.dur[0])}+</span>
    <button class="sketch" data-svc-book="${t.id}">${SKETCH}Zakaži <span class="arr">→</span></button><span class="go" aria-hidden="true">→</span></div>`).join("");
  list.querySelectorAll(".svc-item").forEach(card=>card.onclick=()=>openBooking({svc:card.querySelector("[data-svc-book]").dataset.svcBook}));
}
function hidePop(){document.querySelectorAll(".svc-pop").forEach(p=>p.remove());document.querySelectorAll(".orbit").forEach(o=>o.setAttribute("aria-expanded","false"))}
function showPop(o,t,label){
  hidePop();o.setAttribute("aria-expanded","true");
  const blob=$("#blob"),br=blob.getBoundingClientRect(),or=o.getBoundingClientRect();
  const right=or.left-br.left>br.width/2;
  const p=h(`<div class="svc-pop">${t?`<h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p>
    <div class="meta"><span>od ${fmtRSD(t.price[0][0])} RSD</span><span>${fmtDur(t.dur[0])}+</span></div>
    <button class="btn mini" data-pop-book>Zakaži →</button>`
    :`<h3>${esc(label)}</h3><p>${label==="Maženje"?"Uz svaki tretman ide i maza. Bez doplate, koliko god treba.":"Posle tretmana slikamo ljubimca za naš Instagram, ako se slažete."}</p>`}</div>`);
  p.style.top=Math.max(12,Math.min(or.top-br.top-10,br.height-230))+"px";
  if(right) p.style.right=(br.right-or.left+14)+"px"; else p.style.left=(or.right-br.left+14)+"px";
  blob.append(p);
  const bb=p.querySelector("[data-pop-book]");if(bb) bb.onclick=()=>openBooking({svc:t.id});
}
function renderHours(){
  const s=Store.settings,ul=$("#hoursList"),today=new Date().getDay();ul.innerHTML="";
  [1,2,3,4,5,6,0].forEach(i=>{const x=s.hours[String(i)];
    ul.append(h(`<li class="${i===today?"today":""}"><span class="d">${DAYS[i]}</span>${x&&x.on?`<span class="t">${x.open} – ${x.close}</span>`:`<span class="t off">Neradni dan</span>`}</li>`))});
  const now=new Date(),w=dayWindow(ymd(now),s),m=now.getHours()*60+now.getMinutes();
  const open=w&&m>=w.open&&m<w.close&&!w.blocks.some(([f,t])=>m>=f&&m<t);
  const st=$("#nowStatus");st.classList.toggle("open",!!open);st.lastElementChild.textContent=open?`Sada radimo, do ${toHM(w.close)}`:"Sada je zatvoreno";
  const nf=nextFree(60);$("#nextFree").textContent=nf;document.querySelectorAll("[data-next-free]").forEach(el=>el.textContent=nf);
  $("#modePill").textContent=Store.mode==="live"?"termini uživo":Store.mode==="local"?"demo režim":"učitavam";
}
/* keep Tab inside an open dialog */
function trapFocus(dlg){
  dlg.addEventListener("keydown",e=>{if(e.key!=="Tab")return;
    const f=[...dlg.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);
    if(!f.length)return;const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&(document.activeElement===a||!dlg.contains(document.activeElement))){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
}
function openMenu(){
  const m=h(`<div class="menu" role="dialog" aria-modal="true" aria-label="Meni">
    <button class="close" data-mclose>ZATVORI ✕</button>
    <a href="#o-nama" data-mclose>O nama</a><a href="#usluge" data-mclose>Usluge</a><a href="#radno-vreme" data-mclose>Radno vreme</a>
    <button class="l" data-mbook>Zakaži</button>
    ${myLoad()?`<button class="l owner" data-mmy>Moj termin</button>`:""}
    <div class="social">
      <a class="ig" data-social="instagram" href="#" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
      <a class="tt" data-social="tiktok" href="#" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.4 2.4 1.9 4 4.5 4.2v3.3c-1.7 0-3.2-.5-4.5-1.4v6.4A5.9 5.9 0 1 1 10.6 9.7v3.4a2.6 2.6 0 1 0 2.6 2.6V3h3.3Z"/></svg></a>
    </div>
  </div>`);
  fillSocial(m);document.body.append(m);document.body.style.overflow="hidden";trapFocus(m);
  const close=()=>{m.remove();document.body.style.overflow=""};
  m.querySelectorAll("[data-mclose]").forEach(a=>a.addEventListener("click",close));
  m.querySelector("[data-mbook]").onclick=()=>{close();openBooking()};
  const mm=m.querySelector("[data-mmy]");if(mm)mm.onclick=()=>{close();openReceipt(myLoad())};
  m.querySelector(".close").focus();
}

/* =================================================================
   5b. MY BOOKING (client keeps the receipt) + OWNER MESSAGE
   ================================================================= */
const MY_KEY="njuskica-moj-termin";
function myLoad(){try{const b=JSON.parse(localStorage.getItem(MY_KEY)||"null");if(b&&b.date>=ymd(new Date()))return b}catch(e){}return null}
function mySave(b){try{localStorage.setItem(MY_KEY,JSON.stringify(b))}catch(e){}}
function renderMyBooking(){
  const el=$("#myBooking");if(!el)return;const b=myLoad();if(!b){el.hidden=true;return}
  const t=TREATMENTS.find(x=>x.id===b.svc);el.hidden=false;
  el.innerHTML=`<div class="mybook"><b>Vaš termin</b><span>${prettyDate(b.date)} u ${b.time} · ${esc(t?t.short:"")} · ${esc(b.dog)}</span><button class="btn mini" data-my>Potvrda</button></div>`;
  el.querySelector("[data-my]").onclick=()=>openReceipt(b);
}
function openReceipt(b){if(!b)return;hidePop();opener=document.activeElement;B={...b,step:3,note:"",err:"",done:true,busy:false};renderBooking()}
function receiptText(c){return `Njuškica – potvrda termina\n${c.t.name} · ${c.size.name}\n${prettyDate(B.date)} u ${B.time} (oko ${fmtDur(c.dur)})\nOkvirna cena: ${fmtRSD(c.price[0])}–${fmtRSD(c.price[1])} RSD\nPas: ${B.dog} · Vlasnik: ${B.owner}\nOtkazivanje: porukom na Instagramu.`}
function downloadFile(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function downloadICS(c){
  const d=parseYmd(B.date),[hh,mm]=B.time.split(":").map(Number);const s=new Date(d.getFullYear(),d.getMonth(),d.getDate(),hh,mm),e=new Date(s.getTime()+c.dur*60000);
  const f=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,"0")+String(x.getDate()).padStart(2,"0")+"T"+String(x.getHours()).padStart(2,"0")+String(x.getMinutes()).padStart(2,"0")+"00";
  downloadFile("njuskica-termin.ics",["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Njuskica//SR","BEGIN:VEVENT","UID:"+rid()+"@njuskica","DTSTAMP:"+f(new Date()),"DTSTART:"+f(s),"DTEND:"+f(e),
    "SUMMARY:Njuškica – "+c.t.name+" ("+B.dog+")","DESCRIPTION:"+receiptText(c).replace(/\n/g,"\\n"),"END:VEVENT","END:VCALENDAR"].join("\r\n"),"text/calendar");
  toast("Termin je dodat u kalendar.");
}
async function shareReceipt(c){
  const text=receiptText(c);
  if(navigator.share){try{await navigator.share({title:"Njuškica – potvrda termina",text});return}catch(e){if(e&&e.name==="AbortError")return}}
  downloadFile("njuskica-potvrda.txt",text,"text/plain");toast("Potvrda je sačuvana.");
}
// Poruka koju vlasnik šalje klijentu (Kopiraj poruku / SMS u panelu). TODO: dodajte adresu salona u tekst.
function smsNum(p){let n=String(p||"").replace(/[^\d+]/g,"");if(n.startsWith("0"))n="+381"+n.slice(1);return n}
function ownerMsg(b,d){
  const t=TREATMENTS.find(x=>x.id===b.svc),s=SIZES.find(x=>x.id===b.size),si=SIZES.findIndex(x=>x.id===b.size),pr=t&&si>=0?t.price[si]:null;
  return `Zdravo ${d.owner}! Potvrđujemo termin u salonu Njuškica za ${d.dog}: ${prettyDate(b.date)} u ${b.start}, ${t?t.name:b.svc} (${s?s.name.toLowerCase():b.size}), trajanje oko ${fmtDur(b.dur)}${pr?`, okvirna cena ${fmtRSD(pr[0])}–${fmtRSD(pr[1])} RSD`:""}. Ako ne možete da dođete, javite nam bar dan ranije. Vidimo se!`;
}

/* =================================================================
   6. BOOKING WIZARD
   ================================================================= */
let B=null;
let opener=null;
function openBooking(pre={}){hidePop();opener=document.activeElement;B={step:0,size:null,svc:pre.svc||null,date:null,time:null,owner:"",phone:"",dog:"",note:"",err:"",done:false,busy:false};renderBooking()}
const ADMIN_PAGE=document.body.classList.contains("admin-page");
function closeModal(){$("#modalRoot").innerHTML="";B=null;A=null;document.body.style.overflow="";if(opener&&opener.focus&&document.contains(opener))opener.focus({preventScroll:true});opener=null;if(ADMIN_PAGE)ownerLogout()}
function calcB(){if(!B.size||!B.svc)return null;const si=SIZES.findIndex(s=>s.id===B.size),t=TREATMENTS.find(t=>t.id===B.svc);return{price:t.price[si],dur:t.dur[si],t,size:SIZES[si]}}
function renderBooking(){
  const root=$("#modalRoot");document.body.style.overflow="hidden";const c=calcB();
  let body="";
  if(B.done){
    body=`<div class="done"><img src="${IMG.trci}" alt=""><div class="big">Vidimo se, ${esc(B.dog)}!</div>
      <p style="color:var(--mute);max-width:40ch;margin:0 auto">Zvaćemo vas na ${esc(B.phone)} da potvrdimo termin i pošaljemo adresu.</p>
      <div class="receipt"><div><span>Tretman</span><span>${esc(c.t.name)}</span></div><div><span>Veličina</span><span>${esc(c.size.name)}</span></div>
      <div><span>Termin</span><span>${prettyDate(B.date)} u ${B.time}</span></div><div><span>Trajanje</span><span>oko ${fmtDur(c.dur)}</span></div>
      <div><span>Okvirna cena</span><span>${fmtRSD(c.price[0])}–${fmtRSD(c.price[1])} RSD</span></div></div>
      <div class="acts"><button class="btn ghost mini" data-ics>Dodaj u kalendar</button><button class="btn ghost mini" data-share>${navigator.share?"Podeli potvrdu":"Sačuvaj potvrdu"}</button></div>
      <p class="hint" style="text-align:center">Potvrda ostaje na sajtu: u meniju pod „Moj termin".</p></div>`;
  } else if(B.step===0){
    body=`<div class="opts three">${SIZES.map(s=>`<button class="opt" data-size="${s.id}" aria-pressed="${B.size===s.id}">
      <span class="sz"><img src="${IMG.sedi}" alt="" style="--h:${s.h}"></span><span class="tx"><span class="n">${s.name}</span><span class="d">${s.desc}</span></span></button>`).join("")}</div>`;
  } else if(B.step===1){
    const si=SIZES.findIndex(s=>s.id===B.size);
    body=`<div class="opts two">${TREATMENTS.map(t=>`<button class="opt" data-svc="${t.id}" aria-pressed="${B.svc===t.id}">
      <span class="n">${t.name}</span><span class="m">${fmtRSD(t.price[si][0])}–${fmtRSD(t.price[si][1])} RSD · oko ${fmtDur(t.dur[si])}</span></button>`).join("")}</div>`;
  } else if(B.step===2){
    const days=[],d=new Date();
    for(let i=0;i<(Store.settings.bookAhead||28);i++){const ds=ymd(d);days.push({ds,d:new Date(d),n:freeSlots(ds,c.dur).length});d.setDate(d.getDate()+1)}
    if(!B.date||!days.find(x=>x.ds===B.date&&x.n)){const f=days.find(x=>x.n);B.date=f?f.ds:null}
    const slots=B.date?freeSlots(B.date,c.dur):[];if(B.time&&!slots.includes(B.time)) B.time=null;
    body=`<div class="days" role="group" aria-label="Izbor datuma">${days.map(x=>`<button class="day" data-date="${x.ds}" ${x.n?"":"disabled"} aria-pressed="${B.date===x.ds}">
      <span class="w">${DAYS_SHORT[x.d.getDay()]}</span><span class="n">${x.d.getDate()}</span><span class="mo">${MONTHS[x.d.getMonth()]}</span></button>`).join("")}</div>
      ${B.date?`<p class="steplbl" style="margin-top:20px">${prettyDate(B.date)}</p>`:""}
      ${slots.length?`<div class="slots">${slots.map(t=>`<button class="slot" data-time="${t}" aria-pressed="${B.time===t}">${t}</button>`).join("")}</div>`
        :`<div class="empty" style="margin-top:16px">Nema slobodnih termina. Pišite nam na Instagram.</div>`}`;
  } else {
    body=`<form id="bf" class="grid2" novalidate>
      <div class="field"><label for="f-owner">Ime vlasnika</label><input id="f-owner" autocomplete="name" value="${esc(B.owner)}"></div>
      <div class="field"><label for="f-phone">Telefon</label><input id="f-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="06x xxx xxxx" value="${esc(B.phone)}"></div>
      <div class="field"><label for="f-dog">Ime psa</label><input id="f-dog" value="${esc(B.dog)}"></div>
      <div class="field" style="grid-column:1/-1"><label for="f-note">Napomena (nije obavezno)</label><textarea id="f-note">${esc(B.note)}</textarea></div>
    </form>`;
  }
  const can=[!!B.size,!!B.svc,!!(B.date&&B.time),true][B.step];
  const prev=root.querySelector(".modal"),keep=prev&&prev.dataset.step===String(B.step)+B.done,scroll=keep?prev.scrollTop:0,fk=focusKey();
  root.innerHTML="";
  const ov=h(`<div class="overlay" role="dialog" aria-modal="true" aria-label="Zakazivanje tretmana"><div class="modal" data-step="${B.step}${B.done}">
    <header><h3>${B.done?"Zakazano!":"Zakaži tretman"}</h3><button class="x" data-close aria-label="Zatvori">✕</button></header>
    <div class="body">
      ${B.done?"":`<div class="steps">${[0,1,2,3].map(i=>`<span class="s ${i<=B.step?"on":""}"></span>`).join("")}</div>
      <div class="qtitle" tabindex="-1">${["Koliki je vaš pas?","Šta mu treba?","Kada vam odgovara?","Vaši podaci"][B.step]}</div>`}
      ${body}${B.err?`<p class="err" role="alert">${esc(B.err)}</p>`:""}
    </div>
    ${B.done?`<footer class="mf"><span class="summary">Otkazivanje: porukom na Instagramu.</span><button class="btn" data-close>Zatvori</button></footer>`
      :(B.step===0&&!c)?"":`<footer class="mf">
      <div class="summary">${c?`<span>${esc(c.t.short)} · ${esc(c.size.name)}${B.time?` · ${prettyDate(B.date)} u ${B.time}`:""}</span><b>${fmtRSD(c.price[0])}–${fmtRSD(c.price[1])} RSD · oko ${fmtDur(c.dur)}</b>`:""}</div>
      <div style="display:flex;gap:8px">${B.step>0?`<button class="btn ghost" data-back>Nazad</button>`:""}
      ${B.step>=2?`<button class="btn" data-next ${can&&!B.busy?"":"disabled"}>${B.step===3?(B.busy?"Šaljem…":"Potvrdi"):"Dalje →"}</button>`:""}</div>
    </footer>`}</div></div>`);
  root.append(ov);trapFocus(ov);
  ov.addEventListener("click",e=>{if(e.target===ov)closeModal()});
  ov.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeModal);
  const ics=ov.querySelector("[data-ics]");if(ics)ics.onclick=()=>downloadICS(c);
  const sh=ov.querySelector("[data-share]");if(sh)sh.onclick=()=>shareReceipt(c);
  ov.querySelectorAll("[data-size]").forEach(b=>b.onclick=()=>{B.size=b.dataset.size;B.err="";B.step=B.svc?2:1;B.date=null;B.time=null;renderBooking()});
  ov.querySelectorAll(".opt[data-svc]").forEach(b=>b.onclick=()=>{B.svc=b.dataset.svc;B.step=2;B.date=null;B.time=null;renderBooking()});
  ov.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>{B.date=b.dataset.date;B.time=null;renderBooking()});
  ov.querySelectorAll("[data-time]").forEach(b=>b.onclick=()=>{B.time=b.dataset.time;renderBooking()});
  const back=ov.querySelector("[data-back]");if(back) back.onclick=()=>{B.err="";B.step--;renderBooking()};
  const next=ov.querySelector("[data-next]");if(next) next.onclick=submitStep;
  const f=$("#bf");if(f){["owner","phone","dog","note"].forEach(k=>$("#f-"+k).addEventListener("input",e=>B[k]=e.target.value));f.addEventListener("submit",e=>{e.preventDefault();submitStep()})}
  const m=ov.querySelector(".modal");m.scrollTop=scroll;
  const sel=ov.querySelector('.day[aria-pressed="true"]');if(sel){const d=sel.parentElement;d.scrollLeft=sel.offsetLeft-d.offsetLeft-8}
  restoreFocus(ov,fk,keep);
}
function focusKey(){const a=document.activeElement;if(!a||!a.closest||!a.closest("#modalRoot"))return null;
  for(const k of ["size","svc","date","time","tab","tog"]) if(a.dataset&&a.dataset[k]!==undefined) return `[data-${k}="${a.dataset[k]}"]`;
  for(const k of ["data-next","data-back","data-save","data-close"]) if(a.hasAttribute(k)) return `[${k}]`;
  return a.id?"#"+a.id:null}
function restoreFocus(ov,fk,keep){
  const t=(keep&&fk&&ov.querySelector(fk))||(!keep&&(ov.querySelector(".qtitle")||ov.querySelector(".big")))||ov.querySelector(".x");
  if(t){if(t.classList.contains("big"))t.tabIndex=-1;t.focus({preventScroll:true})}}
async function submitStep(){
  if(B.step<3){B.step++;B.err="";renderBooking();return}
  B.owner=B.owner.trim();B.phone=B.phone.trim();B.dog=B.dog.trim();
  if(!B.owner||!B.dog){B.err="Upišite ime vlasnika i ime psa.";return renderBooking()}
  if(B.phone.replace(/\D/g,"").length<8){B.err="Upišite broj telefona, na primer 064 123 4567.";return renderBooking()}
  const c=calcB();B.busy=true;B.err="";renderBooking();
  try{await Store.book({date:B.date,start:B.time,dur:c.dur,svc:B.svc,size:B.size},{owner:B.owner,phone:B.phone,dog:B.dog,note:B.note.trim()});B.done=true;
    mySave({size:B.size,svc:B.svc,date:B.date,time:B.time,owner:B.owner,phone:B.phone,dog:B.dog});renderMyBooking()}
  catch(e){const m=String(e&&e.message||"");
    B.err=m==="taken"?"Ovaj termin je upravo zauzet. Izaberite drugo vreme.":m==="busy"?"Neko upravo zakazuje isti dan. Pokušajte ponovo za par sekundi.":
      (m==="nowrite"||(e&&e.code==="invalid_argument"))?"Sa ovim nalogom ne možete da zakažete termin. Pišite nam na Instagram @salon_za_sisanje_pasanjuskica.":"Termin nije sačuvan zbog greške u vezi. Pokušajte ponovo.";
    if(m==="taken"){B.step=2;B.time=null}}
  if(B){B.busy=false;renderBooking()}
}

/* =================================================================
   7. ADMIN PANEL
   ================================================================= */
let A=null;
function openAdmin(){
  if(Store.mode==="live"&&!Store.isAdmin){toast("Panel je dostupan samo vlasniku salona.");return}
  opener=document.activeElement;A={tab:"termini",draft:structuredClone(Store.settings),dirty:false,blk:{date:ymd(new Date()),allDay:true,from:"12:00",to:"13:00",note:""},details:{},confirm:null};
  renderAdmin();
}
function timeOpts(cur){const v=new Set();for(let m=5*60;m<=23*60;m+=30)v.add(toHM(m));v.add(cur);return [...v].sort().map(t=>`<option ${t===cur?"selected":""}>${t}</option>`).join("")}
function renderAdmin(){
  if(!A) return;const root=$("#modalRoot");if(!ADMIN_PAGE)document.body.style.overflow="hidden";let body="";
  if(A.tab==="vreme"){
    body=`<p class="ahint">Kalendar za klijente se menja čim sačuvate.</p>
    ${[1,2,3,4,5,6,0].map(i=>{const x=A.draft.hours[String(i)];return `<div class="hrow"><span class="dn">${DAYS[i]}</span>
      <button class="switch" role="switch" aria-checked="${x.on}" aria-label="${DAYS[i]} radni dan" data-tog="${i}"></button>
      <div class="field"><label for="o${i}">Od</label><select id="o${i}" data-o="${i}" ${x.on?"":"disabled"}>${timeOpts(x.open)}</select></div>
      <div class="field"><label for="c${i}">Do</label><select id="c${i}" data-c="${i}" ${x.on?"":"disabled"}>${timeOpts(x.close)}</select></div></div>`}).join("")}
    <div class="grid2" style="margin-top:18px">
      <div class="field"><label for="a-step">Razmak između termina</label><select id="a-step">${[15,30,60].map(v=>`<option value="${v}" ${A.draft.slotStep==v?"selected":""}>${v} min</option>`).join("")}</select></div>
      <div class="field"><label for="a-ahead">Zakazivanje unapred</label><select id="a-ahead">${[14,21,28,42,60].map(v=>`<option value="${v}" ${A.draft.bookAhead==v?"selected":""}>${v} dana</option>`).join("")}</select></div></div>`;
  } else if(A.tab==="blokade"){
    const bl=[...(A.draft.blocks||[])].filter(b=>b.date>=ymd(new Date())).sort((a,b)=>(a.date+a.from).localeCompare(b.date+b.from));
    body=`<div class="grid2">
      <div class="field"><label for="b-date">Datum</label><input id="b-date" type="date" value="${A.blk.date}" min="${ymd(new Date())}"></div>
      <div class="field"><label for="b-type">Šta blokirate</label><select id="b-type"><option value="1" ${A.blk.allDay?"selected":""}>Ceo dan (slobodan dan)</option><option value="0" ${A.blk.allDay?"":"selected"}>Deo dana (pauza)</option></select></div>
      ${A.blk.allDay?"":`<div class="field"><label for="b-from">Od</label><input id="b-from" type="time" step="900" value="${A.blk.from}"></div><div class="field"><label for="b-to">Do</label><input id="b-to" type="time" step="900" value="${A.blk.to}"></div>`}
      <div class="field" style="grid-column:1/-1"><label for="b-note">Napomena</label><input id="b-note" placeholder="npr. pauza za ručak, godišnji odmor" value="${esc(A.blk.note)}"></div></div>
    <button class="btn ghost" id="addBlk" style="margin-top:14px">Dodaj blokadu</button>
    ${bl.length?`<ul class="blist">${bl.map(b=>`<li><span><b>${prettyDate(b.date)} · ${b.allDay?"ceo dan":b.from+"–"+b.to}</b>${b.note?` <span style="color:var(--mute)">· ${esc(b.note)}</span>`:""}</span>
      <button class="btn ghost mini danger" data-rmblk="${b.id}">Ukloni</button></li>`).join("")}</ul>`:`<div class="empty" style="margin-top:16px">Nema blokiranih dana ni pauza.</div>`}`;
  } else {
    const list=[...Store.bookings].sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    body=list.length?`<ul class="alist">${list.map(b=>{const t=TREATMENTS.find(x=>x.id===b.svc),s=SIZES.find(x=>x.id===b.size),d=A.details[b.id];
      const who=d===undefined?`<span style="color:var(--mute)">učitavam…</span>`:d?`${esc(d.dog)} · ${esc(d.owner)}<small>${esc(d.phone)}${d.note?" · "+esc(d.note):""}</small>`:`<span style="color:var(--mute)">podaci nisu dostupni</span>`;
      return `<li><span class="when">${prettyDate(b.date)} · ${b.start}–${toHM(toMin(b.start)+b.dur)}</span><span class="who">${who}</span>
        <span class="tagp">${esc(t?t.short:b.svc)} · ${esc(s?s.name:b.size)}</span>
        ${A.confirm===b.id?`<span class="acts confirm">Otkazati?<button class="btn mini ghost danger" data-cancel-yes="${b.id}">Da, otkaži</button><button class="btn mini ghost" data-cancel-no>Ne</button></span>`
          :`<span class="acts">${d?`<button class="btn ghost mini" data-msg="${b.id}">Kopiraj poruku</button><a class="btn ghost mini" href="sms:${smsNum(d.phone)}?&body=${encodeURIComponent(ownerMsg(b,d))}">SMS</a>`:""}<button class="btn ghost mini danger" data-cancel="${b.id}">Otkaži</button></span>`}</li>`}).join("")}</ul>`
      :`<div class="empty">Još nema zakazanih termina. Novi termini se pojavljuju ovde čim ih klijent potvrdi.</div>`;
    list.forEach(b=>{if(!(b.id in A.details)){A.details[b.id]=undefined;Store.details(b).then(d=>{if(A){A.details[b.id]=d;renderAdmin()}})}});
  }
  const scroll=root.querySelector(".modal")?.scrollTop||0,fk=focusKey(),first=!root.firstChild;root.innerHTML="";
  const ov=h(`<div class="overlay" role="dialog" aria-modal="true" aria-label="Panel za vlasnika"><div class="modal wide">
    <header><h3>Panel za vlasnika</h3>${ADMIN_PAGE?`<button class="btn mini light" data-close>Odjavi se</button>`:`<button class="x" data-close aria-label="Zatvori">✕</button>`}</header>
    <div class="body">
      <p class="ahint">${Store.mode==="live"?"Promene se čuvaju za sve posetioce.":"Demo: podaci su samo u ovom pregledaču."}</p>
      <div class="tabs" role="tablist">${[["termini",`Termini (${Store.bookings.length})`],["vreme","Radno vreme"],["blokade","Pauze"]].map(([k,l])=>`<button class="tab" role="tab" aria-selected="${A.tab===k}" data-tab="${k}">${l}</button>`).join("")}</div>
      ${body}</div>
    ${A.tab==="termini"?"":`<footer class="mf"><span class="summary">${A.dirty?"Imate nesačuvane promene.":"Sve je sačuvano."}</span>
      <div style="display:flex;gap:8px">${A.dirty?`<button class="btn ghost" data-reset>Poništi</button>`:""}<button class="btn" data-save ${A.dirty?"":"disabled"}>Sačuvaj</button></div></footer>`}
    </div></div>`);
  root.append(ov);trapFocus(ov);ov.querySelector(".modal").scrollTop=scroll;
  {const t=(fk&&ov.querySelector(fk))||(first&&ov.querySelector(".x"));if(t)t.focus({preventScroll:true})}
  if(!ADMIN_PAGE)ov.addEventListener("click",e=>{if(e.target===ov)closeModal()});
  ov.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeModal);
  ov.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{A.tab=b.dataset.tab;renderAdmin()});
  const dirty=()=>{A.dirty=true;renderAdmin()};
  ov.querySelectorAll("[data-tog]").forEach(b=>b.onclick=()=>{const x=A.draft.hours[b.dataset.tog];x.on=!x.on;dirty()});
  ov.querySelectorAll("[data-o]").forEach(i=>i.onchange=()=>{A.draft.hours[i.dataset.o].open=i.value;dirty()});
  ov.querySelectorAll("[data-c]").forEach(i=>i.onchange=()=>{A.draft.hours[i.dataset.c].close=i.value;dirty()});
  const st=$("#a-step");if(st) st.onchange=()=>{A.draft.slotStep=+st.value;dirty()};
  const ah=$("#a-ahead");if(ah) ah.onchange=()=>{A.draft.bookAhead=+ah.value;dirty()};
  [["b-date","date"],["b-from","from"],["b-to","to"],["b-note","note"]].forEach(([id,k])=>{const i=$("#"+id);if(i)i.oninput=()=>A.blk[k]=i.value});
  const bt=$("#b-type");if(bt) bt.onchange=()=>{A.blk.allDay=bt.value==="1";renderAdmin()};
  const ab=$("#addBlk");if(ab) ab.onclick=()=>{
    if(!A.blk.date){toast("Izaberite datum.");return}
    if(!A.blk.allDay&&toMin(A.blk.to)<=toMin(A.blk.from)){toast("Kraj pauze mora biti posle početka.");return}
    A.draft.blocks=[...(A.draft.blocks||[]),{id:rid(),...A.blk}];A.blk.note="";dirty()};
  ov.querySelectorAll("[data-rmblk]").forEach(b=>b.onclick=()=>{A.draft.blocks=A.draft.blocks.filter(x=>x.id!==b.dataset.rmblk);dirty()});
  ov.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=()=>{A.confirm=b.dataset.cancel;renderAdmin()});
  ov.querySelectorAll("[data-cancel-no]").forEach(b=>b.onclick=()=>{A.confirm=null;renderAdmin()});
  ov.querySelectorAll("[data-msg]").forEach(x=>x.onclick=async()=>{const bk=Store.bookings.find(y=>y.id===x.dataset.msg),d=A.details[bk.id];const m=ownerMsg(bk,d);
    try{await navigator.clipboard.writeText(m);toast("Poruka je kopirana.")}catch(e){prompt("Kopirajte poruku:",m)}});
  ov.querySelectorAll("[data-cancel-yes]").forEach(b=>b.onclick=async()=>{const bk=Store.bookings.find(x=>x.id===b.dataset.cancelYes);A.confirm=null;
    try{await Store.cancel(bk);toast("Termin je otkazan.")}catch(e){toast("Otkazivanje nije uspelo. Pokušajte ponovo.")}renderAdmin()});
  const rs=ov.querySelector("[data-reset]");if(rs) rs.onclick=()=>{A.draft=structuredClone(Store.settings);A.dirty=false;renderAdmin()};
  const sv=ov.querySelector("[data-save]");if(sv) sv.onclick=async()=>{
    for(const [k,x] of Object.entries(A.draft.hours)) if(x.on&&toMin(x.close)<=toMin(x.open)){toast(`${DAYS[k]}: kraj radnog vremena mora biti posle početka.`);return}
    sv.disabled=true;
    try{await Store.saveSettings(structuredClone(A.draft));A.dirty=false;toast("Sačuvano. Kalendar je ažuriran.")}catch(e){toast("Čuvanje nije uspelo. Proverite da li imate prava urednika.")}
    renderAdmin()};
}

/* =================================================================
   8. BOOT
   ================================================================= */
function reveals(){
  if(reduced||!("IntersectionObserver" in window)) return;
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.remove("pre");io.unobserve(e.target)}}),{rootMargin:"0px 0px -6% 0px"});
  document.querySelectorAll(".reveal").forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add("pre");io.observe(el)}});
}
/* =================================================================
   9. OWNER PAGE (admin.html) — PIN gate
   The PIN is never stored: only its SHA-256 hash is compared.
   To change the PIN, replace the hash below with sha256 of the new PIN.
   ================================================================= */
const OWNER_PIN_HASH="7451c3c994e9ee0aefd08ae8a70b5067ee50e5ecdf0636ccbb8a8366ae49fc94";
const OWNER_KEY="njuskica-owner",OWNER_LOCK="njuskica-owner-lock";
async function sha256(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function ownerLogout(){try{sessionStorage.removeItem(OWNER_KEY)}catch(e){}renderGate()}
function renderGate(msg){
  const g=$("#gate");$("#modalRoot").innerHTML="";A=null;g.hidden=false;
  let lock=null;try{lock=JSON.parse(localStorage.getItem(OWNER_LOCK)||"null")}catch(e){}
  const until=lock&&lock.until>Date.now()?lock.until:0;
  g.innerHTML=`<form class="gate" id="gateForm" novalidate>
    <h1 class="display">Za vlasnika</h1>
    <p>Ovde se podešava radno vreme, pauze i slobodni dani, i vide se zakazani termini.</p>
    <div class="field"><label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" autocomplete="current-password" enterkeyhint="go" ${until?"disabled":""} autofocus></div>
    ${msg?`<p class="err" role="alert">${esc(msg)}</p>`:""}
    ${until?`<p class="err" role="alert">Previše pogrešnih pokušaja. Pokušajte ponovo za ${Math.ceil((until-Date.now())/1000)} s.</p>`:""}
    <button class="btn" type="submit" ${until?"disabled":""}>Uđi →</button>
    <p class="hint"><a href="index.html">← Nazad na sajt</a></p>
  </form>`;
  if(until) setTimeout(()=>renderGate(),until-Date.now()+50);
  $("#gateForm").onsubmit=async e=>{e.preventDefault();const v=$("#pin").value.trim();if(!v)return;
    let ok=false;try{ok=(await sha256(v))===OWNER_PIN_HASH}catch(err){renderGate("Pregledač ne podržava proveru PIN-a. Otvorite sajt preko https adrese.");return}
    if(ok){try{sessionStorage.setItem(OWNER_KEY,OWNER_PIN_HASH);localStorage.removeItem(OWNER_LOCK)}catch(err){}ownerEnter();return}
    const n=(lock&&lock.until>Date.now()-600000?lock.n:0)+1;
    try{localStorage.setItem(OWNER_LOCK,JSON.stringify({n,until:n>=5?Date.now()+60000:0}))}catch(err){}
    renderGate("Pogrešan PIN.")};
  $("#pin")?.focus();
}
function ownerEnter(){$("#gate").hidden=true;openAdmin()}
function adminPage(){
  let ok=false;try{ok=sessionStorage.getItem(OWNER_KEY)===OWNER_PIN_HASH}catch(e){}
  if(ok) ownerEnter(); else renderGate();
}

/* =================================================================
   10. BOOT
   ================================================================= */
function boot(){
  const yr=$("#yr");if(yr)yr.textContent=new Date().getFullYear();
  document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const m=$(".menu");if(m){m.remove();document.body.style.overflow="";return}if($("#modalRoot").firstChild&&!ADMIN_PAGE)closeModal()});
  if(ADMIN_PAGE){
    Store.on(()=>{if(A)renderAdmin()});
    Store.init().then(adminPage);
    return;
  }
  setWord("zaslužuje");renderServices();renderHours();heroParallax();reveals();
  document.addEventListener("click",e=>{const b=e.target.closest("[data-book]");if(b){e.preventDefault();openBooking()}});
  $("#menuBtn").onclick=openMenu;
  $("#petMe").onclick=petDog;$("#heroDog").onclick=petDog;fillSocial();renderMyBooking();
  Store.on(()=>{renderHours();if(B&&!B.done&&!B.busy&&B.step===2)renderBooking()});
  Store.init();
  setInterval(renderHours,60000);
  const fab=$("#fab");
  if("IntersectionObserver" in window) new IntersectionObserver(([e])=>{const on=!e.isIntersecting;fab.classList.toggle("show",on);fab.setAttribute("aria-hidden",String(!on));fab.tabIndex=on?0:-1}).observe($(".hero"));
}
boot();
