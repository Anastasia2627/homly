/* HOMLY / 05 Atmosphere.
 * Animations begin when the photograph section enters the viewport.
 * No extra scroll trap; the photo and sticker text reveal independently.
 */
(() => {
  'use strict';
  if(document.body.dataset.page!=='index')return;
  const section=document.getElementById('atmosphere');
  if(!section)return;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion){
    section.dataset.atmosphereRevealed='true';
    return;
  }
  section.classList.add('atm-ready');
  let seen=false;
  function reveal(){
    if(seen)return;
    seen=true;
    section.classList.add('atm-visible');
    section.dataset.atmosphereRevealed='true';
  }
  if(!('IntersectionObserver' in window)){
    reveal();
    return;
  }
  const observer=new IntersectionObserver(entries=>{
    if(entries.some(entry=>entry.isIntersecting)){
      observer.disconnect();
      reveal();
    }
  },{threshold:0.18,rootMargin:'0px 0px -8% 0px'});
  observer.observe(section);
})();