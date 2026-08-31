/* YF - Work page grid + nav filter
 * ---------------------------------------------------------------------------
 * Drives #work-grid on yfkk.co/work: the bento layout, the progressive reveal
 * and the search / Solution / Year filter in the nav bar.
 *
 * Loaded as a hosted script on the Work page (Webflow > Page settings), served
 * from jsDelivr and pinned to a tag. It lives here rather than in the page's
 * custom-code field because that field caps at 10,000 characters and this file
 * is past it - the cap is also why the previous inline version had to keep its
 * comments lean. It does not any more.
 *
 * Companion markup: the search field and filter panel are an HTML Embed inside
 * the "Z Nav Bar (mobile)" component. This script early-returns when
 * #work-grid is absent, so it is inert on every other page.
 *
 * Rationale for the non-obvious parts: Notion > Claude Knowledge Base >
 * Decisions & Learnings (2026-08-03 empty-cell fix, 2026-08-31 this rewrite).
 * ------------------------------------------------------------------------- */
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
