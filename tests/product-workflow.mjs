// Run with: node tests/product-workflow.mjs
// Offline tests; never mutate live HOMLY Supabase or create fake products.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('../product-workflow.js',import.meta.url),'utf8');
const helper=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const p=helper.parseImportRow({
 title:'Набір, рожевий',category:'beads',description:'',
 price_uah:'',stock:'0',skill_level:'beginner'
});
assert.equal(p.published,false);
assert.equal(p.price_kopeks,null);
assert.equal(p.stock,0);
assert.deepEqual(p.image_urls,[]);
const required=helper.missingForPublication(p);
assert.ok(required.includes('Ціна'));
assert.ok(required.includes('Хоча б 1 фото'));
assert.ok(required.includes('Опис (від 30 символів)'));

const complete={...p,price_kopeks:79000,stock:3,
 description:'Цей творчий набір містить усе потрібне для створення виробу.',
 kit_contents:'Матеріали та інструменти, інструкція',
 image_urls:['https://example.invalid/placeholder.jpg']};
assert.deepEqual(helper.missingForPublication(complete),[]);
assert.ok(helper.missingForPublication({...complete,stock:0}).includes('Залишок від 1 шт.'));
assert.deepEqual(helper.missingForPublication({...complete,stock:0},{newPublication:false}),[]);

const csv=helper.exportCSV([{...p,slug:'pink-bag'}]);
const parsed=helper.parseCSV(csv);
assert.equal(parsed.length,1);
assert.equal(parsed[0].title,'Набір, рожевий');
assert.equal(parsed[0].slug,'pink-bag');
assert.equal(parsed[0].price_uah,'');
assert.equal(helper.parseImportRow(parsed[0]).published,false);
const multiline=helper.parseCSV('\uFEFFtitle,category,description\n"Сумка ""Pearl""",beads,"Рядок 1\nРядок 2"');
assert.equal(multiline.length,1);
assert.equal(multiline[0].title,'Сумка "Pearl"');
assert.equal(multiline[0].description,'Рядок 1\nРядок 2');
const excelDelimited=helper.parseCSV('title;category;price_uah\nРожевий набір;beads;750.50');
assert.equal(excelDelimited.length,1);
assert.equal(helper.parseImportRow(excelDelimited[0]).price_kopeks,75050);
assert.throws(()=>helper.parseImportRow({title:'Bad',category:'unknown'}));
assert.throws(()=>helper.parseImportRow({title:'Bad',category:'beads',price_uah:'-5'}));
assert.throws(()=>helper.parseCSV('title,category\n"bad,beads'));
const excel=helper.exportCSV([{...p,title:'=2+3'}]);
assert.ok(excel.includes("'=2+3"));
console.log('PASS: safe drafts, publishing readiness, CSV parsing/export, unsafe inputs');
