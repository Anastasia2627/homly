/* HOMLY — unmistakable motion on the first screen + scroll */
(() => {
  'use strict';
  const hero=document.querySelector('.wow-hero');
  const showcase=document.getElementById('wow-showcase');
  const photo=document.getElementById('showcase-photo');
  const title=document.getElementById('showcase-title');
  const number=document.getElementById('showcase-number');
  const frame=showcase?.querySelector('.showcase-img-wrap');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!showcase||!photo||!title||!number||typeof P==='undefined')return;

  let index=0, switching=false, autoplay, dragStart=null;
  const loadImage=(src)=>{const img=new Image();img.src=src;return img};
  P.forEach(p=>loadImage(p.img));
  function show(next) {
    if(switching)return;
    const value=(next+P.length)%P.length;
    if(value===index)return;
    switching=true;
    frame.classList.add('is-switching');
    title.classList.add('is-switching');
    setTimeout(()=>{
      index=value;
      photo.src=P[index].img;
      photo.alt=P[index].name;
      title.textContent=P[index].name;
      number.textContent=String(index+1).padStart(2,'0')+' / '+String(P.length).padStart(2,'0');
      frame.classList.remove('is-switching');
      title.classList.remove('is-switching');
      switching=false;
    },340);
  }
  const reset=()=>{clearInterval(autoplay);if(!reduced)autoplay=setInterval(()=>show(index+1),3500)};
  document.querySelectorAll('[data-showcase-dir]').forEach(btn=>btn.addEventListener('click',()=>{show(index+Number(btn.dataset.showcaseDir));reset()}));
  showcase.addEventListener('pointerenter',()=>{clearInterval(autoplay)});
  showcase.addEventListener('pointerleave',()=>{reset();showcase.style.setProperty('--showcase-x','0px');showcase.style.setProperty('--showcase-y','0px')});
  showcase.addEventListener('pointerdown',e=>{dragStart={x:e.clientX,y:e.clientY};});
  showcase.addEventListener('pointerup',e=>{
    if(dragStart&&Math.abs(e.clientX-dragStart.x)>45){show(index+(e.clientX<dragStart.x?1:-1));reset()}
    dragStart=null;
  });
  if(!reduced&&matchMedia('(pointer:fine)').matches){
    showcase.addEventListener('pointermove',e=>{
      const b=showcase.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;
      showcase.style.setProperty('--showcase-x',(x*24).toFixed(1)+'px');
      showcase.style.setProperty('--showcase-y',(y*18).toFixed(1)+'px');
      photo.style.translate=(x*-13).toFixed(1)+'px '+(y*-13).toFixed(1)+'px';
    });
    showcase.addEventListener('pointerleave',()=>{photo.style.translate='0px 0px'});
  }
  reset();
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)clearInterval(autoplay);
    else reset();
  });

  // Animate content each time the active scroll scene changes.
  const heading=document.getElementById('motion-title');
  const stage=document.getElementById('motion-stage');
  if(heading&&stage&&!reduced&&'MutationObserver' in window) {
    const watcher=new MutationObserver(()=>{
      heading.animate([
        {opacity:0,transform:'translateY(42px) rotate(3deg)',filter:'blur(5px)'},
        {opacity:1,transform:'translateY(0) rotate(0)',filter:'blur(0)'}
      ],{duration:650,easing:'cubic-bezier(.16,1,.28,1)'});
      const image=stage.querySelector('.motion-image');
      image?.animate([
        {opacity:.6,translate:'0 32px',scale:.93},
        {opacity:1,translate:'0 0',scale:1}
      ],{duration:800,easing:'cubic-bezier(.18,.9,.28,1)'});
    });
    watcher.observe(heading,{childList:true,characterData:true,subtree:true});
  }

  // Products animate as they enter, even when scrolled quickly.
  if(!reduced&&'IntersectionObserver' in window) {
    const io=new IntersectionObserver(entries=>{
      for(const entry of entries) {
        if(!entry.isIntersecting)continue;
        const el=entry.target;
        el.classList.add('v2-enter');
        io.unobserve(el);
      }
    },{threshold:.08,rootMargin:'0px 0px -25px 0px'});
    document.querySelectorAll('.wow-category-card,.wow-bestsellers .product-card').forEach((el,i)=>{
      el.style.setProperty('--entry-delay',Math.min(i%4*90,270)+'ms');
      io.observe(el);
    });
  }
})();
