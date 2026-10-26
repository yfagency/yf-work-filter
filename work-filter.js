/* YF - Work page grid + filter  ·  v2.1.1  (2026-10-26, ZF-PC)
 * ---------------------------------------------------------------------------
 * Drives yfkk.co/work: the bento grid, the progressive reveal, and the filter.
 * Interaction is Work Mosaic's (YF Builds): an always-visible SEARCH BAR in the
 * nav; clicking or typing in it drops a FILTER PANEL with one column per facet
 * (Solution, Tactic, Industry, Region, Company, Year). Hovering an option
 * PEEKS: the tiles it would keep get an outline in its colour, the rest dim.
 * A breadcrumb row under the nav always says what you are looking at.
 *
 * WHY A HOSTED FILE. The Work page's own footer code is capped at 10,000
 * characters and the grid engine alone was at ~9,840. This file has no cap,
 * lives in version control, and is attached to the page as the registered
 * script "YF Work Filter". Deploy steps: README.
 *
 * WHAT IS IN WEBFLOW, AND WHAT IS IN HERE
 *   Webflow (real Designer elements, real classes, visible on the canvas):
 *     the filter panel (six columns, one template option each, a footer with
 *     count, Reset and Show results), the breadcrumb row with one template
 *     chip, the count, Reset, the view toggle, and the nav search bar (Z Nav
 *     Bar (mobile), shown on Work only by the component setting "Show Work
 *     search").
 *   Here: behaviour only. States the script toggles (is-on, is-zero, ...) are
 *     styled in the named embed "Work Filter Code (states)" on the Work page.
 *
 * THE DOM CONTRACT - attributes, never class names, so a class rename in the
 * Designer cannot break this file.
 *   #work-grid                         Projects Collection List wrapper
 *   [data-yf-panel]                    filter panel; .is-open while open
 *     [data-yf-panel-close]             any number; closes the panel
 *   [data-yf-facet="<key>"]            one column per facet; key = solution |
 *                                      tactic | industry | region | company | year
 *     [data-yf-facet-label]             column heading (used in aria labels)
 *     [data-yf-facet-n]                 selected-count badge in the heading
 *     [data-yf-template="option"]       option template, cloned per value
 *       [data-yf-opt-label] [data-yf-opt-n] [data-yf-opt-mark]
 *   [data-yf-crumbs]                   breadcrumb row
 *   [data-yf-count-shown] [data-yf-count-total]   any number (row + panel)
 *     [data-yf-template="crumb"]        chip template  > [data-yf-crumb-label]
 *     [data-yf-reset]                 (any number: breadcrumb + empty state)
 *   #work-grid[data-yf-empty]          set when nothing matches; the empty-state
 *                                      block (.yfwrk-empty) is shown by CSS
 *   [data-yf-search]                   nav search bar (Work page only); gets
 *                                      .is-open with the panel, .has-q with text
 *     [data-yf-search-input] [data-yf-search-close] (clears the text)
 *   #work-grid.is-peek                 while an option is hovered; matching
 *     cards get .is-peek-hit, --yf-peek on the grid = the option's colour
 *
 * WHERE EACH FACET IS READ FROM - the CMS-bound elements already in every card
 * (added for the list view, 2026-10-20/21). Exact text, never a prefix match.
 *   solution  .yfwrk-cardsols .yfwrk-sol-label   (Solutions list ONLY - the old
 *             script read every nested list, so the tactic "Brand Website"
 *             counted as Brand: Brand read 17, true 15)
 *   tactic    .yfwrk-cardtacs .yfsolp-chip-label  (dot = closest [data-accent])
 *   industry  .yfwrk-rowindustry     region  .yfwrk-rowflag[alt]
 *   company   .yfwrk-rowclient       year    .yfwrk-rowyear
 *   TRAP: nested multi-reference lists render at most FIVE items. A project
 *   with six tactics silently drops one from the Tactic filter.
 *
 * SEMANTICS (ported from Work Mosaic): any match within a facet, every facet
 * must match. An option's count ignores its own facet, so it says what
 * clicking it would give you. Options that would give nothing are dimmed.
 * Selections are mirrored to the URL (?solution=Brand&year=2025&q=tdk) so a
 * filtered view can be shared. Each change sends GA4 `filter_apply`.
 * ------------------------------------------------------------------------- */
(function(){
'use strict';
var OVL='.workprojectoverlay,.div-block-162';
var FACETS=['solution','tactic','industry','region','company','year'];
// KB canonical domain order (Critical Context 01).
var SOL_ORDER=['brand','content','event','campaign','digital','operation','crossborder'];

/* ---- grid engine (moved verbatim in behaviour from the Work page footer) ---- */
// COLUMNS - single source of truth. layout() and computeBatch() MUST agree or
// the progressive reveal renders the wrong tile count and leaves holes.
// 768-991 = 4 (2026-09-04), desktop = 5 (2026-10-20, same as About team grid).
function getCols(){var w=(window.innerWidth||1200);if(w<=767)return 3;if(w<=991)return 4;return 5;}
function txt(el){return el?(el.textContent||'').replace(/\s+/g,' ').trim():'';}
function norm(s){return (s||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'');}

function init(){
  var wrap=document.getElementById('work-grid');
  if(!wrap)return;
  var list=wrap.querySelector(':scope > .w-dyn-items');
  if(!list)return;
  wrap.setAttribute('data-yf-anim','');
  function topCards(){return Array.prototype.slice.call(list.children).filter(function(el){return el.classList&&el.classList.contains('w-dyn-item');});}
  var cards=topCards();
  if(!cards.length)return;

  /* facets per card */
  cards.forEach(function(card){
    var v={};FACETS.forEach(function(f){v[f]=[];});
    card.querySelectorAll('.yfwrk-cardsols .yfwrk-sol-label').forEach(function(n){var t=txt(n);if(t)v.solution.push(t);});
    card.querySelectorAll('.yfwrk-cardtacs .yfsolp-chip-label').forEach(function(n){var t=txt(n);if(t)v.tactic.push(t);});
    var ind=txt(card.querySelector('.yfwrk-rowindustry'));if(ind)v.industry.push(ind);
    var fl=card.querySelector('.yfwrk-rowflag');var reg=fl?(fl.getAttribute('alt')||'').trim():'';if(reg)v.region.push(reg);
    var co=txt(card.querySelector('.yfwrk-rowclient'));if(co)v.company.push(co);
    var yr=txt(card.querySelector('.yfwrk-rowyear'));if(/^\d{4}$/.test(yr))v.year.push(yr);
    card._v=v;
    card._hay=norm([txt(card.querySelector('.projecttitle'))].concat(v.solution,v.tactic,v.industry,v.region,v.company,v.year).join(' '));
  });
  cards.forEach(function(card){
    card.querySelectorAll('img').forEach(function(img){try{img.loading='lazy';img.decoding='async';}catch(e){}});
  });
  /* directional hover */
  cards.forEach(function(card){
    var overlay=card.querySelector(OVL);
    if(!overlay)return;
    function getDir(e){var r=card.getBoundingClientRect();var dx=((e.clientX-r.left)/r.width-0.5)*2;var dy=((e.clientY-r.top)/r.height-0.5)*2;return Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'bottom':'top');}
    function toT(d){return {top:'translateY(-100%)',bottom:'translateY(100%)',left:'translateX(-100%)',right:'translateX(100%)'}[d];}
    card.addEventListener('mouseenter',function(e){overlay.style.transition='transform 0.45s cubic-bezier(0.4,0,0.2,1)';overlay.style.transform=toT(getDir(e));});
    card.addEventListener('mouseleave',function(e){var t=toT(getDir(e));overlay.style.transition='none';overlay.style.transform=t;requestAnimationFrame(function(){requestAnimationFrame(function(){overlay.style.transition='transform 0.45s cubic-bezier(0.4,0,0.2,1)';overlay.style.transform='translate(0,0)';});});});
  });
  // Random shuffle once per load (Fisher-Yates); cards re-read after so the
  // array matches the DOM.
  if(cards.length>1){
    for(var s=cards.length-1;s>0;s--){var r=Math.floor(Math.random()*(s+1));var tmp=cards[s];cards[s]=cards[r];cards[r]=tmp;}
    cards.forEach(function(el){list.appendChild(el);});
    cards=topCards();
  }
  // LIST VIEW = NEWEST FIRST (2026-10-20): the grid keeps the shuffle; in list
  // view (#work-grid.is-list) cards run by Year, newest at the top. Same year
  // keeps the shuffle order. style.order sorts the list's flex column.
  function yr(c){return parseInt(c._v.year[0],10)||0;}
  var byYear=cards.slice().sort(function(a,b){return yr(b)-yr(a);});
  byYear.forEach(function(c,i){c.style.order=i;});
  /* BENTO LAYOUT - skyline packer, appends downward, gap 0 (the 2px line is a
     1px border on .collection-item-15). EMPTY-CELL FIX 2026-08-03: a 2x2 only
     goes on two LEVEL columns (0.5px tolerance), else it drops to 1x1 - write-up
     in Notion > Decisions & Learnings. */
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
      item.style.width=size+'px';item.style.height=size+'px';item.style.left=(col*(cell+gap))+'px';item.style.top=minH+'px';
      for(var c2=col;c2<col+span;c2++)colH[c2]=minH+size+gap;
    });
    list.style.height=Math.max.apply(null,colH.concat(0))+'px';
  }
  function computeBatch(){
    var cols=getCols();var cell=(list.offsetWidth||1200)/cols;
    var perScreen=Math.max(cols,Math.ceil((window.innerHeight||800)/Math.max(cell,1))*cols);
    INITIAL=perScreen+cols;BATCH=perScreen;
  }
  var hasIO=(typeof IntersectionObserver!=='undefined');
  // ARRIVAL COVER (2026-10-20): tiles rise as the YF Arrival Cover starts its
  // fade, not unseen underneath it. 4s cap matches the cover's CSS fallback.
  function afterCover(fn){var c=document.getElementById('yfload');if(!c||c.classList.contains('is-done'))return fn();var go=0,mo;function run(){if(go)return;go=1;if(mo)mo.disconnect();fn();}mo=new MutationObserver(function(){if(c.classList.contains('is-done'))run();});mo.observe(c,{attributes:true});setTimeout(run,4000);}
  var revealIO=hasIO?new IntersectionObserver(function(entries){
    var batch=[];
    entries.forEach(function(e){if(!e.isIntersecting)return;revealIO.unobserve(e.target);batch.push(e.target);});
    afterCover(function(){batch.forEach(function(el,i){setTimeout(function(){el.classList.add('yf-in');},Math.min(i,10)*50);});});
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

  /* ---- filter state ---- */
  var sel={};FACETS.forEach(function(f){sel[f]={};});
  var q='';
  function picked(f){return Object.keys(sel[f]).filter(function(k){return sel[f][k];});}
  function anyActive(){return !!q||FACETS.some(function(f){return picked(f).length>0;});}
  function matches(card,except){
    for(var i=0;i<FACETS.length;i++){
      var f=FACETS[i];if(f===except)continue;
      var p=picked(f);if(!p.length)continue;
      var vals=card._v[f],hit=false;
      for(var j=0;j<p.length;j++){if(vals.indexOf(p[j])!==-1){hit=true;break;}}
      if(!hit)return false;
    }
    if(q){var toks=norm(q).split(/\s+/).filter(Boolean);for(var k=0;k<toks.length;k++){if(card._hay.indexOf(toks[k])===-1)return false;}}
    return true;
  }
  function pad(n){return n<10?'0'+n:''+n;}

  function relayout(){
    var src=wrap.classList.contains('is-list')?byYear:cards;
    var matched=src.filter(function(card){return matches(card,null);});
    matchedCount=matched.length;
    if(!hasIO)renderLimit=matchedCount;
    if(renderLimit<INITIAL)renderLimit=INITIAL;
    var shown=matched.slice(0,renderLimit);
    var on=new Set(shown);
    cards.forEach(function(card){card.style.display=on.has(card)?'':'none';});
    layout(shown);
    armReveal(shown);
    wrap.appendChild(sentinel);
    wrap.toggleAttribute('data-yf-empty',matchedCount===0);
    paint();
  }
  if(hasIO){
    var io=new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting&&renderLimit<matchedCount){
        renderLimit+=BATCH;relayout();
        // re-observe: list rows are short, so one batch may not push the
        // sentinel out of range and IO would never fire again
        io.unobserve(sentinel);io.observe(sentinel);
      }
    },{rootMargin:'400px 0px'});
    io.observe(sentinel);
  }

  /* ---- facet dropdowns ---- */
  var ui={};
  function optionValues(f){
    var seen={};cards.forEach(function(c){c._v[f].forEach(function(v){seen[v]=1;});});
    var vals=Object.keys(seen);
    if(f==='year')return vals.sort(function(a,b){return b-a;});
    if(f==='solution')return vals.sort(function(a,b){var ia=SOL_ORDER.indexOf(a.toLowerCase()),ib=SOL_ORDER.indexOf(b.toLowerCase());return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b);});
    return vals.sort(function(a,b){return a.localeCompare(b);});
  }
  function accentFor(f,v){
    if(f==='solution')return 'var(--solutions--'+v.toLowerCase().replace(/[^a-z]/g,'')+')';
    if(f==='tactic'){
      for(var i=0;i<cards.length;i++){
        var labs=cards[i].querySelectorAll('.yfwrk-cardtacs .yfsolp-chip-label');
        for(var j=0;j<labs.length;j++){if(txt(labs[j])===v){var a=labs[j].closest('[data-accent]');var c=a?(a.getAttribute('data-accent')||'').trim():'';if(c)return c;}}
      }
    }
    return '';
  }
  var canHover=!!(window.matchMedia&&window.matchMedia('(hover:hover) and (pointer:fine)').matches);
  /* PEEK (Work Mosaic): hovering an option outlines the visible tiles it would
     keep, in its colour, and dims the rest. Mouse only. */
  function peek(f,v,acc){
    wrap.classList.add('is-peek');
    wrap.style.setProperty('--yf-peek',acc||'var(--brand--dark)');
    cards.forEach(function(c){c.classList.toggle('is-peek-hit',c._v[f].indexOf(v)!==-1);});
  }
  function unpeek(){
    if(!wrap.classList.contains('is-peek'))return;
    wrap.classList.remove('is-peek');
    cards.forEach(function(c){c.classList.remove('is-peek-hit');});
  }
  document.querySelectorAll('[data-yf-facet]').forEach(function(box){
    var f=box.getAttribute('data-yf-facet');if(FACETS.indexOf(f)===-1)return;
    var tpl=box.querySelector('[data-yf-template="option"]');if(!tpl)return;
    var holder=tpl.parentNode;
    var badge=box.querySelector('[data-yf-facet-n]');
    var name=txt(box.querySelector('[data-yf-facet-label]'))||f;
    tpl.hidden=true;tpl.setAttribute('aria-hidden','true');
    var opts={};
    optionValues(f).forEach(function(v){
      var o=tpl.cloneNode(true);
      o.removeAttribute('data-yf-template');o.removeAttribute('aria-hidden');o.hidden=false;
      o.setAttribute('data-yf-value',v);
      if(o.tagName==='BUTTON')o.type='button';
      var lab=o.querySelector('[data-yf-opt-label]');if(lab)lab.textContent=v;
      var acc=accentFor(f,v);if(acc)o.style.setProperty('--yf-accent',acc);
      if(canHover){
        o.addEventListener('mouseenter',function(){if(!o.classList.contains('is-zero'))peek(f,v,acc);});
        o.addEventListener('mouseleave',unpeek);
      }
      o.addEventListener('click',function(e){
        e.preventDefault();e.stopPropagation();
        if(o.getAttribute('aria-disabled')==='true'&&!sel[f][v])return;
        sel[f][v]=!sel[f][v];
        changed(f,v,sel[f][v]?'add':'remove');
        if(canHover&&o.matches(':hover'))peek(f,v,acc);
      });
      holder.appendChild(o);opts[v]=o;
    });
    ui[f]={box:box,badge:badge,opts:opts,name:name};
  });

  /* ---- breadcrumb ---- */
  var panel=document.querySelector('[data-yf-panel]');
  var crumbs=document.querySelector('[data-yf-crumbs]');
  var crumbTpl=crumbs&&crumbs.querySelector('[data-yf-template="crumb"]');
  var crumbHolder=crumbTpl&&crumbTpl.parentNode;
  if(crumbTpl){crumbTpl.hidden=true;crumbTpl.setAttribute('aria-hidden','true');}
  function all(sel){return Array.prototype.slice.call(document.querySelectorAll(sel));}
  var elShown=all('[data-yf-count-shown]');
  var resetBtns=all('[data-yf-reset]');
  all('[data-yf-count-total]').forEach(function(e){e.textContent=pad(cards.length);});

  function addCrumb(label,aria,onRemove){
    if(!crumbTpl)return;
    var c=crumbTpl.cloneNode(true);
    c.removeAttribute('data-yf-template');c.removeAttribute('aria-hidden');c.hidden=false;
    c.setAttribute('data-yf-crumb','');
    if(c.tagName==='BUTTON')c.type='button';
    var l=c.querySelector('[data-yf-crumb-label]');if(l)l.textContent=label;
    c.setAttribute('aria-label',aria);
    c.addEventListener('click',function(e){e.preventDefault();onRemove();});
    crumbHolder.appendChild(c);
  }

  function paint(){
    FACETS.forEach(function(f){
      var u=ui[f];if(!u)return;
      var n=0;
      Object.keys(u.opts).forEach(function(v){
        var o=u.opts[v],isOn=!!sel[f][v];
        var count=cards.filter(function(c){return c._v[f].indexOf(v)!==-1&&matches(c,f);}).length;
        var ne=o.querySelector('[data-yf-opt-n]');if(ne)ne.textContent=pad(count);
        o.classList.toggle('is-on',isOn);
        o.setAttribute('aria-pressed',isOn?'true':'false');
        var zero=count===0&&!isOn;
        o.classList.toggle('is-zero',zero);
        o.setAttribute('aria-disabled',zero?'true':'false');
        if(isOn)n++;
      });
      u.box.classList.toggle('is-active',n>0);
      if(u.badge){u.badge.textContent=n?pad(n):'';u.badge.hidden=!n;}
    });
    if(crumbHolder){
      crumbHolder.querySelectorAll('[data-yf-crumb]').forEach(function(c){c.remove();});
      FACETS.forEach(function(f){
        picked(f).forEach(function(v){
          addCrumb(v,'Remove '+((ui[f]&&ui[f].name)||f)+': '+v,function(){sel[f][v]=false;changed(f,v,'remove');});
        });
      });
      if(q)addCrumb('“'+q+'”','Clear search: '+q,function(){setQuery('');});
    }
    var active=anyActive();
    if(crumbs)crumbs.classList.toggle('is-filtered',active);
    if(panel)panel.classList.toggle('is-filtered',active);
    elShown.forEach(function(e){e.textContent=pad(matchedCount);});
    resetBtns.forEach(function(b){if(b.tagName==='BUTTON')b.disabled=!active;});
  }

  /* ---- URL + analytics ---- */
  var KEYS={solution:'solution',tactic:'tactic',industry:'industry',region:'region',company:'company',year:'year'};
  function writeURL(){
    try{
      var p=new URLSearchParams(location.search);
      FACETS.forEach(function(f){p.delete(KEYS[f]);picked(f).forEach(function(v){p.append(KEYS[f],v);});});
      p.delete('q');if(q)p.set('q',q);
      var s=p.toString();
      history.replaceState(history.state,'',location.pathname+(s?'?'+s:'')+location.hash);
    }catch(e){}
  }
  function readURL(){
    try{
      var p=new URLSearchParams(location.search);
      FACETS.forEach(function(f){p.getAll(KEYS[f]).forEach(function(v){if(ui[f]&&ui[f].opts[v])sel[f][v]=true;});});
      q=(p.get('q')||'').trim();
    }catch(e){}
  }
  function track(facet,value,action){
    try{if(typeof window.gtag==='function')window.gtag('event','filter_apply',{filter_facet:facet,filter_value:String(value).slice(0,100),filter_action:action,results:matchedCount});}catch(e){}
  }
  function scrollToGrid(){
    var bar=document.querySelector('[data-workfilter]');
    var stick=bar&&bar.closest('.sticky')||bar;
    var off=(stick?stick.getBoundingClientRect().bottom:0);
    var top=wrap.getBoundingClientRect().top;
    if(top<off-1)window.scrollTo({top:window.scrollY+top-off,behavior:'auto'});
  }
  function changed(f,v,action){
    renderLimit=INITIAL;relayout();writeURL();scrollToGrid();track(f,v,action);
  }

  /* ---- search bar + filter panel (Work Mosaic) ---- */
  var sBox=document.querySelector('[data-yf-search]');
  var sInput=sBox&&sBox.querySelector('[data-yf-search-input]');
  var sClose=sBox&&sBox.querySelector('[data-yf-search-close]');
  // the clickable zone is the visible field; the wrapper can be wider (it fills spare nav space)
  var sZone=(sBox&&sBox.querySelector('[data-yf-search-field]'))||sBox;
  var sTimer=0,tTimer=0;
  function isOpen(){return !!(panel&&panel.classList.contains('is-open'));}
  function openPanel(open){
    if(!panel)return;
    if(isOpen()===open)return;
    panel.classList.toggle('is-open',open);
    if(sBox)sBox.classList.toggle('is-open',open);
    if(sInput)sInput.setAttribute('aria-expanded',open?'true':'false');
    if(!open)unpeek();
  }
  function setQuery(v){
    q=(v||'').trim();
    if(sInput&&sInput.value!==v)sInput.value=v;
    if(sBox)sBox.classList.toggle('has-q',!!q);
    renderLimit=INITIAL;relayout();writeURL();
    clearTimeout(tTimer);if(q)tTimer=setTimeout(function(){track('search',q,'search');},1200);
  }
  if(panel){
    if(!panel.id)panel.id='yfwrk-panel';
    all('[data-yf-panel-close]').forEach(function(b){
      if(b.tagName==='BUTTON')b.type='button';
      b.addEventListener('click',function(e){e.preventDefault();openPanel(false);scrollToGrid();});
    });
    panel.addEventListener('mouseleave',unpeek);
    // click outside the panel and the search bar closes it (Mosaic's scrim)
    document.addEventListener('pointerdown',function(e){
      if(!isOpen())return;
      if(panel.contains(e.target)||(sZone&&sZone.contains(e.target)))return;
      openPanel(false);
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&isOpen()){openPanel(false);if(sInput)sInput.focus();}
    });
  }
  if(sBox&&sInput){
    sBox.classList.add('is-live');
    try{sInput.type='search';}catch(e){}
    sInput.setAttribute('autocomplete','off');sInput.setAttribute('spellcheck','false');
    if(panel){sInput.setAttribute('aria-controls',panel.id);sInput.setAttribute('aria-expanded','false');}
    sZone.addEventListener('click',function(e){if(!sClose||!sClose.contains(e.target)){openPanel(true);if(document.activeElement!==sInput)sInput.focus();}});
    sInput.addEventListener('focus',function(){openPanel(true);});
    if(sClose){sClose.type='button';sClose.addEventListener('click',function(e){e.preventDefault();setQuery('');sInput.focus();});}
    sInput.addEventListener('input',function(){var v=sInput.value;openPanel(true);clearTimeout(sTimer);sTimer=setTimeout(function(){setQuery(v);},120);});
    sInput.addEventListener('keydown',function(e){
      if(e.key==='Enter'){e.preventDefault();clearTimeout(sTimer);setQuery(sInput.value);openPanel(false);sInput.blur();scrollToGrid();}
    });
    var form=sInput.closest('form');if(form)form.addEventListener('submit',function(e){e.preventDefault();});
  }

  resetBtns.forEach(function(resetBtn){
    if(resetBtn.tagName==='BUTTON')resetBtn.type='button';
    resetBtn.addEventListener('click',function(e){
      e.preventDefault();
      FACETS.forEach(function(f){sel[f]={};});
      setQuery('');track('all','reset','reset');
    });
  });

  readURL();
  if(q&&sInput){sInput.value=q;sBox.classList.add('has-q');}
  window.addEventListener('resize',function(){computeBatch();relayout();});
  window.addEventListener('load',function(){computeBatch();relayout();});
  computeBatch();
  renderLimit=INITIAL;
  relayout();
  window.yfWorkFilter={version:'2.1.1',state:function(){var o={q:q};FACETS.forEach(function(f){o[f]=picked(f);});return o;},count:function(){return matchedCount;}};
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
