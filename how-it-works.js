/* HOMLY: colorful four-step section immediately after hero */
(() => {
  'use strict';
  if (document.body.dataset.page !== 'index') return;
  const hero = document.querySelector('.ref-hero');
  if (!hero || document.getElementById('how-it-works')) return;
  const stroke = 'stroke="#111" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    box: '<svg class="how-icon" viewBox="0 0 260 202" fill="none" aria-hidden="true"><path d="M53 88 140 62l68 30-91 28L53 88Z" fill="white" '+stroke+'/><path d="M53 88v65l64 40v-73M117 120v73l91-38V92" fill="white" '+stroke+'/><path d="m53 88-28 37 65 27 27-32M117 120l42 28 71-31-22-25" fill="white" '+stroke+'/><path d="M119 142c7-10 21-2 13 8l-15 15-15-16c-9-12 6-18 14-7Z" fill="#111"/><path d="m69 51-13-19M120 39l-2-26M166 48l18-22" '+stroke+'/></svg>',
    yarn: '<svg class="how-icon" viewBox="0 0 260 202" fill="none" aria-hidden="true"><circle cx="92" cy="117" r="67" '+stroke+'/><path d="M45 74c21 11 74 56 95 95M59 62c34 21 69 49 89 84M80 51c33 17 65 43 77 72M37 110c35-8 81-34 108-30M43 143c32-6 63-24 89-43M71 177c27-12 52-33 77-45" stroke="#111" stroke-width="5.5" stroke-linecap="round"/><path d="m204 26 12 7-55 92-14 9-6-14 55-94a8 8 0 0 1 8 0Z" fill="white" '+stroke+'/><path d="M210 28c17-11 20-24 5-21" '+stroke+'/><path d="M130 185c34 17 45-11 60-8 9 1 12 17 19 9 6-6 7-19 20-13 8 4 0 19-20 27" stroke="#111" stroke-width="5" stroke-linecap="round"/></svg>',
    bag: '<svg class="how-icon" viewBox="0 0 260 202" fill="none" aria-hidden="true"><path d="M79 94c-4-35 11-76 48-76s51 41 47 76" '+stroke+' stroke-width="9"/><path d="M67 89c0-14 10-23 23-23h72c14 0 24 11 24 24l13 79c2 14-8 23-22 23H75c-15 0-25-11-22-26L67 89Z" fill="#FFF9D8" '+stroke+'/><path d="M106 112c-14-15-25 4-10 15-15-5-25 14-7 19-14 10 3 26 16 17 1 18 23 18 26 0 16 7 27-12 13-21 15-9 3-26-11-21 4-17-20-22-27-9Z" fill="#111"/><circle cx="119" cy="138" r="11" fill="#FFE779"/><path d="M154 121c-9-12-20 0-11 9-13-2-15 13-3 17-9 8 4 19 12 11 2 12 18 11 19-1 12 5 20-8 10-16 10-7 0-21-10-14 1-12-14-17-17-6Z" fill="#111"/><circle cx="161" cy="140" r="7" fill="#FFE779"/><path d="m38 51 7 15 15 7-15 7-7 15-7-15-15-7 15-7 7-15ZM218 67l6 13 13 6-13 6-6 13-6-13-13-6 13-6 6-13Z" fill="#FFF" stroke="#111" stroke-width="5"/></svg>',
    gift: '<svg class="how-icon" viewBox="0 0 260 202" fill="none" aria-hidden="true"><rect x="56" y="99" width="157" height="83" rx="5" fill="#FFF" '+stroke+'/><path d="M47 80h175v33H47V80Z" fill="#FFF" '+stroke+'/><path d="M121 80v102M121 80c-40 1-67-25-54-43 14-21 48 12 54 43Zm0 0c9-47 48-60 57-36 9 22-31 37-57 36Z" '+stroke+'/><path d="M141 142c7-12 19-4 13 5-7-7-18 0-11 10l12 13 15-13c11-11-7-21-15-10" fill="#FFF" stroke="#111" stroke-width="5" stroke-linecap="round"/><path d="m215 37 15-17M235 60l19-4M200 24l4-19" '+stroke+'/></svg>'
  };
  const steps = [
    {name:'Обери набір',text:'Сумка, декор чи свічка — бери те, що надихає.',icon:'box',color:'cyan'},
    {name:'Створи власноруч',text:'У коробці вже є все. Вмикай музику й твори.',icon:'yarn',color:'pink'},
    {name:'Насолоджуйся результатом',text:'Унікальна річ, яку зробила саме ти.',icon:'bag',color:'yellow'},
    {name:'Ділися натхненням',text:'Залиш собі або подаруй близьким.',icon:'gift',color:'lilac'}
  ];
  const cardMarkup = steps.map((step,i) =>
    '<div class="how-card-entry" data-reveal="up" style="--delay:'+(i*90)+'ms">' +
    '<article class="how-card how-card-'+step.color+'">' +
    '<span class="how-number">Крок '+(i+1)+'</span>'+icons[step.icon]+
    '<h3>'+step.name+'</h3><p>'+step.text+'</p></article></div>'
  ).join('');
  const section = document.createElement('section');
  section.className = 'how-section';
  section.id = 'how-it-works';
  section.setAttribute('aria-labelledby','how-title');
  section.innerHTML =
    '<div class="how-blob how-blob-left" aria-hidden="true"></div><div class="how-blob how-blob-right" aria-hidden="true"></div>' +
    '<div class="wrap"><div class="how-intro">' +
      '<div class="how-heading">' +
        '<span class="how-pill" data-reveal="up">Як це працює?</span>' +
        '<div class="how-title-row"><h2 id="how-title" data-reveal="up">Від ідеї до готового<br>творіння</h2>' +
        '<svg class="how-title-marks" viewBox="0 0 70 75" fill="none" aria-hidden="true"><path d="M16 16 37 3M20 40 48 39M16 57 33 74" stroke="#B00057" stroke-width="8" stroke-linecap="round"/></svg></div>' +
      '</div>' +
      '<div class="how-note" data-reveal="right"><p>Чотири кроки —<br>і річ, зроблена тобою.</p>' +
      '<svg class="how-note-arrow" viewBox="0 0 180 105" fill="none" aria-hidden="true"><path d="M157 12c-55-29-79 41-40 37 28-2 4-48-37-15C51 56 64 87 17 88m0 0 21-17M17 88l25 9" stroke="#B00057" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
    '</div><div class="how-rail" aria-label="Чотири кроки HOMLY">'+cardMarkup+'</div></div>';
  hero.insertAdjacentElement('afterend',section);
  if (typeof observeReveals === 'function') observeReveals(section);
  else section.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('is-visible'));
})();