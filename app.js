'use strict';
const P=[
 {id:'bag',name:'Сумка Pearl',category:'beads',cat:'Бусини',price:749,img:'https://i.etsystatic.com/33729757/c/1200/1200/0/429/il/cc0320/4820061867/il_800x800.4820061867_ndy9.jpg',tint:'#d8e1fb',tag:'01',short:'Сумка, яку зробиш сама.'},
 {id:'cat',name:'Картина «Котик»',category:'textile',cat:'Вишивка',price:699,img:'https://i5.walmartimages.com/seo/DIY-Punch-Needle-Kits-Orange-Cute-Cat-Easy-for-Beginners-Punch-Needle-Embroidery-Set-with-Hoop-Stamped-Pattern-for-Craft-lovers-and-Home-Decor-1_f8063093-f7bc-4581-b872-38875d1f9d5f.428ada91176dc7768800b92420d7402f.jpeg',tint:'#f5d9e6',tag:'02',short:'Трішки затишку власноруч.'},
 {id:'snow',name:'Сніжна куля',category:'decor',cat:'Декор',price:599,img:'https://cdn11.bigcommerce.com/s-wlxogf0z1g/images/stencil/1280x1280/products/3444/23929/35385__06574.1757603264.jpg?c=1&imbypass=on',tint:'#d7f4ea',tag:'03',short:'Твій маленький світ.'},
 {id:'candles',name:'Свічки «Квіти»',category:'candles',cat:'Свічки',price:549,img:'https://i.etsystatic.com/28550412/r/il/7accdf/6945050189/il_fullxfull.6945050189_i555.jpg',tint:'#f8e8cf',tag:'04',short:'Тепло, яке створила ти.'}
];
const CATS=[{id:'beads',name:'Бусини',bg:'#AAB8E9',img:'https://i.etsystatic.com/33729757/c/1200/1200/0/429/il/cc0320/4820061867/il_800x800.4820061867_ndy9.jpg'},{id:'textile',name:'Вишивка',bg:'#ffcfdd',img:'https://i5.walmartimages.com/seo/DIY-Punch-Needle-Kits-Orange-Cute-Cat-Easy-for-Beginners-Punch-Needle-Embroidery-Set-with-Hoop-Stamped-Pattern-for-Craft-lovers-and-Home-Decor-1_f8063093-f7bc-4581-b872-38875d1f9d5f.428ada91176dc7768800b92420d7402f.jpeg'},{id:'decor',name:'Декор',bg:'#ccebe3',img:'https://cdn11.bigcommerce.com/s-wlxogf0z1g/images/stencil/1280x1280/products/3444/23929/35385__06574.1757603264.jpg?c=1&imbypass=on'},{id:'candles',name:'Свічки',bg:'#ffe2b9',img:'https://i.etsystatic.com/28550412/r/il/7accdf/6945050189/il_fullxfull.6945050189_i555.jpg'}];
const path=(document.body.dataset.page||'index');
const qs=new URLSearchParams(location.search);
const fmt=n=>new Intl.NumberFormat('uk-UA').format(n)+' грн';
const safeStore=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
let cart=safeStore('homly_cart',{}),favorites=safeStore('homly_favorites',[]);
const icons={
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.9 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
 bag:'<path d="M5 9h14l1 12H4L5 9z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
 arrow:'<path d="M5 18 18 5M7 5h11v11"/>',
 right:'<path d="M4 12h16M14 6l6 6-6 6"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[name]||'')+'</svg>'}
function save(){try{localStorage.setItem('homly_cart',JSON.stringify(cart));localStorage.setItem('homly_favorites',JSON.stringify(favorites))}catch{}}
function count(){return Object.values(cart).reduce((a,b)=>a+b,0)}
function counts(){document.querySelectorAll('[data-cart-count]').forEach(el=>{el.textContent=count();el.hidden=count()===0});document.querySelectorAll('[data-fav-count]').forEach(el=>{el.textContent=favorites.length;el.hidden=favorites.length===0})}
function notify(msg){const e=document.querySelector('.toast');if(!e)return;e.textContent=msg;e.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>e.classList.remove('show'),2200)}
function header(){return '<div class="announcement">HOMLY — ТВОРЧІ НАБОРИ ДЛЯ ТЕБЕ ♡</div><header class="site-header"><div class="wrap header-inner">'+
'<a href="index.html" class="logo" aria-label="HOMLY — головна"><img src="assets/logo.svg" alt="HOMLY"></a>'+
'<nav class="nav" id="mobile-nav" aria-label="Основна навігація">'+
'<a href="catalog.html" class="'+(path==='catalog'?'active':'')+'">Набори</a>'+
'<a href="catalog.html#categories">Категорії</a>'+
'<a href="about.html" class="'+(path==='about'?'active':'')+'">Про HOMLY</a></nav>'+
'<div class="header-actions">'+
'<a class="icon-btn" href="favorites.html" aria-label="Улюблене">'+icon('heart')+'<span class="counter" data-fav-count>0</span></a>'+
'<a class="icon-btn" href="cart.html" aria-label="Кошик">'+icon('bag')+'<span class="counter" data-cart-count>0</span></a>'+
'<button class="icon-btn mobile-menu" type="button" id="menu-toggle" aria-controls="mobile-nav" aria-expanded="false" aria-label="Відкрити меню">'+icon('menu')+'</button></div></div></header>'}
function footer(){return '<footer class="footer"><div class="wrap"><div class="footer-main"><div>'+
'<a href="index.html" class="logo"><img src="assets/logo.svg" alt="HOMLY"></a><p class="footer-caption">Для твоїх творчих вечорів.</p>'+
'</div><div class="footer-links"><p class="footer-title">Магазин</p><a href="catalog.html">Усі набори</a><a href="favorites.html">Улюблене</a><a href="cart.html">Кошик</a></div>'+
'<div class="footer-links"><p class="footer-title">HOMLY</p><a href="about.html">Про бренд</a><a href="contacts.html">Контакти</a></div></div>'+
'<div class="footer-bottom"><span>© HOMLY · 2026</span><span>Зроблено в Україні ♡</span><a href="#top">Нагору ↑</a></div></div></footer>'}
function button(text,href,light){return '<a class="btn'+(light?' btn-light':'')+'" href="'+href+'">'+text+icon('arrow')+'</a>'}
function productCard(p){const liked=favorites.includes(p.id);return '<article class="product-card reveal">'+
'<div class="product-image" style="--tint:'+p.tint+'"><a href="product.html?id='+p.id+'"><img src="'+p.img+'" alt="'+p.name+'" loading="lazy"></a>'+
'<button class="heart-btn'+(liked?' liked':'')+'" data-fav="'+p.id+'" aria-label="'+(liked?'Прибрати з улюбленого: ':'Додати до улюбленого: ')+p.name+'" aria-pressed="'+liked+'">'+icon('heart')+'</button>'+
'<button class="quick-add" data-add="'+p.id+'" aria-label="Додати '+p.name+' до кошика">+</button></div>'+
'<div class="product-meta"><div><h3><a href="product.html?id='+p.id+'">'+p.name+'</a></h3><p>'+p.cat+'</p></div><b class="price">'+fmt(p.price)+'</b></div></article>'}
function sectionHead(index,title,aside){return '<div class="wrap section-head reveal"><div><div class="tiny">'+index+'</div><h2>'+title+'</h2></div><div class="section-aside">'+(aside||'')+'</div></div>'}
function home(){return '<main class="page-main" id="top">'+
'<section class="hero"><div class="hero-back"></div><div class="wrap"><div class="hero-copy"><span class="eyebrow">HOMLY / CREATIVE KITS</span>'+
'<h1><span class="line"><span>Твори.</span></span><span class="line"><span>Грай.</span></span><span class="line"><span>Повторюй.</span></span></h1>'+
'<p class="hero-description">DIY-набори для тих, хто любить робити своє.</p>'+button('Обрати набір','catalog.html')+'</div>'+
'<div class="hero-side" id="hero-side"><div class="hero-blob"></div><img class="hero-photo" src="https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=1050&q=85" alt="Матеріали для творчого набору HOMLY"><img class="hero-detail" src="https://i.etsystatic.com/33729757/c/1200/1200/0/429/il/cc0320/4820061867/il_800x800.4820061867_ndy9.jpg" alt="Сумка з намистин"><span class="hero-label">made by you ♡</span></div></div>'+
'<div class="hero-footer"><span>СТВОРЮЙ У СВОЄМУ РИТМІ</span><span>ГОРТАЙ НИЖЧЕ ↓</span></div></section>'+
'<div class="ticker"><div class="ticker-track">'+Array(4).fill('<span>ТВОРИ</span><span class="star">✦</span><span>ГРАЙ</span><span class="star">✦</span><span>ДАРУЙ</span><span class="star">✦</span>').join('')+'</div></div>'+
'<section class="category-section section" id="categories">'+sectionHead('01 / З ЧОГО ПОЧНЕМО?','ОБИРАЙ <span style="color:var(--berry)">СВОЄ.</span>','<div class="rail-buttons"><button type="button" class="circle-arrow" data-rail="-1" aria-label="Попередні категорії">←</button><button type="button" class="circle-arrow" data-rail="1" aria-label="Наступні категорії">→</button></div>')+
'<div class="category-rail" id="category-rail">'+CATS.map((c,i)=>'<a class="category-card" href="catalog.html?category='+c.id+'" style="--bg:'+c.bg+'"><span class="num">0'+(i+1)+' / 04</span><img src="'+c.img+'" alt="'+c.name+'" loading="lazy"><h3>'+c.name+' ↗</h3></a>').join('')+'</div></section>'+
'<section class="motion-section" id="motion"><div class="motion-stage" data-scene="0" id="motion-stage"><div class="motion-inner">'+
'<div class="motion-text"><span class="motion-step" id="motion-step">01 / 03</span><h2 class="motion-title" id="motion-title">ХОЧУ.</h2><p class="motion-description" id="motion-description">Обери те, що давно хотіла спробувати.</p></div>'+
'<div class="motion-image" id="motion-image"><img id="motion-img" src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1000&q=85" alt="Коробка з матеріалами для творчості"></div>'+
'<div class="motion-control"><button type="button" class="active" data-scene-button="0" aria-label="Крок 1">01</button><button type="button" data-scene-button="1" aria-label="Крок 2">02</button><button type="button" data-scene-button="2" aria-label="Крок 3">03</button></div></div><div class="progress-line" id="motion-progress"></div></div></section>'+
'<section class="bestsellers section" id="bestsellers">'+sectionHead('02 / УЛЮБЛЕНЕ','Бестселери','<a class="text-link" href="catalog.html">Усі набори '+icon('right')+'</a>')+
'<div class="wrap products-grid stagger">'+P.map(productCard).join('')+'</div></section>'+
'<div class="chess" aria-hidden="true"></div>'+
'<section class="reason"><div class="wrap reason-layout"><div class="reason-copy reveal"><span class="eyebrow">03 / НАВІЩО HOMLY?</span>'+
'<h2>Не треба<br><span>вміти.</span><br>Спробуй.</h2>'+
'<div class="reason-minis"><div><strong>Усе в коробці</strong><small>Матеріали й інструкція</small></div><div><strong>Для себе</strong><small>Час без поспіху</small></div><div><strong>Є результат</strong><small>Твоя готова річ</small></div></div></div>'+
'<div class="reason-photo reveal"><img src="https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&w=950&q=85" alt="Процес створення рукоділля" loading="lazy"></div></div></section>'+
'<section class="cta-section"><div class="wrap cta-layout"><div class="cta-photo reveal"><img src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1000&q=85" alt="Набір творчих матеріалів" loading="lazy"></div>'+
'<div class="reveal"><span class="eyebrow">HOMLY / MAKE SOMETHING</span><h2>Зроби<br><span>своє.</span></h2>'+button('До наборів','catalog.html','light')+'</div></div></section>'+
'</main>'}
function pageHero(label,title,desc){return '<section class="page-hero"><div class="wrap"><span class="eyebrow">'+label+'</span><h1>'+title+'</h1>'+(desc?'<p>'+desc+'</p>':'')+'</div></section>'}
function catalog(){return '<main class="page-main" id="top">'+pageHero('HOMLY / SHOP','Набори','Обери, що хочеш створити.')+
'<div class="wrap catalog-body" id="categories"><div class="filters" id="filters">'+[['all','Усі'],['beads','Бусини'],['textile','Вишивка'],['decor','Декор'],['candles','Свічки']].map(c=>'<button class="pill" type="button" data-filter="'+c[0]+'">'+c[1]+'</button>').join('')+'</div>'+
'<div class="catalog-toolbar"><input id="search" type="search" placeholder="Знайти набір..." aria-label="Пошук за назвою"><select id="sort" aria-label="Сортування"><option value="default">За замовчуванням</option><option value="cheap">Спочатку дешевші</option><option value="expensive">Спочатку дорожчі</option></select></div>'+
'<div class="products-grid" id="catalog-grid"></div><p class="muted" style="margin-top:30px">Фото та ціни — для демонстрації дизайну.</p></div></main>'}
function product(){const p=P.find(x=>x.id===qs.get('id'))||P[0];window.currentProduct=p;return '<main class="page-main" id="top"><div class="wrap product-page"><div class="breadcrumb"><a href="catalog.html">Набори</a> / '+p.name+'</div>'+
'<div class="detail-grid"><div class="detail-photo" style="background:'+p.tint+'"><img src="'+p.img+'" alt="'+p.name+'"></div><div class="detail-info"><span class="eyebrow">HOMLY / '+p.cat+'</span>'+
'<h1>'+p.name+'</h1><p class="detail-description">'+p.short+'</p><strong class="detail-price">'+fmt(p.price)+'</strong>'+
'<div class="detail-actions"><div class="qty"><button type="button" data-detail-qty="-1" aria-label="Мінус">−</button><span id="detail-count">1</span><button type="button" data-detail-qty="1" aria-label="Плюс">+</button></div>'+
'<button type="button" class="btn" data-detail-add="'+p.id+'">До кошика '+icon('right')+'</button><button type="button" class="icon-btn" data-fav="'+p.id+'" aria-label="Улюблене">'+icon('heart')+'</button></div>'+
'<div class="accordions"><details open><summary>Що це?</summary><p>Демонстраційна концепція набору для творчості. Реальний склад та комплектацію уточнимо перед запуском продажів.</p></details>'+
'<details><summary>Доставка й оплата</summary><p>Оформлення та оплата поки не підключені. Це прототип магазину.</p></details></div></div></div></div></main>'}
function cartPage(){return '<main class="page-main" id="top">'+pageHero('HOMLY / YOUR BAG','Кошик','')+'<div class="wrap section" id="cart-content"></div></main>'}
function favoritesPage(){return '<main class="page-main" id="top">'+pageHero('HOMLY / SAVED','Улюблене','Твої збережені набори.')+'<div class="wrap section" id="favorites-content"></div></main>'}
function about(){return '<main class="page-main" id="top">'+pageHero('HOMLY / ABOUT','Просто твори.','')+
'<section class="wrap about-grid"><div class="reveal"><span class="eyebrow">НЕ ДЛЯ ІДЕАЛУ. ДЛЯ ЗАДОВОЛЕННЯ.</span><h2>Маленьке<br>«я зробила».</h2><p>HOMLY — набори, з якими хочеться спробувати щось нове. Без складних планів. Просто відкривай коробку й починай.</p>'+button('Обрати набір','catalog.html')+'</div>'+
'<img class="reveal" src="https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=1050&q=85" alt="Творчий набір HOMLY"></section></main>'}
function contacts(){return '<main class="page-main" id="top">'+pageHero('HOMLY / HELLO','Привіт!','')+
'<section class="wrap contact-grid"><div><h2>Маєш питання?</h2><p>Контактні канали HOMLY додамо сюди перед запуском магазину.</p><p class="muted">Поки це дизайнерський прототип — повідомлення й замовлення не надсилаються.</p></div>'+
'<div class="contact-card"><span class="eyebrow">КОРОТКО ПРО ГОЛОВНЕ</span><details open><summary>Чи можна замовити набір?</summary><p>Поки ні. Кошик працює для демонстрації, а оплата ще не підключена.</p></details>'+
'<details><summary>Чи підходить початківцям?</summary><p>Ми плануємо набори, з якими буде комфортно знайомитися з новими техніками.</p></details>'+
'<details><summary>Де подивитися набори?</summary><p><a href="catalog.html" class="text-link">У каталозі ↗</a></p></details></div></section></main>'}
function page(){switch(path){case 'catalog':return catalog();case 'product':return product();case 'cart':return cartPage();case 'favorites':return favoritesPage();case 'about':return about();case 'contacts':return contacts();default:return home()}}
function app(){document.getElementById('app').innerHTML=header()+page()+footer()+'<div class="toast" role="status" aria-live="polite"></div>';counts();init();if(path==='catalog')drawCatalog();if(path==='cart')drawCart();if(path==='favorites')drawFavorites()}
function init(){const menu=document.getElementById('menu-toggle');menu?.addEventListener('click',()=>{const open=document.getElementById('mobile-nav').classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрити меню':'Відкрити меню')});
 document.addEventListener('click',clickHandler);
 document.getElementById('search')?.addEventListener('input',drawCatalog);
 document.getElementById('sort')?.addEventListener('change',drawCatalog);
 if(path==='catalog'){const cat=qs.get('category');window.activeCat=CATS.some(x=>x.id===cat)?cat:'all';setActiveFilters()}
 document.querySelectorAll('[data-rail]').forEach(btn=>btn.addEventListener('click',()=>document.getElementById('category-rail')?.scrollBy({left:Number(btn.dataset.rail)*375,behavior:'smooth'})));
 const media=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(!media.matches){setupReveals();setupHeroMotion();setupScenes()}else{document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'));setupScenes(true)}setupImageFallback();setupPolish()
}
function clickHandler(e){const add=e.target.closest('[data-add]');if(add){addCart(add.dataset.add,1);return}
const fav=e.target.closest('[data-fav]');if(fav){toggleFav(fav.dataset.fav);return}
const filter=e.target.closest('[data-filter]');if(filter){window.activeCat=filter.dataset.filter;setActiveFilters();drawCatalog();return}
const qty=e.target.closest('[data-cart-qty]');if(qty){const id=qty.dataset.cartQty;cart[id]=Math.max(0,(cart[id]||0)+Number(qty.dataset.delta));if(!cart[id])delete cart[id];save();counts();drawCart();return}
const del=e.target.closest('[data-remove]');if(del){delete cart[del.dataset.remove];save();counts();drawCart();return}
const detail=e.target.closest('[data-detail-qty]');if(detail){const node=document.getElementById('detail-count');node.textContent=Math.max(1,Math.min(20,Number(node.textContent)+Number(detail.dataset.detailQty)));return}
const detailAdd=e.target.closest('[data-detail-add]');if(detailAdd){addCart(detailAdd.dataset.detailAdd,Number(document.getElementById('detail-count').textContent));return}
const sceneBtn=e.target.closest('[data-scene-button]');if(sceneBtn){jumpScene(Number(sceneBtn.dataset.sceneButton));return}}
function addCart(id,n){if(!P.some(p=>p.id===id))return;cart[id]=(cart[id]||0)+n;save();counts();notify('Додано до кошика ♡')}
function toggleFav(id){if(favorites.includes(id)){favorites=favorites.filter(x=>x!==id);notify('Прибрано з улюбленого')}else{favorites.push(id);notify('Збережено в улюбленому ♡')}save();counts();document.querySelectorAll('[data-fav="'+id+'"]').forEach(el=>{const is=favorites.includes(id);el.classList.toggle('liked',is);el.setAttribute('aria-pressed',String(is))});if(path==='favorites')drawFavorites()}
function setActiveFilters(){document.querySelectorAll('[data-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===(window.activeCat||'all')))}
function drawCatalog(){const root=document.getElementById('catalog-grid');if(!root)return;let a=P.filter(p=>(!window.activeCat||window.activeCat==='all'||p.category===window.activeCat));const q=(document.getElementById('search').value||'').toLocaleLowerCase('uk');if(q)a=a.filter(p=>(p.name+' '+p.cat).toLocaleLowerCase('uk').includes(q));const sort=document.getElementById('sort').value;if(sort==='cheap')a.sort((a,b)=>a.price-b.price);if(sort==='expensive')a.sort((a,b)=>b.price-a.price);root.innerHTML=a.length?a.map(productCard).join(''):'<div class="empty"><h2>Нічого не знайшли.</h2><p>Спробуй іншу категорію.</p></div>';setupReveals()}
function drawFavorites(){const root=document.getElementById('favorites-content');if(!root)return;const a=P.filter(p=>favorites.includes(p.id));root.innerHTML=a.length?'<div class="products-grid">'+a.map(productCard).join('')+'</div>':'<div class="empty"><h2>Поки порожньо ♡</h2><p>Зберігай набори, які сподобалися.</p>'+button('Дивитися набори','catalog.html')+'</div>';setupReveals()}
function drawCart(){const root=document.getElementById('cart-content');if(!root)return;const a=P.filter(p=>cart[p.id]>0);if(!a.length){root.innerHTML='<div class="empty"><h2>Кошик чекає на тебе.</h2>'+button('Обрати набір','catalog.html')+'</div>';return}
root.innerHTML='<div class="cart-list">'+a.map(p=>'<div class="cart-row"><a href="product.html?id='+p.id+'"><img src="'+p.img+'" alt="'+p.name+'"></a><div><h3><a href="product.html?id='+p.id+'">'+p.name+'</a></h3><div class="qty"><button type="button" data-cart-qty="'+p.id+'" data-delta="-1" aria-label="Зменшити">−</button><span>'+cart[p.id]+'</span><button type="button" data-cart-qty="'+p.id+'" data-delta="1" aria-label="Збільшити">+</button></div><button type="button" class="remove" data-remove="'+p.id+'">Прибрати</button></div><strong class="price">'+fmt(cart[p.id]*p.price)+'</strong></div>').join('')+'</div>'+
'<div class="cart-total"><span>Разом</span><strong>'+fmt(a.reduce((s,p)=>s+cart[p.id]*p.price,0))+'</strong></div><div class="cart-steps"><p class="muted">Демоверсія: оформлення замовлень та оплата поки недоступні.</p><button type="button" class="btn" id="checkout-demo">Оформлення скоро '+icon('right')+'</button></div>';
document.getElementById('checkout-demo')?.addEventListener('click',()=>notify('Оплата поки не підключена'))}
let observer;
function setupReveals(){if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible'));return}observer=observer||new IntersectionObserver(entries=>{entries.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');observer.unobserve(x.target)}})},{threshold:.07,rootMargin:'0px 0px -25px 0px'});document.querySelectorAll('.reveal:not([data-observed])').forEach((e,i)=>{e.dataset.observed='1';e.style.setProperty('--i',i%4);observer.observe(e)})}
function setupHeroMotion(){const side=document.getElementById('hero-side');if(!side||!matchMedia('(pointer:fine)').matches)return;side.addEventListener('pointermove',e=>{const b=side.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;side.style.setProperty('--px',(x*23).toFixed(1)+'px');side.style.setProperty('--py',(y*18).toFixed(1)+'px')});side.addEventListener('pointerleave',()=>{side.style.setProperty('--px','0px');side.style.setProperty('--py','0px')})}
const SCENES=[{title:'ХОЧУ.',desc:'Обери те, що давно хотіла спробувати.',img:'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1000&q=85',alt:'Творча коробка HOMLY'},{title:'РОБЛЮ.',desc:'Увімкни музику. Далі — твоя черга.',img:'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&w=950&q=85',alt:'Процес рукоділля'},{title:'МОЄ.',desc:'Зроблено власноруч. І це найкраще.',img:'https://i.etsystatic.com/33729757/c/1200/1200/0/429/il/cc0320/4820061867/il_800x800.4820061867_ndy9.jpg',alt:'Готова сумка з намистин'}];
let currentScene=0,scrollScene=null,sceneTimer;
function activateScene(i){const stage=document.getElementById('motion-stage');if(!stage||i===currentScene)return;currentScene=i;stage.dataset.scene=i;document.getElementById('motion-step').textContent='0'+(i+1)+' / 03';document.getElementById('motion-title').textContent=SCENES[i].title;document.getElementById('motion-description').textContent=SCENES[i].desc;const frame=document.getElementById('motion-image');frame.classList.add('swap');clearTimeout(sceneTimer);sceneTimer=setTimeout(()=>{const img=document.getElementById('motion-img');img.src=SCENES[i].img;img.alt=SCENES[i].alt;frame.classList.remove('swap')},165);document.querySelectorAll('[data-scene-button]').forEach((b,n)=>b.classList.toggle('active',n===i))}
function jumpScene(i){const section=document.getElementById('motion');if(!section)return;const headerHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header'))||69;const duration=Math.max(1,section.offsetHeight-innerHeight+headerHeight),top=section.getBoundingClientRect().top+scrollY;window.scrollTo({top:top+duration*(i+.35)/3,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
function setupScenes(reduced){const section=document.getElementById('motion');if(!section)return;SCENES.forEach(s=>{const im=new Image();im.src=s.img});let tick=false;const update=()=>{tick=false;const rect=section.getBoundingClientRect();const headerHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header'))||69;const total=Math.max(1,rect.height-innerHeight+headerHeight);const progress=Math.min(1,Math.max(0,-rect.top/total));const n=Math.min(2,Math.floor(progress*3));activateScene(n);document.getElementById('motion-progress').style.setProperty('--progress',(progress*100).toFixed(1)+'%')};const onScroll=()=>{if(!tick){tick=true;requestAnimationFrame(update)}};addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll,{passive:true});update()}

function setupImageFallback(){
  document.addEventListener('error',event=>{
    const img=event.target;
    if(!(img instanceof HTMLImageElement)||img.dataset.fallbackApplied)return;
    img.dataset.fallbackApplied='true';
    const label=(img.alt||'HOMLY').slice(0,38);
    const text=label.replace(/[&<>"']/g,'');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 680"><rect width="680" height="680" fill="#EDEAF3"/><circle cx="520" cy="120" r="170" fill="#AAB8E9"/><circle cx="40" cy="570" r="230" fill="#f5cbda"/><text x="52" y="330" font-size="91" font-family="Arial,sans-serif" font-weight="900" fill="#A8174E">HOMLY</text><text x="55" y="382" font-size="28" font-family="Arial,sans-serif" fill="#21191f">'+text+'</text></svg>';
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  },true);
}
function setupPolish(){
  const header=document.querySelector('.site-header');
  let scheduled=false;
  const update=()=>{
    scheduled=false;
    header?.classList.toggle('is-scrolled',scrollY>36);
    const hero=document.getElementById('hero-side');
    if(hero&&matchMedia('(prefers-reduced-motion: no-preference)').matches){
      const rect=hero.getBoundingClientRect();
      if(rect.bottom>0&&rect.top<innerHeight)hero.style.setProperty('--scroll-float',Math.max(-42,Math.min(56,-rect.top*.09)).toFixed(1)+'px');
    }
  };
  addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});
  update();
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-add], [data-detail-add]')){
      const badge=document.querySelector('[data-cart-count]');
      if(badge&&!matchMedia('(prefers-reduced-motion: reduce)').matches)badge.animate([{transform:'scale(1)'},{transform:'scale(1.65)'},{transform:'scale(1)'}],{duration:320,easing:'ease-out'});
    }
  });
}

app();
