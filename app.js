'use strict';
const PRODUCTS = [
  {id:'bag',name:'Сумка Pearl',category:'beads',type:'Бусини',price:749,photo:'assets/bag.webp',shade:'#d6dffa',desc:'Сумочка з намистин. Зроби її власноруч.'},
  {id:'cat',name:'Картина «Котик»',category:'textile',type:'Вишивка',price:699,photo:'assets/cat.webp',shade:'#f1dbe9',desc:'Затишна картина в техніці punch needle.'},
  {id:'candles',name:'Свічки «Квіти»',category:'candles',type:'Свічки',price:549,photo:'assets/candles.webp',shade:'#ffe2d5',desc:'Маленькі свічки для особливих вечорів.'},
  {id:'snow',name:'Сніжна куля',category:'decor',type:'Декор',price:599,photo:'assets/snow.webp',shade:'#d5ece9',desc:'Створи маленьку зимову історію.'}
];
const CATEGORIES=[{id:'all',name:'Усі набори'},{id:'beads',name:'Бусини'},{id:'textile',name:'Вишивка'},{id:'candles',name:'Свічки'},{id:'decor',name:'Декор'}];
const page=document.body.dataset.page||'index';
const params=new URLSearchParams(location.search);
function stored(key,def){try{const value=JSON.parse(localStorage.getItem(key));return value??def}catch{return def}}
let cart=stored('homly_cart',{}), favorites=stored('homly_favorites',[]), detailQty=1;
if(!cart||typeof cart!=='object'||Array.isArray(cart))cart={};
if(!Array.isArray(favorites))favorites=[];
const price=n=>new Intl.NumberFormat('uk-UA').format(n)+' грн';
const icon={heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.9 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',bag:'<path d="M5 9h14l1 12H4L5 9zM9 9V6a3 3 0 0 1 6 0v3"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',plus:'<path d="M5 12h14M12 5v14"/>',check:'<path d="m4 12 5 5L20 6"/>'};
const svg=n=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon[n]}</svg>`;
function save(){try{localStorage.setItem('homly_cart',JSON.stringify(cart));localStorage.setItem('homly_favorites',JSON.stringify(favorites))}catch{}}
function count(){return Object.values(cart).reduce((a,b)=>a+(Number(b)||0),0)}
function refreshCounts(){document.querySelectorAll('[data-cart-count]').forEach(el=>{el.textContent=count();el.hidden=!count()});document.querySelectorAll('[data-fav-count]').forEach(el=>{el.textContent=favorites.length;el.hidden=!favorites.length})}
function toast(message){const e=document.getElementById('toast');if(!e)return;e.textContent=message;e.classList.add('visible');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('visible'),2200)}
function btn(text,url,light=false){return `<a class="btn ${light?'btn--light':''}" href="${url}">${text}<span class="btn-icon">${svg('arrow')}</span></a>`}
function header(){return `<div class="notice"><span>ЗРОБЛЕНО ДЛЯ ТВОРЧИХ ВЕЧОРІВ</span><span>HOMLY · UKRAINE</span></div><header class="header" id="header"><div class="wrap nav-layout"><a class="logo" href="index.html" aria-label="HOMLY — головна"><img src="assets/logo.png" alt="HOMLY" /></a><nav id="nav" class="nav" aria-label="Навігація"><a href="catalog.html" class="${page==='catalog'?'active':''}">Набори</a><a href="catalog.html#categories">Категорії</a><a href="about.html">Про HOMLY</a>${page==='index'?'<a class="ref-nav-shop" href="catalog.html">Обрати набір ↗</a>':''}</nav><div class="nav-actions"><a class="icon-btn" href="favorites.html" aria-label="Улюблене">${svg('heart')}<span class="count" data-fav-count hidden>0</span></a><a class="icon-btn" href="cart.html" aria-label="Кошик">${svg('bag')}<span class="count" data-cart-count hidden>0</span></a><button class="icon-btn menu-btn" type="button" id="menu-btn" aria-expanded="false" aria-controls="nav" aria-label="Меню">${svg('menu')}</button></div></div></header>`}
function footer(){return `<footer class="footer"><div class="wrap"><div class="footer-top"><div><a href="index.html" class="footer-logo"><img src="assets/logo.png" alt="HOMLY" /></a><div class="footer-phrase">Творчість — це твоє.</div></div><div class="footer-nav"><a href="catalog.html">Набори</a><a href="about.html">Про нас</a><a href="contacts.html">Контакти</a><a href="favorites.html">Улюблене</a></div></div><div class="footer-bottom"><span>© HOMLY 2026</span><span>Зроблено з любов’ю в Україні</span><a href="#top">Нагору ↑</a></div></div></footer>`}
function productCard(p,index=0){const liked=favorites.includes(p.id);return `<article class="product-card" data-reveal="up" style="--delay:${Math.min(index,4)*75}ms"><a class="product-photo" href="product.html?id=${p.id}" style="--shade:${p.shade}"><img src="${p.photo}" alt="${p.name}" loading="lazy"/><span class="product-photo-cta">Дивитись ${svg('arrow')}</span></a><button class="heart" type="button" aria-label="${liked?'Прибрати з улюбленого':'Додати в улюблене'}: ${p.name}" aria-pressed="${liked}" data-fav="${p.id}">${svg('heart')}</button><div class="product-info"><div><span class="product-type">${p.type}</span><h3><a href="product.html?id=${p.id}">${p.name}</a></h3></div><div class="product-purchase"><span>${price(p.price)}</span><button type="button" data-add="${p.id}" aria-label="Додати ${p.name} до кошика">${svg('plus')}</button></div></div></article>`}
function home(){return `<main id="top" class="home">
<section class="hero ref-hero" aria-label="Творчі набори HOMLY">
<svg class="ref-hero-top-decoration" viewBox="0 0 1440 230" preserveAspectRatio="none" aria-hidden="true">
 <path d="M0 0H365C414 44 424 106 380 149C304 220 193 212 112 193C58 179 25 186 0 213Z" fill="#F7C8DF"/>
 <path d="M295 0H610C565 91 513 159 417 178C345 193 272 176 214 153C322 119 359 47 295 0Z" fill="#A8174E"/>
</svg>
<svg class="ref-hero-waves" viewBox="0 0 1440 820" preserveAspectRatio="none" aria-hidden="true">
 <path d="M0 820C128 729 224 717 340 759C476 805 519 641 626 625C742 608 753 428 894 400C1019 376 1048 449 1159 382C1252 326 1325 296 1440 350V820Z" fill="#F5BCD9" opacity=".76"/>
 <path d="M0 820C129 782 252 827 346 800C449 768 484 763 582 744C684 726 729 652 840 691C943 727 993 785 1117 799C1255 814 1344 747 1440 723V820Z" fill="#A8174E"/>
 <path d="M0 820C224 760 294 812 467 784C597 757 674 781 779 784C926 787 1056 832 1189 791C1292 761 1361 745 1440 753V820Z" fill="#E7A2CC" opacity=".68"/>
</svg>
<div class="wrap ref-hero-layout">
 <div class="ref-hero-content">
  <h1 class="ref-hero-title" aria-label="Творчі набори — створюй своє">
   <span class="ref-hero-title-line" data-reveal="mask">Творчі набори</span>
   <span class="ref-hero-title-line" data-reveal="mask" style="--delay:125ms">створюй своє.</span>
  </h1>
  <div class="ref-hero-intro" data-reveal="up" style="--delay:220ms">
   <p>DIY-набори, з якими легко створювати особливі речі власноруч.</p>
   ${btn('Обрати набір','catalog.html')}
  </div>
 </div>
 <div class="ref-hero-product">
  <img class="ref-hero-bag" src="%D0%A0%D0%BE%D0%B7%D0%BE%D0%B2%D0%B0%D1%8F%20%D1%81%D1%83%D0%BC%D0%BE%D1%87%D0%BA%D0%B0%20%D0%B8%D0%B7%20%D0%B1%D1%83%D1%81%D0%B8%D0%BD%20%D1%81%20%D1%86%D0%B2%D0%B5%D1%82%D0%B0%D0%BC%D0%B8.png" alt="Рожева сумочка з намистин із малиновими квітами" fetchpriority="high"/>
  <span class="ref-hero-bag-shadow" aria-hidden="true"></span>
  <svg class="ref-bag-rays" width="102" height="102" viewBox="0 0 102 102" fill="none" aria-hidden="true"><path d="M20 43L7 26M47 29V5M73 38L94 22" stroke="#A8174E" stroke-width="7" stroke-linecap="round"/></svg>
 </div>
</div></section>
<section class="unbox-experience" id="unbox" aria-label="03 / Що в коробці HOMLY"></section>
<section class="category-showcase" id="categories-home" aria-labelledby="categories-title"></section>
<section class="atmosphere-section" id="atmosphere" aria-labelledby="atmosphere-title">
 <img class="atmosphere-photo" src="35345324.png" loading="lazy" decoding="async" alt="Атмосферне фото HOMLY">
 <div class="atmosphere-overlay" aria-hidden="true"></div>
 <div class="atmosphere-noise" aria-hidden="true"></div>
 <div class="wrap atmosphere-layout">
  <span class="atmosphere-kicker" style="--enter-delay:40ms">05 / АТМОСФЕРА HOMLY</span>
  <h2 class="atmosphere-heading" id="atmosphere-title">
   <span style="--enter-delay:130ms">Твій час.</span>
   <span style="--enter-delay:240ms">Твої руки.</span>
   <span style="--enter-delay:350ms"><em>Твоє творіння.</em></span>
  </h2>
  <p class="atmosphere-copy" style="--enter-delay:440ms">Трохи часу для себе — і щось особливе, зроблене власноруч</p>
  <div class="atmosphere-stickers" aria-label="Настрій HOMLY">
   <span class="atmosphere-sticker atmosphere-sticker--a" style="--enter-delay:500ms">Час для себе</span>
   <span class="atmosphere-sticker atmosphere-sticker--b" style="--enter-delay:650ms">Твори без поспіху</span>
   <span class="atmosphere-sticker atmosphere-sticker--c" style="--enter-delay:800ms">У своєму ритмі</span>
   <span class="atmosphere-sticker atmosphere-sticker--d" style="--enter-delay:950ms">Радість у процесі</span>
   <span class="atmosphere-sticker atmosphere-sticker--e" style="--enter-delay:1100ms">Зроблено тобою ♡</span>
  </div>
  <div class="atmosphere-bottom" style="--enter-delay:1250ms">
   <span>МАЛЕНЬКІ РЕЧІ. ОСОБЛИВІ ВЕЧОРИ</span>
   <a href="catalog.html">Знайти свій набір <span aria-hidden="true">↗</span></a>
  </div>
 </div>
</section>
<section class="best" id="best"><div class="wrap"><div class="section-top" data-reveal="up"><span class="section-index">06 / БЕСТСЕЛЕРИ</span><h2>БЕСТСЕЛЕРИ.</h2><a class="text-link" href="catalog.html">Всі набори ${svg('arrow')}</a></div><div class="product-grid">${PRODUCTS.map(productCard).join('')}</div></div></section>
<section class="final-cta"><div class="wrap final-inner"><div class="final-words" data-reveal="left"><span class="section-index">ТВІЙ ВЕЧІР. ТВОЇ ПРАВИЛА.</span><h2>НУ ЩО,<br><em>ПОТВОРИМО?</em></h2>${btn('Знайти свій набір','catalog.html',true)}</div><div class="final-photo" data-reveal="scale"><img src="assets/cat.webp" alt="Картина ручної роботи" loading="lazy"></div></div></section>
</main>`}
function pageHero(kicker,title,detail=''){return `<section class="subhero"><div class="wrap"><span class="section-index" data-reveal="up">${kicker}</span><h1 data-reveal="mask">${title}</h1>${detail?`<p data-reveal="up">${detail}</p>`:''}</div></section>`}
function catalog(){return `<main id="top">${pageHero('HOMLY / НАБОРИ','ТВОЇ НАБОРИ.','Обери, що хочеш зробити.')}
<section class="catalog-content wrap" id="categories"><div class="catalog-controls" data-reveal="up"><div class="pills" id="filters">${CATEGORIES.map(c=>`<button type="button" class="pill" data-filter="${c.id}">${c.name}</button>`).join('')}</div><div class="catalog-tools"><input type="search" id="search" placeholder="Знайти набір" aria-label="Пошук наборів"/><select id="sort" aria-label="Сортувати"><option value="default">За замовчуванням</option><option value="cheap">Від дешевших</option><option value="expensive">Від дорожчих</option></select></div></div><div class="product-grid" id="catalog-grid"></div></section></main>`}
function product(){const p=PRODUCTS.find(x=>x.id===params.get('id'))||PRODUCTS[0];return `<main id="top"><section class="wrap product-detail"><div class="breadcrumb" data-reveal="up"><a href="catalog.html">Набори</a> / ${p.name}</div><div class="detail-layout"><div class="detail-visual" data-reveal="scale"><img src="${p.photo}" alt="${p.name}" /></div><div class="detail-copy" data-reveal="right"><div class="section-index">HOMLY / ${p.type}</div><h1>${p.name}</h1><p>${p.desc}</p><div class="detail-price">${price(p.price)}</div><div class="detail-actions"><div class="counter-control"><button type="button" data-detail-qty="-1" aria-label="Зменшити кількість">−</button><span id="detail-qty">1</span><button type="button" data-detail-qty="1" aria-label="Збільшити кількість">+</button></div><button type="button" class="btn" data-detail-add="${p.id}">До кошика ${svg('arrow')}</button></div><div class="detail-accordion"><details open><summary>Що в наборі?</summary><p>Перелік матеріалів і точні характеристики додамо після затвердження комплектації.</p></details><details><summary>Доставка та оплата</summary><p>Онлайн-замовлення поки не підключені.</p></details></div></div></div></section><section class="related wrap"><div class="section-top" data-reveal="up"><span class="section-index">БІЛЬШЕ ІДЕЙ</span><h2>ЩЕ ЩОСЬ?</h2></div><div class="product-grid">${PRODUCTS.filter(x=>x.id!==p.id).slice(0,3).map(productCard).join('')}</div></section></main>`}
function favoritesPage(){return `<main id="top">${pageHero('HOMLY / SAVED','УЛЮБЛЕНЕ.')}<section class="wrap list-page" id="favorites-content"></section></main>`}
function cartPage(){return `<main id="top">${pageHero('HOMLY / YOUR BAG','КОШИК.')}<section class="wrap list-page" id="cart-content"></section></main>`}
function about(){return `<main id="top">${pageHero('HOMLY / ABOUT','МИ — HOMLY.')}<section class="wrap about-layout"><div data-reveal="left"><h2>ТВОЯ ІДЕЯ.<br><span>ТВОЇ РУКИ.</span></h2><p>HOMLY — набори для маленьких творчих перемог. Усе, що потрібно для нового захоплення, в одній коробці.</p>${btn('Дивитись набори','catalog.html')}</div><div class="about-photo" data-reveal="scale"><img src="assets/box.webp" alt="Матеріали для творчості HOMLY" /></div></section><section class="about-quote" data-reveal="up"><div class="wrap"><p>НЕ ТРЕБА ІДЕАЛЬНО.<br>ТРЕБА <span>ЗАЛЮБКИ.</span></p></div></section></main>`}
function contacts(){return `<main id="top">${pageHero('HOMLY / CONTACTS','НА ЗВ’ЯЗКУ.')}<section class="wrap contacts-layout"><div data-reveal="left"><h2>ПРИВІТ! ♡</h2><p>Готуємо HOMLY до запуску. Тут з’являться офіційні контакти та відповіді на питання про замовлення.</p></div><div class="contact-faq" data-reveal="right"><details open><summary>Чи можна вже замовити?</summary><p>Сайт поки демонструє дизайн і функції магазину. Оформлення замовлень додамо перед запуском.</p></details><details><summary>А якщо я новачок?</summary><p>Ми підбираємо набори так, щоб було цікаво починати з нуля.</p></details></div></section></main>`}
function render(){const routes={index:home,catalog,product,favorites:favoritesPage,cart:cartPage,about,contacts};document.getElementById('app').innerHTML=header()+(routes[page]||home)()+footer()+'<div id="toast" class="toast" role="status" aria-live="polite"></div>';refreshCounts();init();if(page==='catalog')renderCatalog();if(page==='favorites')renderFavorites();if(page==='cart')renderCart()}
function bindEvents(){document.addEventListener('click',ev=>{const el=ev.target;const f=el.closest('[data-fav]');if(f){toggleFav(f.dataset.fav);return}const add=el.closest('[data-add]');if(add){addCart(add.dataset.add,1);return}const detail=el.closest('[data-detail-add]');if(detail){addCart(detail.dataset.detailAdd,detailQty);return}const qty=el.closest('[data-detail-qty]');if(qty){detailQty=Math.max(1,Math.min(20,detailQty+Number(qty.dataset.detailQty)));document.getElementById('detail-qty').textContent=detailQty;return}const q=el.closest('[data-qty]');if(q){const id=q.dataset.qty;cart[id]=Math.max(0,(Number(cart[id])||0)+Number(q.dataset.delta));if(!cart[id])delete cart[id];save();refreshCounts();renderCart();return}const rm=el.closest('[data-remove]');if(rm){delete cart[rm.dataset.remove];save();refreshCounts();renderCart();return}const filter=el.closest('[data-filter]');if(filter){activeCategory=filter.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===filter));renderCatalog()}});const menu=document.getElementById('menu-btn');menu?.addEventListener('click',()=>{const opened=document.getElementById('nav').classList.toggle('open');menu.setAttribute('aria-expanded',String(opened));menu.setAttribute('aria-label',opened?'Закрити меню':'Меню')});document.getElementById('search')?.addEventListener('input',renderCatalog);document.getElementById('sort')?.addEventListener('change',renderCatalog)}
function addCart(id,quantity=1){if(!PRODUCTS.some(p=>p.id===id))return;cart[id]=(Number(cart[id])||0)+quantity;save();refreshCounts();toast('У кошику ♡')}
function toggleFav(id){favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];save();refreshCounts();document.querySelectorAll(`[data-fav="${id}"]`).forEach(btn=>{const yes=favorites.includes(id);btn.setAttribute('aria-pressed',String(yes));btn.setAttribute('aria-label',`${yes?'Прибрати з улюбленого':'Додати в улюблене'}`)});if(page==='favorites')renderFavorites();else toast(favorites.includes(id)?'Збережено ♡':'Прибрано з улюбленого')}
let activeCategory=CATEGORIES.some(c=>c.id===params.get('category'))?params.get('category'):'all';
function renderCatalog(){const root=document.getElementById('catalog-grid');if(!root)return;const search=(document.getElementById('search')?.value||'').toLocaleLowerCase('uk');const sort=document.getElementById('sort')?.value;let list=PRODUCTS.filter(p=>(activeCategory==='all'||p.category===activeCategory)&&(p.name+' '+p.type).toLocaleLowerCase('uk').includes(search));if(sort==='cheap')list.sort((a,b)=>a.price-b.price);if(sort==='expensive')list.sort((a,b)=>b.price-a.price);root.innerHTML=list.length?list.map(productCard).join(''):'<div class="empty" data-reveal="up"><h2>Нічого не знайшлося.</h2><p>Спробуй іншу категорію.</p></div>';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===activeCategory));observeReveals(root)}
function renderFavorites(){const root=document.getElementById('favorites-content');if(!root)return;const list=PRODUCTS.filter(p=>favorites.includes(p.id));root.innerHTML=list.length?`<div class="product-grid">${list.map(productCard).join('')}</div>`:`<div class="empty" data-reveal="up"><h2>ПОКИ ПУСТО ♡</h2><p>Натискай на сердечко біля набору.</p>${btn('До наборів','catalog.html')}</div>`;observeReveals(root)}
function renderCart(){const root=document.getElementById('cart-content');if(!root)return;const list=PRODUCTS.filter(p=>Number(cart[p.id])>0);if(!list.length){root.innerHTML=`<div class="empty" data-reveal="up"><h2>КОШИК ЧЕКАЄ.</h2><p>Знайди набір, який захочеться спробувати.</p>${btn('Обрати набір','catalog.html')}</div>`;observeReveals(root);return}root.innerHTML=`<div class="cart-list">${list.map(p=>`<div class="cart-row" data-reveal="up"><img src="${p.photo}" alt="${p.name}"/><div><h3>${p.name}</h3><span>${price(p.price)}</span><div class="counter-control"><button type="button" data-qty="${p.id}" data-delta="-1" aria-label="Мінус">−</button><span>${cart[p.id]}</span><button type="button" data-qty="${p.id}" data-delta="1" aria-label="Плюс">+</button></div></div><div class="cart-right"><strong>${price(p.price*Number(cart[p.id]))}</strong><button class="remove" type="button" data-remove="${p.id}">Прибрати</button></div></div>`).join('')}</div><div class="cart-summary" data-reveal="up"><span>Разом</span><strong>${price(list.reduce((s,p)=>s+p.price*Number(cart[p.id]),0))}</strong></div><p class="form-note">Онлайн-оформлення замовлення поки недоступне.</p>`;observeReveals(root)}
function init(){document.documentElement.classList.add('motion-ready');bindEvents();initReveals();initParallax();initImages()}
const prefersReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let revealObserver;
function initReveals(){if(prefersReduced||!('IntersectionObserver' in window)){document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-visible'));return}revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}})},{threshold:0.07,rootMargin:'0px 0px -3% 0px'});observeReveals(document)}
function observeReveals(scope){scope.querySelectorAll('[data-reveal]').forEach(el=>{if(el.dataset.observed)return;el.dataset.observed='1';if(revealObserver)revealObserver.observe(el);else el.classList.add('is-visible')})}
function initParallax(){if(prefersReduced)return;const layer=document.querySelector('.hero-art');if(!layer)return;let scheduled=false;function run(){scheduled=false;const rect=layer.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;const value=(innerHeight*.5-(rect.top+rect.height*.5))/innerHeight;layer.style.setProperty('--parallax',Math.max(-60,Math.min(60,value*70)).toFixed(1)+'px')}addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(run)}},{passive:true});run()}
function initImages(){document.addEventListener('error',e=>{const image=e.target;if(!(image instanceof HTMLImageElement)||image.dataset.errorFallback)return;image.dataset.errorFallback='1';const svg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#EDEAF3"/><text x="55" y="330" font-family="Arial" font-weight="bold" fill="#A8174E" font-size="85">HOMLY</text></svg>';image.src='data:image/svg+xml,'+encodeURIComponent(svg)},true)}
render();