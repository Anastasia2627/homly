// Offline HOMLY storefront regressions. No network or real product data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const full=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const js=full.replace(/\nrender\(\);\s*$/, '');
assert.ok(!js.endsWith('render();'),'the test harness must not boot the UI');
const catalog={innerHTML:'',classList:{add(){},remove(){}},querySelectorAll(){return []}};
const controls={hidden:false};
const storage=new Map();
const document={
 body:{dataset:{page:'catalog'}},
 documentElement:{classList:{add(){}},dataset:{}},
 getElementById(id){return id==='catalog-grid'?catalog:null},
 querySelector(sel){return sel==='.catalog-controls'?controls:null},
 querySelectorAll(){return []}
};
const window={HOMLY_CONFIG:{paymentsEnabled:false},dispatchEvent(){},HOMLY_TRACK(){}};
const runner=new Function('window','document','localStorage','location','matchMedia',
 js+'\nreturn {renderCatalog,PRODUCTS};');
const model=runner(window,document,{
 getItem:key=>storage.get(key)??null,
 setItem:(key,value)=>storage.set(key,value)
},{search:''},()=>({matches:true}));
model.renderCatalog();
assert.match(catalog.innerHTML,/Скоро тут буде з чого обрати/);
assert.equal((catalog.innerHTML.match(/Ідея майбутнього набору/g)||[]).length,4);
assert.doesNotMatch(catalog.innerHTML,/749 грн|data-add=|Оплатити замовлення/);
// Category links on the animated homepage must show only their own concept.
const categoryDocument={
 ...document,
 getElementById(id){return id==='catalog-grid'?catalog:null}
};
const categoryWindow={...window};
const categoryModel=runner(categoryWindow,categoryDocument,{
 getItem(){return null},setItem(){}
},{search:'?category=beads'},()=>({matches:true}));
categoryModel.renderCatalog();
assert.equal((catalog.innerHTML.match(/Ідея майбутнього набору/g)||[]).length,1);
assert.match(catalog.innerHTML,/Сумки з намистин/);
assert.doesNotMatch(catalog.innerHTML,/Свічки власноруч/);
model.renderCatalog();
window.HOMLY_SET_CATALOG_STATE('prelaunch');
assert.equal(model.PRODUCTS.length,0);
assert.equal(controls.hidden,true);
window.HOMLY_UPDATE_PRODUCTS([{
 id:'real-test',name:'Справжній набір',category:'beads',
 type:'Бусини',price:625,photo:'assets/bag.webp',
 shade:'#EFDDF0',desc:'Перевірений реальний товар',stock:2
}]);
assert.equal(model.PRODUCTS.length,1);
assert.match(catalog.innerHTML,/Справжній набір/);
assert.doesNotMatch(catalog.innerHTML,/Ідея майбутнього набору/);
assert.equal(controls.hidden,false);
console.log('PASS: four honest prelaunch concepts, no demo prices/buy actions, live catalog switch');
