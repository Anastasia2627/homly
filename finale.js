/* HOMLY / 06 — finale reveal and living product.
 * No scroll trap. Product uses the already optimized hero bag WebP.
 * Gentle motion is active only while the final screen is visible.
 */
(() => {
  'use strict';
  if(document.body.dataset.page!=='index')return;
  const section=document.getElementById('final');
  if(!section)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const product=section.querySelector('.finale-product');
  const picture=section.querySelector('.finale-product img');
  section.dataset.finaleReady='true';
  if(reduce){
    section.dataset.finaleRevealed='true';
    return;
  }
  section.classList.add('finale-ready');
  let seen=false;
  let idleDelay=null;
  const start=()=>{
    if(seen)return;
    seen=true;
    section.classList.add('finale-visible');
    section.dataset.finaleRevealed='true';
    // Wait until the entrance transform has settled to avoid a jump.
    idleDelay=setTimeout(()=>{
      if(section.classList.contains('finale-in-viewport')) product.classList.add('finale-idle');
    },2050);
  };
  if(!('IntersectionObserver' in window)){
    section.classList.add('finale-in-viewport');
    start();
    return;
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.isIntersecting){
        section.classList.add('finale-in-viewport');
        start();
        if(seen&&!idleDelay)product.classList.add('finale-idle');
      }else{
        section.classList.remove('finale-in-viewport');
        product.classList.remove('finale-idle');
      }
    }
  },{threshold:0.18,rootMargin:'0px 0px -4% 0px'});
  observer.observe(section);

  // Tiny desktop pointer response for the photo, independent of scroll.
  // Never causes layout recalculation or interferes with the catalogue CTA.
  const fine=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(fine&&picture){
    section.addEventListener('pointermove',event=>{
      if(!section.classList.contains('finale-in-viewport'))return;
      const r=section.getBoundingClientRect();
      const x=(event.clientX-r.left)/Math.max(1,r.width)-.5;
      const y=(event.clientY-r.top)/Math.max(1,r.height)-.5;
      picture.style.setProperty('--final-tilt-x',(x*13).toFixed(2)+'px');
      picture.style.setProperty('--final-tilt-y',(y*11).toFixed(2)+'px');
    },{passive:true});
    section.addEventListener('pointerleave',()=>{
      picture.style.setProperty('--final-tilt-x','0px');
      picture.style.setProperty('--final-tilt-y','0px');
    });
  }
})();