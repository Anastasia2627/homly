/* HOMLY — scroll-driven 3D unboxing with smooth, responsive progression. */
(() => {
  'use strict';
  if(document.body.dataset.page!=='index')return;
  const section=document.getElementById('unbox');
  if(!section)return;
  const BAG='%D0%A0%D0%BE%D0%B7%D0%BE%D0%B2%D0%B0%D1%8F%20%D1%81%D1%83%D0%BC%D0%BE%D1%87%D0%BA%D0%B0%20%D0%B8%D0%B7%20%D0%B1%D1%83%D1%81%D0%B8%D0%BD%20%D1%81%20%D1%86%D0%B2%D0%B5%D1%82%D0%B0%D0%BC%D0%B8.png';
  const copy=[
    ['01 / 04','Усе починається з однієї коробки.'],
    ['02 / 04','Кришка відкривається. Починається магія.'],
    ['03 / 04','Намистини, інструменти та інструкція — усе тут.'],
    ['04 / 04','І ось річ, яку зробила ти.']
  ];
  const stages=['КОРОБКА','ВІДКРИВАЄМО','МАТЕРІАЛИ','РЕЗУЛЬТАТ'];
  const stepMarkup=copy.map((c,i)=>'<div class="ub-copy'+(i===0?' is-current':'')+'" data-ub-text="'+i+'" aria-hidden="'+(i!==0)+'"><span>'+c[0]+'</span><p>'+c[1]+'</p></div>').join('');
  const navMarkup=stages.map((s,i)=>'<div class="ub-step'+(i===0?' is-current':'')+'" data-ub-step="'+i+'"><b>0'+(i+1)+'</b><span>'+s+'</span></div>').join('');
  section.innerHTML=[
   '<div class="ub-pin" id="ub-pin">',
   '<span class="ub-ring ub-ring-outer" aria-hidden="true"></span>',
   '<span class="ub-ring ub-ring-inner" aria-hidden="true"></span>',
   '<div class="wrap ub-grid">',
   '<div class="ub-information">',
   '<span class="ub-kicker">03 / ЩО В КОРОБЦІ?</span>',
   '<h2 class="ub-headline">Відкрий.<br><em>Створюй.</em></h2>',
   '<div class="ub-info-progress" aria-live="polite">'+stepMarkup+'</div>',
   '<p class="ub-tip">ПРОКРУЧУЙ, ЩОБ ВІДКРИТИ ↓</p>',
   '<div class="ub-steplist" aria-label="Етапи розпакування">'+navMarkup+'</div>',
   '</div><div class="ub-showroom"><span class="ub-halo" aria-hidden="true"></span>',
   '<div class="ub-stage"><div class="ub-webgl" id="ub-webgl" aria-label="Об’ємна анімація коробки HOMLY"></div>',
   '<div class="ub-css-fallback" aria-hidden="true">',
   '<div class="ub-fb-box"><div class="ub-fb-back"></div><div class="ub-fb-inside">made by you ♡</div>',
   '<div class="ub-fb-lid">homly.</div><div class="ub-fb-front"><span>DIY KIT / HOMLY</span><strong>homly.</strong><i>♡</i></div></div>',
   '<div class="ub-fb-pearls">● ● ● ● ●<br>● ● ● ● ●<br>● ● ● ● ●</div>',
   '<div class="ub-fb-instructions"><b>homly.</b><small>ІНСТРУКЦІЯ</small><span>01 — 02 — 03</span></div>',
   '</div><div class="ub-finished"><img src="'+BAG+'" alt="" loading="lazy"><span>ЗРОБЛЕНО ТОБОЮ <b>♡</b></span></div>',
   '</div><span class="ub-showroom-note">ІНТЕРАКТИВНА ВІЗУАЛІЗАЦІЯ · HOMLY</span>',
   '</div></div>',
   '</div>'
  ].join('');

  // This interaction is directly controlled by the user's scroll, never autoplayed.
  // Do not freeze at the middle frame when the OS requests reduced motion:
  // that made the entire unboxing permanently static on affected Macs.
  const prefersLessMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.dataset.ubMotionPreference=prefersLessMotion?'reduced':'normal';
  const pin=section.querySelector('.ub-pin');
  const words=[...section.querySelectorAll('[data-ub-text]')];
  const steps=[...section.querySelectorAll('[data-ub-step]')];
  const fallback=section.querySelector('.ub-css-fallback');
  const canvas=section.querySelector('.ub-webgl');
  const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
  const smooth=t=>{const u=clamp(t);return u*u*(3-2*u)};
  // Scroll timeline with breathing room: box, lid, pause, materials,
  // pause, finished kit. More than five viewport heights of travel.
  const keyframes=[[0,0],[.15,.035],[.42,.43],[.50,.43],
    [.78,.77],[.85,.77],[.97,1],[1,1]];
  function mapScroll(value){
    const x=clamp(value);
    for(let i=1;i<keyframes.length;i++){
      const [t1,p1]=keyframes[i];
      if(x<=t1){
        const [t0,p0]=keyframes[i-1];
        return p0+(p1-p0)*smooth((x-t0)/(t1-t0));
      }
    }
    return 1;
  }
  function scrollProgress(){
    const sticky=parseFloat(getComputedStyle(pin).top)||0;
    const rect=section.getBoundingClientRect();
    const travel=Math.max(1,section.offsetHeight-(innerHeight-sticky));
    return clamp((sticky-rect.top)/travel);
  }

  let renderer=null,rendered=0,target=0,activePhase=-1;
  let raf=0,lastFrame=0,loaded=false,loading=false;

  function setCopy(phase){
    if(phase===activePhase)return;
    activePhase=phase;
    section.dataset.ubPhase=String(phase);
    words.forEach((el,i)=>{
      const on=i===phase;
      el.classList.toggle('is-current',on);
      el.setAttribute('aria-hidden',String(!on));
    });
    steps.forEach((el,i)=>el.classList.toggle('is-current',i===phase));
  }

  function paint(progress){
    const p=clamp(progress),open=smooth((p-.035)/.385);
    const items=smooth((p-.345)/.365),finish=smooth((p-.77)/.23);
    rendered=p;
    section.style.setProperty('--ub-lid',(-145*open).toFixed(1)+'deg');
    section.style.setProperty('--ub-open',open.toFixed(3));
    section.style.setProperty('--ub-beads',items.toFixed(3));
    section.style.setProperty('--ub-finale',finish.toFixed(3));
    section.dataset.ubProgress=p.toFixed(4);
    setCopy(p<.22?0:p<.48?1:p<.78?2:3);
    if(renderer)renderer.update(p,performance.now());
  }

  function tick(now){
    raf=0;
    const dt=Math.min(64,Math.max(0,lastFrame?now-lastFrame:16));
    lastFrame=now;
    const delta=target-rendered;
    // Follow the scroll within ~0.2 seconds, without a speed cap.
    // The long pinned section already controls the pace. The previous
    // 0.16/second cap caused several seconds of lag and a frozen-looking
    // box after a trackpad flick.
    const blend=1-Math.exp(-dt/190);
    const next=rendered+delta*blend;
    paint(Math.abs(target-next)<.0008?target:next);
    if(Math.abs(target-rendered)>.0008)raf=requestAnimationFrame(tick);
    else lastFrame=0;
  }
  function sync(){
    target=mapScroll(scrollProgress());
    section.dataset.ubScroll=scrollProgress().toFixed(4);
    if(!raf&&Math.abs(target-rendered)>.0005){
      lastFrame=0;raf=requestAnimationFrame(tick);
    }
  }

  async function loadWebGL(){
    if(loaded||loading)return;
    loading=true;
    try {
      const module=await import('./unbox-webgl.js');
      const view=await module.createUnboxingScene(canvas);
      renderer=view;loaded=true;
      canvas.classList.add('is-ready');
      fallback.classList.add('is-hidden');
      section.dataset.ubEngine='webgl';
      renderer.update(rendered,performance.now());
    } catch(error){
      section.dataset.ubEngine='css-fallback';
      console.info('HOMLY: WebGL not available; CSS 3D fallback remains.',error);
    } finally {loading=false}
  }

  // Always start with a closed box, including reduced-motion preferences.
  // Decorative idle movement is disabled separately in the renderer.
  paint(0);
  sync();
  addEventListener('scroll',sync,{passive:true});
  addEventListener('resize',()=>{
    if(renderer)renderer.resize();
    sync();
  },{passive:true});
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        loadWebGL();
        observer.disconnect();
      }
    },{rootMargin:'900px 0px 900px 0px',threshold:0});
    observer.observe(section);
  }else loadWebGL();
})();