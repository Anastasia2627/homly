const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const pages = ['index','catalog','product','favorites','cart','about','contacts'];

for (const name of pages) assert.ok(fs.existsSync(path.join(root, name + '.html')), 'Missing page ' + name);
assert.ok(fs.existsSync(path.join(root, 'assets/logo.svg')), 'Missing HOMLY logo');

function render(page, search='') {
  const elements = Object.create(null);
  const el = (id) => elements[id] || (elements[id] = {innerHTML:'',value:'',style:{},addEventListener(){}});
  el('sort').value = 'default';
  const document = {
    body:{dataset:{page}},
    getElementById(id) {
      if (['app','search','sort','catalog-grid','cart-content','favorites-content'].includes(id)) return el(id);
      return null;
    },
    querySelectorAll(){return []},
    querySelector(){return null},
    addEventListener(){}
  };
  const ctx = {
    document,
    window:{matchMedia:()=>({matches:true})},
    location:{search},
    localStorage:{getItem:()=>null,setItem(){}},
    matchMedia:()=>({matches:true}),
    addEventListener(){},
    scrollY:0,innerWidth:1280,innerHeight:800,
    requestAnimationFrame(){},
    getComputedStyle:()=>({getPropertyValue:()=> '69'}),
    Image:class {},
    URLSearchParams,
    setTimeout(){return 1},
    clearTimeout(){},
    console
  };
  vm.runInNewContext(appJs,ctx,{filename:'app.js',timeout:3000});
  return elements;
}

for(const name of pages){
  const page=render(name);
  const markup=page.app.innerHTML;
  assert.match(markup,/<main\b/,'Missing main on '+name);
  assert.match(markup,/<header\b/,'Missing header on '+name);
  assert.match(markup,/<footer\b/,'Missing footer on '+name);
  for(const link of markup.matchAll(/href="([a-z]+\.html)(?:\?[^"]+)?"/g)) {
    assert.ok(fs.existsSync(path.join(root,link[1])),'Broken internal link '+link[1]+' on '+name);
  }
  console.log('✓ '+name);
}
const catalog=render('catalog');
assert.equal((catalog['catalog-grid'].innerHTML.match(/class="product-card/g)||[]).length,4,'Catalog should show all products');
const bag=render('catalog','?category=beads');
assert.equal((bag['catalog-grid'].innerHTML.match(/class="product-card/g)||[]).length,1,'Filtered catalog should show one bead kit');
const detail=render('product','?id=bag');
assert.match(detail.app.innerHTML,/Сумка Pearl/);
const favorite=render('favorites');
assert.match(favorite['favorites-content'].innerHTML,/Поки порожньо/);
const cart=render('cart');
assert.match(cart['cart-content'].innerHTML,/Кошик чекає/);
console.log('✓ catalog filtering, product detail and empty states');
