/* YF - Work page grid + nav filter  ·  v1.1.0
 * ---------------------------------------------------------------------------
 * Drives #work-grid on yfkk.co/work: the bento layout, the progressive reveal
 * and the search / Solution / Year filter that sits in the nav bar.
 *
 * SELF-CONTAINED as of v1.1.0. This one file carries its own CSS and its own
 * markup and installs them at runtime, so the Work page needs no custom code
 * at all - it is attached as a registered hosted script and nothing else.
 * That is not a style preference: Webflow's Data API returns HTTP 406 for any
 * write to page freeform code on this site, so page code cannot be authored
 * programmatically. Registered scripts are the one writable path.
 *
 * It also means install and rollback are single operations:
 *   install  - register the script, attach it to the Work page
 *   rollback - remove_page_script, and switch .SolutionNav visibility back on
 * The page Head/Footer code and the Z Nav Bar component are never touched.
 *
 * WHAT IT EXPECTS FROM THE PAGE
 *   #work-grid                        the Projects Collection List wrapper
 *   .projecttitle                     project name, per card (searched)
 *   .yfwrk-cardsols .w-dyn-item       nested Solutions items; text = the name
 *   [data-year-src]                   OPTIONAL per-card element whose text is
 *                                     the year. Without it the Year column
 *                                     hides itself and everything else works.
 *   .zmenu / .znavmenublock           the nav row the search field moves into
 *
 * Facets are derived from rendered text because the Data API rejects attribute
 * value bindings outright. lowercase(solution name) === its slug for all seven
 * solutions, so the solution match is exact rather than the prefix guess the
 * previous inline script used.
 *
 * Rationale for the non-obvious parts: Notion > Claude Knowledge Base >
 * Decisions & Learnings (2026-08-03 empty-cell fix, 2026-08-31 rewrite,
 * 2026-09-01 self-contained v1.1.0).
 * ------------------------------------------------------------------------- */

/* ---- v1.1.0 self-install: CSS, markup, nav placement, facet derivation ----
   Runs before init(). Everything it creates is marked data-yf-injected so a
   future version can find and replace it. */
(function(){
  if(document.getElementById('yfwrk-css'))return;
  if(!document.getElementById('work-grid'))return;   /* Work page only */

  var css=document.createElement('style');
  css.id='yfwrk-css';
  css.textContent=`/* hidden per-card Year source (see YEAR STEP above) */
#work-grid [data-year-src]{display:none !important}
/* Year column hides itself until a year source exists */
.yfwrk-pcol:has([data-col="year"]:empty){display:none}

/* search field - moved into the nav by the script below */
.yfwrk-search{
  display:none; flex:1 1 auto; max-width:26rem; align-items:center; gap:.5rem;
  border-bottom:1px solid var(--lines--border,#27272733);
  padding:.4375rem .25rem; cursor:text; min-width:0;
  transition:border-color .22s ease}
.yfwrk-search.is-live{display:flex}
.yfwrk-search:focus-within{border-bottom-color:var(--brand--dark,#272727)}
.yfwrk-search svg{flex:0 0 auto; display:block; opacity:.45}
.yfwrk-search input{
  border:0; outline:0; background:none; width:100%; min-width:0; padding:0;
  font-family:var(--typography--family--text,Inter),sans-serif;
  font-size:.9375rem; font-weight:400; line-height:1;
  color:var(--brand--dark,#272727)}
.yfwrk-search input::placeholder{color:var(--text--text-light,#27272780)}
.yfwrk-search-clear{
  flex:0 0 auto; border:0; background:none; cursor:pointer; padding:.125rem .25rem;
  font-family:var(--typography--family--meta,"Sometype Mono"),monospace;
  font-size:.625rem; font-weight:500; letter-spacing:.1em; text-transform:uppercase;
  color:var(--text--text-light,#27272780);
  opacity:0; pointer-events:none; transition:opacity .18s ease}
.yfwrk-search-clear.is-on{opacity:1; pointer-events:auto}
.yfwrk-search-clear:hover{color:var(--brand--dark,#272727)}

/* ---- panel: drops from the nav ---- */
.yfwrk-panel{
  position:fixed; top:4.75rem; left:50%;
  transform:translateX(-50%) translateY(-.5rem); z-index:59;
  width:min(80rem,calc(100vw - 2.5rem));
  background:var(--backgrounds--pure-white,#fff);
  border-radius:0 0 1.25rem 1.25rem;
  box-shadow:0 1.5rem 3.75rem rgba(39,39,39,.14);
  padding:1.75rem 1.625rem 1.375rem;
  opacity:0; pointer-events:none; transition:opacity .22s ease,transform .22s ease}
@supports (padding-top:env(safe-area-inset-top)){
 .yfwrk-panel{top:calc(4.75rem + env(safe-area-inset-top,0px))}}
.yfwrk-panel.is-open{opacity:1; pointer-events:auto; transform:translateX(-50%)}
.yfwrk-panel-cols{display:grid; grid-template-columns:1fr 1fr 1fr}
.yfwrk-pcol{padding:0 1.375rem; border-right:1px solid var(--lines--separator,#d9d9d5); min-width:0}
.yfwrk-pcol:first-child{padding-left:0}
.yfwrk-pcol:last-child{border-right:0}
.yfwrk-pcol h5{
  margin:0 0 .875rem;
  font-family:var(--typography--family--header,Archivo),sans-serif;
  font-size:.75rem; font-weight:600; letter-spacing:-.01em;
  color:var(--brand--dark,#272727)}
.yfwrk-pcol h5.is-mut{color:var(--text--text-light,#27272780)}
.yfwrk-pcol-note{
  font-family:var(--typography--family--meta,"Sometype Mono"),monospace;
  font-size:.6875rem; line-height:1.5; color:var(--text--text-light,#27272780); padding:.375rem 0}

.yfwrk-opt{
  display:flex; align-items:center; gap:.625rem; cursor:pointer; user-select:none;
  padding:.375rem 0;
  font-family:var(--typography--family--text,Inter),sans-serif;
  font-size:.875rem; font-weight:500; line-height:1.1;
  color:var(--text--text-light,#27272780); transition:color .18s ease}
.yfwrk-opt:hover{color:var(--brand--dark,#272727)}
.yfwrk-opt-mk{
  flex:0 0 auto; width:.625rem; height:.625rem; border-radius:50%;
  border:2px solid var(--dot,var(--text--text-light,#27272780));
  background:transparent; transition:background-color .2s ease,border-color .2s ease}
.yfwrk-opt.is-on{color:var(--brand--dark,#272727); font-weight:600}
.yfwrk-opt.is-on .yfwrk-opt-mk{
  background:var(--dot,var(--brand--dark,#272727));
  border-color:var(--dot,var(--brand--dark,#272727))}
.yfwrk-opt-n{
  margin-left:auto;
  font-family:var(--typography--family--meta,"Sometype Mono"),monospace;
  font-size:.625rem; font-weight:500; color:var(--lines--small-numbers,#27272780)}
.yfwrk-opt.is-zero{opacity:.35; pointer-events:none}

/* dots read the site's own Solutions variables */
.yfwrk-opt[data-v="brand"]{--dot:var(--solutions--brand,#ffc62a)}
.yfwrk-opt[data-v="crossborder"]{--dot:var(--solutions--crossborder,#ef81e8)}
.yfwrk-opt[data-v="content"]{--dot:var(--solutions--content,#ff5a4d)}
.yfwrk-opt[data-v="event"]{--dot:var(--solutions--event,#72d95a)}
.yfwrk-opt[data-v="digital"]{--dot:var(--solutions--digital,#667cff)}
.yfwrk-opt[data-v="campaign"]{--dot:var(--solutions--campaign,#a65bef)}
.yfwrk-opt[data-v="operation"]{--dot:var(--solutions--operation,#61dcc7)}

.yfwrk-panel-foot{
  display:flex; align-items:center; gap:1rem; margin-top:1.125rem;
  padding-top:.875rem; border-top:1px solid var(--lines--separator,#d9d9d5)}
.yfwrk-ct{
  font-family:var(--typography--family--meta,"Sometype Mono"),monospace;
  font-size:.6875rem; font-weight:500; color:var(--text--text-light,#27272780)}
.yfwrk-ct b{font-weight:600; color:var(--brand--dark,#272727)}
.yfwrk-reset{
  margin-left:auto; cursor:pointer; border:1px solid var(--lines--border,#27272733);
  background:none; border-radius:30px; padding:.4375rem .875rem;
  font-family:var(--typography--family--meta,"Sometype Mono"),monospace;
  font-size:.625rem; font-weight:500; letter-spacing:.1em; text-transform:uppercase;
  color:var(--brand--dark,#272727);
  transition:background-color .22s ease,color .22s ease,border-color .22s ease}
.yfwrk-reset:hover{
  background:var(--brand--y,#ffee2d); border-color:var(--brand--y,#ffee2d);
  color:var(--brand--dark,#272727)}
.yfwrk-scrim{position:fixed; inset:0; z-index:58; display:none}
.yfwrk-scrim.is-on{display:block}

@media (max-width:991px){
  .yfwrk-search{max-width:18rem}
}
@media (max-width:767px){
  .yfwrk-search{order:9; flex-basis:100%; max-width:none; margin-top:.5rem}
  .yfwrk-panel{
    width:calc(100vw - 1.5rem); border-radius:1.25rem; padding:1.25rem;
    top:auto; max-height:70vh; overflow-y:auto}
  .yfwrk-panel-cols{grid-template-columns:1fr; gap:1.25rem}
  .yfwrk-pcol{padding:0; border-right:0}
  .yfwrk-pcol:not(:first-child){padding-top:1.25rem; border-top:1px solid var(--lines--separator,#d9d9d5)}
}`;
  document.head.appendChild(css);

  var host=document.createElement('div');
  host.setAttribute('data-yf-injected','');
  host.innerHTML=
    '<label class="yfwrk-search" data-worksearch>'+
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'+
      '<input type="text" id="yfwrk-q" placeholder="Search work" autocomplete="off" aria-label="Search work" />'+
      '<button class="yfwrk-search-clear" data-searchclear type="button">Clear</button>'+
    '</label>'+
    '<div class="yfwrk-scrim" data-workscrim></div>'+
    '<div class="yfwrk-panel" data-workpanel>'+
      '<div class="yfwrk-panel-cols">'+
        '<div class="yfwrk-pcol"><h5 class="is-mut">Location</h5><div data-col="loc"></div></div>'+
        '<div class="yfwrk-pcol"><h5>Solution</h5><div data-col="sol"></div></div>'+
        '<div class="yfwrk-pcol"><h5 class="is-mut">Year</h5><div data-col="year"></div></div>'+
      '</div>'+
      '<div class="yfwrk-panel-foot">'+
        '<span class="yfwrk-ct" data-workcount></span>'+
        '<button class="yfwrk-reset" data-workreset type="button">Reset</button>'+
      '</div>'+
    '</div>';
  while(host.firstChild)document.body.appendChild(host.firstChild);

  /* the search field belongs in the nav row; put it before the links block */
  var menu=document.querySelector('.zmenu'),
      search=document.querySelector('[data-worksearch]');
  if(menu&&search){
    var block=menu.querySelector('.znavmenublock');
    if(block){menu.insertBefore(search,block);}else{menu.appendChild(search);}
  }
  if(search)search.classList.add('is-live');

  /* derive the facets init() reads */
  var grid=document.getElementById('work-grid');
  var list=grid&&grid.querySelector(':scope > .w-dyn-items');
  if(!list)return;
  Array.prototype.slice.call(list.children).forEach(function(card){
    if(!card.classList||!card.classList.contains('w-dyn-item'))return;
    var y=card.querySelector('[data-year-src]');
    if(y){
      var v=(y.textContent||'').replace(/[^0-9]/g,'');
      if(v)card.setAttribute('data-year',v);
    }
    card.querySelectorAll('.yfwrk-cardsols .w-dyn-item').forEach(function(n){
      var t=(n.textContent||'').trim().toLowerCase();
      if(t&&!n.getAttribute('data-sol'))n.setAttribute('data-sol',t);
    });
  });
})();

(function(){
var OVL='.workprojectoverlay,.div-block-162';
var SHOW_LOC=false; // true once Projects.country is filled (16/78 today)
function getCols(){return (window.innerWidth||1200)<=767?3:6;}
// order = Solutions `order`; label = slug capitalised (matches all 7 CMS names)
var SOLS='brand crossborder content event digital campaign operation'.split(' ');
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function init(){
  var wrap=document.getElementById('work-grid');
  if(!wrap)return;
  var list=wrap.querySelector(':scope > .w-dyn-items');
  if(!list)return;
  wrap.setAttribute('data-yf-anim','');
  function topCards(){return Array.prototype.slice.call(list.children).filter(function(el){return el.classList&&el.classList.contains('w-dyn-item');});}
  var cards=topCards();
  if(!cards.length)return;
  /* Facets come from CMS-bound attributes, not scraped text. data-year is on
     the Collection Item; data-sol is on each nested Solutions item and holds
     the SLUG, so matching is exact - the old code compared display name to
     slug with a prefix test and treated operation/operations as equal.

     Keep the nested Solutions collection limit at 100. The 3-chip cap on the
     Work page is display:none, and querySelectorAll still finds hidden
     elements - capping the collection would silently drop solutions four and
     up from the filter and desynchronise the counts against the tiles. */
  cards.forEach(function(card){
    card._sols=Array.prototype.slice.call(card.querySelectorAll('[data-sol]')).map(function(n){return (n.getAttribute('data-sol')||'').trim().toLowerCase();}).filter(Boolean);
    card._year=(card.getAttribute('data-year')||'').trim();
    card._loc=(card.getAttribute('data-country')||'').trim().toLowerCase();
    var t=card.querySelector('.projecttitle');
    card._title=((t&&t.textContent)||'').trim().toLowerCase();
    card.querySelectorAll('img').forEach(function(img){try{img.loading='lazy';img.decoding='async';}catch(e){}});
  });
  /* directional hover: the overlay slides out toward the edge the pointer
     left by, so exit mirrors entry rather than always going one way. */
  cards.forEach(function(card){
    var overlay=card.querySelector(OVL);
    if(!overlay)return;
    function getDir(e){var r=card.getBoundingClientRect();var dx=((e.clientX-r.left)/r.width-0.5)*2;var dy=((e.clientY-r.top)/r.height-0.5)*2;return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'bottom':'top');}
    function toT(d){return {top:'translateY(-100%)',bottom:'translateY(100%)',left:'translateX(-100%)',right:'translateX(100%)'}[d];}
    card.addEventListener('mouseenter',function(e){overlay.style.transition='transform 0.45s cubic-bezier(0.4,0,0.2,1)';overlay.style.transform=toT(getDir(e));});
    card.addEventListener('mouseleave',function(e){var t=toT(getDir(e));overlay.style.transition='none';overlay.style.transform=t;requestAnimationFrame(function(){requestAnimationFrame(function(){overlay.style.transition='transform 0.45s cubic-bezier(0.4,0,0.2,1)';overlay.style.transform='translate(0,0)';});});});
  });
  // shuffle per load; re-read so array matches DOM
  if(cards.length>1){
    for(var s=cards.length-1;s>0;s--){var r=Math.floor(Math.random()*(s+1));var tmp=cards[s];cards[s]=cards[r];cards[r]=tmp;}
    cards.forEach(function(el){list.appendChild(el);});
    cards=topCards();
  }
  /* OR inside a category, AND across categories */
  var sel={sol:{},loc:{},year:{}},query='';
  function on(k){return Object.keys(sel[k]).filter(function(x){return sel[k][x];});}
  function hit(c,k,vals){
    if(k==='sol')return c._sols.some(function(s){return vals.indexOf(s)!==-1;});
    if(k==='loc')return vals.indexOf(c._loc)!==-1;
    return vals.indexOf(c._year)!==-1;
  }
  function match(c){
    if(query&&c._title.indexOf(query)===-1)return false;
    var ks=['sol','loc','year'];
    for(var i=0;i<ks.length;i++){var v=on(ks[i]);if(v.length&&!hit(c,ks[i],v))return false;}
    return true;
  }
  // a count ignores its own category: what clicking would give
  function countFor(k,val){
    return cards.filter(function(c){
      if(query&&c._title.indexOf(query)===-1)return false;
      var ks=['sol','loc','year'];
      for(var i=0;i<ks.length;i++){if(ks[i]===k)continue;var v=on(ks[i]);if(v.length&&!hit(c,ks[i],v))return false;}
      return hit(c,k,[val]);
    }).length;
  }
  var panel=document.querySelector('[data-workpanel]'),
      scrim=document.querySelector('[data-workscrim]'),
      input=document.getElementById('yfwrk-q'),
      clr=document.querySelector('[data-searchclear]'),
      ct=document.querySelector('[data-workcount]');
  // Reparent to <body>. The embed ships them inside .ZNavBar, whose stacking
  // context would put the scrim OVER the search field and the nav links -
  // once open, the input and Clear became unclickable. At body level the
  // ladder is nav 60 > panel 59 > scrim 58, as in the prototype.
  if(panel&&panel.parentNode!==document.body)document.body.appendChild(panel);
  if(scrim&&scrim.parentNode!==document.body)document.body.appendChild(scrim);
  var YEARS=cards.map(function(c){return c._year;}).filter(Boolean).filter(function(y,i,a){return a.indexOf(y)===i;}).sort(function(a,b){return Number(b)-Number(a);});
  var LOCS=cards.map(function(c){return c._loc;}).filter(Boolean).filter(function(l,i,a){return a.indexOf(l)===i;}).sort();
  function renderCol(k,opts){
    var box=document.querySelector('[data-col="'+k+'"]');
    if(!box)return;
    box.innerHTML='';
    if(k==='loc'&&!SHOW_LOC){box.innerHTML='<div class="yfwrk-pcol-note">Not yet available</div>';return;}
    opts.forEach(function(o){
      var n=countFor(k,o[0]),act=!!sel[k][o[0]];
      var d=document.createElement('div');
      d.className='yfwrk-opt'+(act?' is-on':'')+((n===0&&!act)?' is-zero':'');
      d.setAttribute('data-v',o[0]);
      d.innerHTML='<span class="yfwrk-opt-mk"></span><span>'+o[1]+'</span><span class="yfwrk-opt-n">'+(n<10?'0'+n:n)+'</span>';
      d.addEventListener('click',function(){sel[k][o[0]]=!sel[k][o[0]];cols();apply();});
      box.appendChild(d);
    });
  }
  function cols(){
    renderCol('sol',SOLS.map(function(x){return [x,cap(x)];}));
    renderCol('year',YEARS.map(function(y){return [y,y];}));
    renderCol('loc',LOCS.map(function(l){return [l,cap(l)];}));
  }
  function openP(o){if(panel)panel.classList.toggle('is-open',o);if(scrim)scrim.classList.toggle('is-on',o);}
  var sbox=document.querySelector('[data-worksearch]');
  if(sbox)sbox.addEventListener('click',function(){openP(true);});
  if(input)input.addEventListener('focus',function(){openP(true);});
  if(scrim)scrim.addEventListener('click',function(){openP(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')openP(false);});
  var deb=null;
  if(input)input.addEventListener('input',function(e){
    var v=e.target.value.trim().toLowerCase();
    if(clr)clr.classList.toggle('is-on',!!v);
    clearTimeout(deb);deb=setTimeout(function(){query=v;cols();apply();},120);
  });
  if(clr)clr.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();
    input.value='';query='';clr.classList.remove('is-on');cols();apply();
  });
  var rst=document.querySelector('[data-workreset]');
  if(rst)rst.addEventListener('click',function(e){
    e.preventDefault();
    sel={sol:{},loc:{},year:{}};
    if(input)input.value='';query='';
    if(clr)clr.classList.remove('is-on');
    cols();apply();
  });
  /* BENTO LAYOUT - skyline packer, one height per column, always appending
     downward. gap stays 0; the 2px separation is a 1px white border on
     .collection-item-15, which cannot double up.

     EMPTY-CELL FIX (2026-08-03): a 2x2 must straddle two columns whose
     skylines are LEVEL. The old code placed it at Math.max of the two, so an
     uneven pair left a permanent hole under the shorter column - a skyline
     packer can only append downward, so nothing could ever fill it. That was
     the phantom empty cell, and it appeared at some widths and not others
     because INITIAL depends on cell width and viewport height, so different
     screens land on different span sequences.
     Now: only level pairs are considered, and if none exist the tile is
     demoted to 1x1 rather than punching a hole. 0.5px tolerance because cell
     is fractional and (h + 2*cell) vs ((h + cell) + cell) can differ by an
     ulp. */
  var INITIAL=0,BATCH=0,renderLimit=0,matchedCount=0;
  function layout(visible){
    var cols=getCols(),gap=0;var cell=(list.offsetWidth-gap*(cols-1))/cols;
    var big={},skip=0,TAIL=12;
    var noBigFrom=Math.max(0,matchedCount-TAIL);
    visible.forEach(function(_,i){if(skip>0){skip--;return;}if(i>0&&i%5===0&&i<noBigFrom){big[i]=1;skip=3;}});
    var colH=new Array(cols).fill(0);
    visible.forEach(function(item,i){
      var span=big[i]?2:1,col=0,minH=Infinity,c;
      if(span===2){
        var found=-1,best=Infinity;
        for(c=0;c<=cols-2;c++){if(Math.abs(colH[c]-colH[c+1])<0.5&&colH[c]<best){best=colH[c];found=c;}}
        if(found<0){span=1;}else{col=found;minH=best;}
      }
      if(span===1){for(c=0;c<cols;c++){if(colH[c]<minH){minH=colH[c];col=c;}}}
      var size=cell*span+gap*(span-1);
      item.classList.toggle('yf-2x2',span===2);
      item.style.width=size+'px';item.style.height=size+'px';
      item.style.left=(col*(cell+gap))+'px';item.style.top=minH+'px';
      for(var c2=col;c2<col+span;c2++)colH[c2]=minH+size+gap;
    });
    list.style.height=Math.max.apply(null,colH)+'px';
  }
  function computeBatch(){
    var cols=getCols();var cell=(list.offsetWidth||1200)/cols;
    var perScreen=Math.max(cols,Math.ceil((window.innerHeight||800)/Math.max(cell,1))*cols);
    INITIAL=perScreen+cols;BATCH=perScreen;
  }
  var hasIO=(typeof IntersectionObserver!=='undefined');
  var revealIO=hasIO?new IntersectionObserver(function(entries){
    var batch=[];
    entries.forEach(function(e){if(!e.isIntersecting)return;revealIO.unobserve(e.target);batch.push(e.target);});
    batch.forEach(function(el,i){setTimeout(function(){el.classList.add('yf-in');},Math.min(i,10)*50);});
  },{rootMargin:'0px 0px -5% 0px',threshold:0.05}):null;
  function armReveal(items){
    items.forEach(function(el){
      if(el.getAttribute('data-yf-armed'))return;
      el.setAttribute('data-yf-armed','1');
      if(revealIO){revealIO.observe(el);}else{el.classList.add('yf-in');}
    });
  }
  var sentinel=document.createElement('div');
  sentinel.setAttribute('data-work-sentinel','');
  sentinel.style.cssText='width:100%;height:1px;pointer-events:none;';
  wrap.appendChild(sentinel);
  if(hasIO){
    var io=new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting&&renderLimit<matchedCount){renderLimit+=BATCH;apply(true);}
    },{rootMargin:'400px 0px'});
    io.observe(sentinel);
  }
  // apply(): only place display is decided. keepLimit=true on scroll
  // reveal; a filter change re-seeds renderLimit so reveal restarts.
  function apply(keepLimit){
    var matched=cards.filter(match);
    matchedCount=matched.length;
    if(!keepLimit)renderLimit=INITIAL;
    if(!hasIO)renderLimit=matchedCount;
    if(renderLimit<INITIAL)renderLimit=INITIAL;
    var shown=matched.slice(0,renderLimit);
    cards.forEach(function(card){card.style.display=(shown.indexOf(card)!==-1)?'':'none';});
    layout(shown);
    armReveal(shown);
    wrap.appendChild(sentinel);
    if(ct)ct.innerHTML='<b>'+matchedCount+'</b> / '+cards.length+' projects';
  }
  window.addEventListener('resize',function(){computeBatch();apply(true);});
  window.addEventListener('load',function(){computeBatch();apply(true);});
  computeBatch();cols();apply();
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
