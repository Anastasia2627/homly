/* HOMLY / 04 categories — desktop scroll-linked rail, mobile native swipe.
   Category destinations match the existing catalog ?category= filters. */
(() => {
  'use strict';
  if (document.body.dataset.page !== 'index') return;
  const section = document.getElementById('categories-home');
  if (!section) return;
  const categories = [
    {id:'beads',title:'Бусини',photo:'assets/bag.webp',tone:'#D7DCFA',number:'01'},
    {id:'textile',title:'Вишивка',photo:'assets/cat.webp',tone:'#F7C6DE',number:'02'},
    {id:'decor',title:'Декор',photo:'assets/snow.webp',tone:'#E8DBF5',number:'03'},
    {id:'candles',title:'Свічки',photo:'assets/candles.webp',tone:'#FFD9C0',number:'04'}
  ];
  const arrowRight='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 12h14m-5.5-5.5 5.5 5.5-5.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const arrowLeft='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19.5 12h-14M11 6.5 5.5 12l5.5 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const cards=categories.map(c=>'<a class="cat-card" href="catalog.html?category='+c.id+'" aria-label="Переглянути напрям: '+c.title+'" style="--card-tone:'+c.tone+'">'+
    '<img src="'+c.photo+'" loading="lazy" alt="'+c.title+' — набори для творчості HOMLY">'+
    '<span class="cat-card-index">'+c.number+' / 04</span>'+
    '<span class="cat-card-bottom"><strong>'+c.title+'</strong><span class="cat-card-arrow" aria-hidden="true">'+arrowRight+'</span></span>'+
    '</a>').join('');
  section.innerHTML = '<div class="cat-sticky"><div class="wrap cat-layout">'+
      '<header class="cat-heading"><div class="cat-heading-copy">'+
        '<span class="cat-eyebrow" data-reveal="up">04 / КАТЕГОРІЇ</span>'+
        '<h2 id="categories-title" data-reveal="up">Що будемо <em>творити?</em></h2>'+
      '</div><div class="cat-controllers">'+
        '<span class="cat-status" aria-live="polite"><b id="cat-current">01</b><span> / 04</span></span>'+
        '<div class="cat-arrows"><button class="cat-arrow" type="button" id="cat-prev" aria-label="Попередня категорія" disabled>'+arrowLeft+'</button>'+
        '<button class="cat-arrow" type="button" id="cat-next" aria-label="Наступна категорія">'+arrowRight+'</button></div>'+
      '</div></header>'+
      '<div class="cat-window" id="cat-window" aria-label="Категорії наборів HOMLY">'+
        '<div class="cat-track" id="cat-track">'+cards+'</div>'+
      '</div>'+
      '<div class="cat-bottom"><span>ЗНАЙДИ СВОЄ НАТХНЕННЯ</span>'+
        '<span class="cat-line" aria-hidden="true"><span></span></span>'+
        '<a href="catalog.html">УСІ НАБОРИ <span aria-hidden="true">'+arrowRight+'</span></a>'+
      '</div>'+
    '</div></div>';

  // The home page initialized IntersectionObserver before this deferred script.
  // Register late-added heading nodes or they remain invisible on scroll.
  if (typeof observeReveals === 'function') observeReveals(section);

  const sticky=section.querySelector('.cat-sticky');
  const windowEl=section.querySelector('.cat-window');
  const track=section.querySelector('.cat-track');
  const cardElements=[...section.querySelectorAll('.cat-card')];
  const prev=section.querySelector('#cat-prev');
  const next=section.querySelector('#cat-next');
  const count=section.querySelector('#cat-current');
  const progressBar=section.querySelector('.cat-line span');
  const mobile=matchMedia('(max-width: 760px)');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
  let maxDistance=0;
  let active=0;
  let scheduled=0;

  function setActive(i,progress){
    const index=clamp(i,0,cardElements.length-1);
    if(active!==index){active=index;count.textContent=String(index+1).padStart(2,'0')}
    prev.disabled=index===0;
    next.disabled=index===cardElements.length-1;
    progressBar.style.width=(Math.max(0,Math.min(100,progress*100))).toFixed(1)+'%';
    section.dataset.catIndex=String(index+1);
  }
  function scrollFraction(){
    const top=parseFloat(getComputedStyle(sticky).top)||0;
    const travel=Math.max(1,section.offsetHeight-sticky.getBoundingClientRect().height);
    return clamp((top-section.getBoundingClientRect().top)/travel);
  }
  function update(){
    scheduled=0;
    if(mobile.matches){
      track.style.removeProperty('transform');
      const max=Math.max(1,windowEl.scrollWidth-windowEl.clientWidth);
      const p=clamp(windowEl.scrollLeft/max);
      const viewportCenter=windowEl.getBoundingClientRect().left+windowEl.clientWidth*.5;
      let best=0,closest=Infinity;
      cardElements.forEach((card,i)=>{
        const c=card.getBoundingClientRect();
        const distance=Math.abs(c.left+c.width*.5-viewportCenter);
        if(distance<closest){best=i;closest=distance}
      });
      setActive(best,p);
      return;
    }
    const p=scrollFraction();
    const amount=Math.max(0,Math.min(maxDistance,maxDistance*p));
    track.style.transform='translate3d('+-amount.toFixed(2)+'px,0,0)';
    // Keep the counter tied to the horizontal position of the visible cards.
    setActive(Math.round(p*(cardElements.length-1)),p);
  }
  function request(){
    if(!scheduled)scheduled=requestAnimationFrame(update);
  }
  function layout(){
    if(mobile.matches){
      section.style.removeProperty('height');
      maxDistance=0;
    } else {
      maxDistance=Math.max(0,track.scrollWidth-windowEl.clientWidth);
      const viewport=Math.max(500,window.innerHeight);
      section.style.height=Math.ceil(Math.max(viewport*1.85,maxDistance+viewport*1.03))+'px';
    }
    request();
  }
  function go(delta){
    const index=clamp(active+delta,0,cardElements.length-1);
    if(mobile.matches){
      const card=cardElements[index];
      const left=card.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft||0);
      windowEl.scrollTo({left:Math.max(0,left),behavior:reduced.matches?'instant':'smooth'});
    }else{
      const top=parseFloat(getComputedStyle(sticky).top)||0;
      const travel=Math.max(1,section.offsetHeight-sticky.getBoundingClientRect().height);
      const destination=window.scrollY+section.getBoundingClientRect().top-top+travel*(index/(cardElements.length-1));
      window.scrollTo({top:destination,behavior:reduced.matches?'instant':'smooth'});
    }
  }
  prev.addEventListener('click',()=>go(-1));
  next.addEventListener('click',()=>go(1));
  // Swipe anywhere in the section on mobile, not just on top of photos.
  // Native card swipes remain untouched; horizontal gestures in the heading
  // and white space are forwarded to the gallery without blocking vertical scroll.
  let touch=null;
  section.addEventListener('touchstart',event=>{
    if(!mobile.matches||event.touches.length!==1)return;
    const p=event.touches[0];
    touch={x:p.clientX,y:p.clientY,left:windowEl.scrollLeft,
      native:Boolean(event.target.closest('.cat-window')),horizontal:false};
  },{passive:true});
  section.addEventListener('touchmove',event=>{
    if(!mobile.matches||!touch||touch.native||event.touches.length!==1)return;
    const p=event.touches[0],dx=p.clientX-touch.x,dy=p.clientY-touch.y;
    if(!touch.horizontal){
      if(Math.abs(dy)>Math.abs(dx)*1.15)return;
      if(Math.abs(dx)<9)return;
      touch.horizontal=true;
    }
    event.preventDefault();
    windowEl.scrollLeft=Math.max(0,touch.left-dx);
    request();
  },{passive:false});
  section.addEventListener('touchend',()=>{touch=null},{passive:true});
  section.addEventListener('touchcancel',()=>{touch=null},{passive:true});

  // Desktop: drag left/right across the entire gallery, including empty space.
  // Vertical wheel and link clicks work normally.
  let drag=null,preventClick=false;
  const dragMove=event=>{
    if(!drag)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.active && Math.abs(dx)>9 && Math.abs(dx)>Math.abs(dy)*.9){
      drag.active=true;
      preventClick=true;
      section.classList.add('cat-dragging');
    }
    if(!drag.active)return;
    event.preventDefault();
    const top=parseFloat(getComputedStyle(sticky).top)||0;
    const travel=Math.max(1,section.offsetHeight-sticky.clientHeight);
    const ratio=maxDistance>0?travel/maxDistance:1;
    window.scrollTo({top:drag.top-dx*ratio,behavior:'instant'});
  };
  const dragEnd=()=>{
    if(!drag)return;
    drag=null;
    section.classList.remove('cat-dragging');
    if(preventClick){
      // Suppress only the click generated by an actual drag.
      setTimeout(()=>{preventClick=false},0);
    }
  };
  section.addEventListener('pointerdown',event=>{
    if(mobile.matches||event.pointerType!=='mouse'||event.button!==0||
      event.target.closest('button, input, select')||event.target.closest('.cat-bottom a'))return;
    drag={x:event.clientX,y:event.clientY,top:window.scrollY,active:false};
  });
  window.addEventListener('pointermove',dragMove,{passive:false});
  window.addEventListener('pointerup',dragEnd);
  window.addEventListener('pointercancel',dragEnd);
  section.addEventListener('click',event=>{
    if(!preventClick)return;
    event.preventDefault();event.stopImmediatePropagation();
    preventClick=false;
  },true);
  section.addEventListener('wheel',event=>{
    if(mobile.matches||event.ctrlKey||Math.abs(event.deltaX)<Math.abs(event.deltaY)*1.2)return;
    if(maxDistance<1)return;
    event.preventDefault();
    const travel=Math.max(1,section.offsetHeight-sticky.clientHeight);
    window.scrollBy({top:event.deltaX*travel/maxDistance,behavior:'instant'});
  },{passive:false});

  windowEl.addEventListener('scroll',request,{passive:true});
  window.addEventListener('scroll',request,{passive:true});
  window.addEventListener('resize',layout,{passive:true});
  mobile.addEventListener('change',layout);
  if ('ResizeObserver' in window){
    const observer=new ResizeObserver(layout);
    observer.observe(windowEl);
  }
  // Avoid causing network activity or heavy layout work when off-screen.
  // Native scroll-snap is retained even if JS animations are unavailable.
  layout();
  request();
})();