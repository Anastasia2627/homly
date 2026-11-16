/* HOMLY — unboxing v2. Autoplay on entering, rewind/replay/scrub controls. */
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
  const navMarkup=stages.map((s,i)=>'<button class="ub-step'+(i===0?' is-current':'')+'" type="button" data-ub-step="'+i+'" aria-label="Етап '+(i+1)+': '+s+'"><b>0'+(i+1)+'</b><span>'+s+'</span></button>').join('');
  section.innerHTML=[
   '<div class="ub-pin" id="ub-pin">',
   '<span class="ub-ring ub-ring-outer" aria-hidden="true"></span>',
   '<span class="ub-ring ub-ring-inner" aria-hidden="true"></span>',
   '<div class="wrap ub-grid">',
   '<div class="ub-information">',
   '<span class="ub-kicker">03 / ЩО В КОРОБЦІ?</span>',
   '<h2 class="ub-headline">Відкрий.<br><em>Створюй.</em></h2>',
   '<div class="ub-info-progress" aria-live="polite">'+stepMarkup+'</div>',
   '<div class="ub-actions">',
   '<button type="button" class="ub-play" id="ub-play" aria-label="Повторити анімацію розпакування"><span class="ub-play-icon">↻</span> Відкрити ще раз</button>',
   '<span class="ub-tip">АБО ГОРТАЙ ВНИЗ ↓</span>',
   '</div><div class="ub-steplist" aria-label="Етапи розпакування">'+navMarkup+'</div>',
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
   '<div class="ub-scrub"><label for="ub-range">КЕРУЙ АНІМАЦІЄЮ</label>',
   '<input type="range" id="ub-range" min="0" max="100" value="0" step="1" aria-label="Прокрутка розпакування">',
   '<span id="ub-percentage">0%</span></div>',
   '<div class="ub-bottom-progress" aria-hidden="true"><span></span></div></div>'
  ].join('');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pin=section.querySelector('.ub-pin');
  const btn=section.querySelector('.ub-play');
  const range=section.querySelector('#ub-range');
  const percent=section.querySelector('#ub-percentage');
  const words=[...section.querySelectorAll('[data-ub-text]')];
  const steps=[...section.querySelectorAll('[data-ub-step]')];
  const fallback=section.querySelector('.ub-css-fallback');
  let renderer=null,progress=0,phase=-1,playing=false,started=false,frame=0,begin=0,userControlled=false;
  const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t)};
  const checkpoints=[.02,.29,.60,.93];

  function setPhase(next){
    if(next===phase)return;
    phase=next;section.dataset.ubPhase=String(next);
    words.forEach((el,i)=>{const on=i===next;el.classList.toggle('is-current',on);el.setAttribute('aria-hidden',String(!on))});
    steps.forEach((el,i)=>el.classList.toggle('is-current',i===next));
  }
  function draw(value){
    const p=clamp(value);progress=p;
    const open=smooth((p-.025)/.355);
    const items=smooth((p-.32)/.30);
    const finish=smooth((p-.74)/.23);
    section.style.setProperty('--ub-progress',(p*100).toFixed(1)+'%');
    section.style.setProperty('--ub-lid',(-145*open).toFixed(1)+'deg');
    section.style.setProperty('--ub-open',open.toFixed(3));
    section.style.setProperty('--ub-beads',items.toFixed(3));
    section.style.setProperty('--ub-finale',finish.toFixed(3));
    range.value=String(Math.round(p*100));percent.textContent=Math.round(p*100)+'%';
    setPhase(p<.22?0:p<.48?1:p<.78?2:3);
    if(renderer)renderer.update(p,performance.now());
  }
  function stop(){
    if(frame)cancelAnimationFrame(frame);
    frame=0;playing=false;section.classList.remove('ub-playing');
  }
  function play(){
    if(reduced)return;
    stop();userControlled=false;playing=true;started=true;
    section.dataset.ubStarted='true';section.classList.add('ub-playing');begin=performance.now();
    draw(0);
    const duration=4800;
    function tick(now){
      if(!playing)return;
      const t=clamp((now-begin)/duration);
      const eased=t;
      draw(eased);
      if(t<1)frame=requestAnimationFrame(tick);
      else{playing=false;section.classList.remove('ub-playing');frame=0;}
    }
    frame=requestAnimationFrame(tick);
  }
  function scrollFraction(){
    const r=section.getBoundingClientRect();
    const header=innerWidth<=720?68:72;
    return clamp((header-r.top)/Math.max(1,r.height-(innerHeight-header)));
  }
  function syncScroll(){if(userControlled&&!playing)draw(scrollFraction())}
  function userWheel(){if(!playing)return;stop();userControlled=true;syncScroll()}
  btn.addEventListener('click',play);
  range.addEventListener('input',()=>{stop();started=true;userControlled=false;draw(Number(range.value)/100)});
  range.addEventListener('pointerdown',stop);
  steps.forEach(step=>step.addEventListener('click',()=>{stop();started=true;userControlled=false;draw(checkpoints[Number(step.dataset.ubStep)])}));
  section.addEventListener('wheel',userWheel,{passive:true});
  section.addEventListener('touchmove',userWheel,{passive:true});
  addEventListener('scroll',syncScroll,{passive:true});
  addEventListener('resize',()=>{if(renderer)renderer.resize();syncScroll()},{passive:true});
  if(!reduced&&'IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{
      if(!started&&entries.some(e=>e.isIntersecting)){io.disconnect();play()}
    },{threshold:.16,rootMargin:'0px 0px -9% 0px'});
    io.observe(pin);
  }else if(!reduced){
    const onScroll=()=>{if(!started&&pin.getBoundingClientRect().top<innerHeight*.8)play()};
    addEventListener('scroll',onScroll,{passive:true});onScroll();
  }
  if(reduced){section.classList.add('ub-reduced');draw(.59);btn.disabled=true}else draw(0);
  import('./unbox-webgl.js').then(async mod=>{
    renderer=await mod.createUnboxingScene(section.querySelector('#ub-webgl'));
    section.querySelector('.ub-webgl').classList.add('is-ready');
    fallback.classList.add('is-hidden');
    section.dataset.ubEngine='webgl';
    renderer.update(progress,performance.now());
  }).catch(error=>{
    section.dataset.ubEngine='css-fallback';
    console.info('HOMLY: WebGL unavailable; animated CSS fallback enabled.',error);
  });
})();