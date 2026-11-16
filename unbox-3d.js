/* HOMLY / Interactive unboxing. CSS 3D + scroll-linked movement; no WebGL required. */
(() => {
  'use strict';
  if(document.body.dataset.page!=='index')return;
  const section=document.getElementById('unbox');
  if(!section)return;
  const sampleBag='%D0%A0%D0%BE%D0%B7%D0%BE%D0%B2%D0%B0%D1%8F%20%D1%81%D1%83%D0%BC%D0%BE%D1%87%D0%BA%D0%B0%20%D0%B8%D0%B7%20%D0%B1%D1%83%D1%81%D0%B8%D0%BD%20%D1%81%20%D1%86%D0%B2%D0%B5%D1%82%D0%B0%D0%BC%D0%B8.png';
  const pearls=Array.from({length:30},(_,i)=>{
    const x=(i%6-2.5)*25+(Math.floor(i/6)%2)*8,y=(Math.floor(i/6)-2)*25;
    return '<i class="ub-pearl" style="--x:'+x+'px;--y:'+y+'px"></i>';
  }).join('');

  const copy=[
    ['01 / 04','Починається з коробки.'],
    ['02 / 04','Відкривай — усе вже всередині.'],
    ['03 / 04','Матеріали, інструменти, інструкція.'],
    ['04 / 04','Далі — твоя творчість.']
  ];
  section.innerHTML=[
    '<div class="ub-sticky"><div class="ub-background ub-background-one" aria-hidden="true"></div>',
    '<div class="ub-background ub-background-two" aria-hidden="true"></div>',
    '<div class="wrap ub-layout"><div class="ub-copy">',
    '<span class="ub-overline" data-reveal="up">03 / ЩО В КОРОБЦІ?</span>',
    '<h2 class="ub-heading" data-reveal="up">Відкрий.<br><span>Створюй.</span></h2>',
    '<div class="ub-scenes" aria-live="polite">',
    copy.map((c,i)=>'<div class="ub-scene-text'+(i===0?' is-active':'')+'" data-ub-copy="'+i+'" aria-hidden="'+(i!==0)+'"><span class="ub-scene-counter">'+c[0]+'</span><p>'+c[1]+'</p></div>').join(''),
    '</div><div class="ub-controls"><div class="ub-dots">',
    copy.map((c,i)=>'<button type="button" class="ub-dot'+(i===0?' is-active':'')+'" data-ub-go="'+i+'" aria-label="Етап '+(i+1)+'"'+(i===0?' aria-current="step"':'')+'></button>').join(''),
    '</div><span class="ub-scroll-cue">ГОРТАЙ, ЩОБ ВІДКРИТИ ↓</span></div></div>',
    '<div class="ub-visual" aria-label="Анімація відкриття набору HOMLY"><div class="ub-disc"></div>',
    '<div class="ub-art"><div class="ub-floor-shadow"></div>',
    '<div class="ub-package" aria-hidden="true"><div class="ub-package-depth"></div>',
    '<div class="ub-package-interior"><span>made by you ♡</span></div>',
    '<div class="ub-package-lid"><span class="ub-lid-brand">homly<span>.</span></span><small>make something lovely</small></div>',
    '<div class="ub-package-front"><span>HOMLY / DIY KIT</span><strong>homly.</strong><i>♡</i></div></div>',
    '<div class="ub-object ub-object-pearls"><div class="ub-pearls">'+pearls+'</div><span>НАМИСТИНИ</span></div>',
    '<div class="ub-object ub-object-spool"><div class="ub-spool"><i></i><b></b><em></em></div><span>ЛІСКА</span></div>',
    '<div class="ub-object ub-object-instructions"><div class="ub-sheet"><b>homly.</b><small>LET’S MAKE IT</small><strong>01 — 02 — 03</strong><i></i><em>made with ♡</em></div><span>ІНСТРУКЦІЯ</span></div>',
    '<div class="ub-object ub-object-tool"><svg viewBox="0 0 130 155" fill="none" aria-hidden="true"><path d="M83 28c-9-16-24-19-31-6-8 15 15 26 23 6M77 29 35 118" stroke="#A8174E" stroke-width="13" stroke-linecap="round"/><path d="m36 112-8 25" stroke="#211820" stroke-width="12" stroke-linecap="round"/></svg></div>',
    '<div class="ub-complete"><img src="'+sampleBag+'" alt=""/><span>ЗРОБЛЕНО ТОБОЮ ♡</span></div>',
    '<span class="ub-spark ub-spark-one" aria-hidden="true">✳</span><span class="ub-spark ub-spark-two" aria-hidden="true">✳</span>',
    '</div><span class="ub-footnote">КОНЦЕПТУАЛЬНА ВІЗУАЛІЗАЦІЯ НАБОРУ</span></div></div>',
    '<div class="ub-progress"><span></span></div></div>'
  ].join('');

  if(typeof observeReveals==='function')observeReveals(section);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const texts=[...section.querySelectorAll('[data-ub-copy]')];
  const dots=[...section.querySelectorAll('[data-ub-go]')];
  const objects={
    pearls:section.querySelector('.ub-object-pearls'),
    spool:section.querySelector('.ub-object-spool'),
    instructions:section.querySelector('.ub-object-instructions'),
    tool:section.querySelector('.ub-object-tool'),
    result:section.querySelector('.ub-complete')
  };
  let current=-1,queued=false;
  const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t)};
  const between=(p,a,b)=>smooth((p-a)/(b-a));
  const mix=(a,b,t)=>a+(b-a)*t;
  function phase(index){
    if(current===index)return;
    current=index;
    section.dataset.ubPhase=String(index);
    texts.forEach((el,i)=>{
      const on=i===index;
      el.classList.toggle('is-active',on);
      el.setAttribute('aria-hidden',String(!on));
    });
    dots.forEach((el,i)=>{
      el.classList.toggle('is-active',i===index);
      if(i===index)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
    });
  }
  function floatObject(element,value,x,y,rotation){
    element.style.opacity=String(clamp(value*1.45));
    element.style.transform='translate3d('+mix(0,x,value).toFixed(1)+'px,'+
      mix(83,y,value).toFixed(1)+'px,0) rotate('+mix(0,rotation,value).toFixed(1)+
      'deg) scale('+mix(.62,1,value).toFixed(3)+')';
  }
  function apply(progress){
    const p=clamp(progress);
    const open=between(p,.065,.34),retire=between(p,.75,.96);
    const finish=between(p,.69,.93);
    section.style.setProperty('--ub-lid-angle',(-110*open).toFixed(1)+'deg');
    section.style.setProperty('--ub-open',open.toFixed(3));
    section.style.setProperty('--ub-progress',(p*100).toFixed(1)+'%');
    section.style.setProperty('--ub-retire',(retire*.51).toFixed(3));
    section.style.setProperty('--ub-final',finish.toFixed(3));
    floatObject(objects.pearls,between(p,.28,.52)*(1-retire*.92),-133,-185,-15);
    floatObject(objects.spool,between(p,.33,.58)*(1-retire*.92),149,-153,12);
    floatObject(objects.instructions,between(p,.39,.65)*(1-retire*.95),10,-242,11);
    floatObject(objects.tool,between(p,.43,.67)*(1-retire*.95),225,-230,21);
    objects.result.style.opacity=String(finish);
    objects.result.style.transform='translate3d('+mix(68,0,finish)+'px,'+
      mix(90,-20,finish)+'px,0) scale('+mix(.65,1,finish)+
      ') rotate('+mix(8,-6,finish)+'deg)';
    phase(p<.15?0:p<.39?1:p<.72?2:3);
  }
  function progressForScroll(){
    queued=false;
    const rect=section.getBoundingClientRect();
    const top=innerWidth<=720?68:72;
    const travel=Math.max(1,rect.height-(innerHeight-top));
    apply(clamp((top-rect.top)/travel));
  }
  function request(){if(queued)return;queued=true;requestAnimationFrame(progressForScroll)}
  if(reduced){
    apply(.63);
    section.dataset.ubReduced='true';
    return;
  }
  addEventListener('scroll',request,{passive:true});
  addEventListener('resize',request,{passive:true});
  dots.forEach(b=>b.addEventListener('click',()=>{
    const step=Number(b.dataset.ubGo);
    const top=innerWidth<=720?68:72;
    const travel=Math.max(1,section.offsetHeight-(innerHeight-top));
    const sectionTop=section.getBoundingClientRect().top+scrollY;
    const checkpoints=[.03,.25,.55,.91];
    scrollTo({top:sectionTop-top+travel*checkpoints[step],behavior:'smooth'});
  }));
  progressForScroll();
})();