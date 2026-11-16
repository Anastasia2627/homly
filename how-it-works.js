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
    bag: '<svg class="how-icon" viewBox="0 0 260 202" fill="none" aria-hidden="true">' +
      '<path d="M69 112Q59 112 62 123Q50 132 60 144Q52 155 64 164Q59 177 76 178Q82 189 96 182Q108 193 120 184Q135 196 148 185Q162 196 176 184Q191 190 201 177Q216 179 212 162Q223 155 214 144Q223 129 211 121Q214 109 197 108Z" fill="#FFF4C1" stroke="#111" stroke-width="6.2" stroke-linejoin="round"/>' +
      Array.from({length:27},(_,i)=>{const t=Math.PI+(Math.PI*i/26),x=135+64*Math.cos(t),y=113+79*Math.sin(t);return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="7.1" fill="#FFE778" stroke="#111" stroke-width="4.1"/>'}).join('') +
      '<path d="M92 138Q87 126 101 127Q101 115 114 123Q124 115 131 126Q146 124 141 139Q150 151 134 155Q131 169 119 162Q106 169 101 156Q86 154 92 138Z" fill="#111"/><circle cx="118" cy="142" r="8.5" fill="#FFE77D"/>' +
      '<path d="M160 137Q151 126 164 125Q165 113 177 124Q189 120 191 133Q203 139 193 149Q195 161 181 160Q171 170 161 156Q148 155 160 137Z" fill="#111"/><circle cx="177" cy="143" r="7" fill="#FFE77D"/>' +
      '<path d="m42 57 7 17 16 7-16 6-7 17-8-17-17-6 17-7 8-17ZM220 61l5 13 13 5-13 5-5 14-6-14-13-5 13-5 6-13Z" fill="#FFF" stroke="#111" stroke-width="4.4" stroke-linejoin="round"/>' +
      '</svg>',
    gift: '<svg class="how-icon" viewBox="0 0 260 202" fill="none" aria-hidden="true"><rect x="56" y="99" width="157" height="83" rx="5" fill="#FFF" '+stroke+'/><path d="M47 80h175v33H47V80Z" fill="#FFF" '+stroke+'/><path d="M121 80v102M121 80c-40 1-67-25-54-43 14-21 48 12 54 43Zm0 0c9-47 48-60 57-36 9 22-31 37-57 36Z" '+stroke+'/><path d="M141 142c7-12 19-4 13 5-7-7-18 0-11 10l12 13 15-13c11-11-7-21-15-10" fill="#FFF" stroke="#111" stroke-width="5" stroke-linecap="round"/><path d="m215 37 15-17M235 60l19-4M200 24l4-19" '+stroke+'/></svg>'
  };
  const steps = [
    {name:'Обери набір',text:'Знайди те, що надихає — сумку, декор, свічку чи інший DIY-проєкт.',icon:'box',color:'cyan'},
    {name:'Створи власноруч',text:'Крок за кроком слідуй простій інструкції з набору.',icon:'yarn',color:'pink'},
    {name:'Насолоджуйся результатом',text:'Отримай унікальну річ, створену твоїми руками.',icon:'bag',color:'yellow'},
    {name:'Ділися натхненням',text:'Подаруй набір близьким або поділися своїм результатом у соцмережах.',icon:'gift',color:'lilac'}
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
      '<div class="how-note" data-reveal="right"><p>Простий і приємний процес,<br>який дарує результат своїми руками.</p>' +
      '<svg class="how-note-arrow" viewBox="0 0 180 105" fill="none" aria-hidden="true"><path d="M157 12c-55-29-79 41-40 37 28-2 4-48-37-15C51 56 64 87 17 88m0 0 21-17M17 88l25 9" stroke="#B00057" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
    '</div><div class="how-rail" aria-label="Чотири кроки HOMLY">'+cardMarkup+'</div></div>';
  hero.insertAdjacentElement('afterend',section);
  if (typeof observeReveals === 'function') observeReveals(section);
  else section.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('is-visible'));
})();