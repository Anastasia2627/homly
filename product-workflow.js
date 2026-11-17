// HOMLY product onboarding helpers; safe to run before products exist.
// No preset contains invented merchandise or a ready-to-publish description.
export const productTemplates={
 beads:{label:'Сумка з намистин',category:'beads',
  title:'Назва набору (наприклад, сумка)',description:'Опиши результат, розмір сумки та для кого набір.',
  kit:'Перерахуйте типи й кількість намистин, волосінь, фурнітуру та інструкцію.'},
 textile:{label:'Килимова вишивка',category:'textile',
  title:'Назва картини',description:'Опиши сюжет, розмір картини та техніку.',
  kit:'Перерахуйте тканину, раму, мотки пряжі, голку й інструкцію.'},
 candles:{label:'Набір свічок',category:'candles',
  title:'Назва набору свічок',description:'Опиши тип свічок, результат та правила використання.',
  kit:'Перерахуйте віск, гніт, форми, барвники та інструкцію.'},
 decor:{label:'Декор власноруч',category:'decor',
  title:'Назва набору для декору',description:'Опиши, який декор вийде та для чого він підходить.',
  kit:'Перерахуйте матеріали, інструменти та інструкцію.'}
};
export const productCategories=new Set(Object.keys(productTemplates));
export const productLevels=new Set(['beginner','intermediate','advanced']);
export const csvHeaders=[
 'title','slug','category','description','kit_contents',
 'skill_level','time_minutes','price_uah','stock'
];
export function missingForPublication(p,{newPublication=true,pendingImages=0}={}){
 const missing=[];
 if(String(p.title||'').trim().length<2)missing.push('Назва');
 if(!productCategories.has(p.category))missing.push('Категорія');
 if(p.price_kopeks==null||!Number.isInteger(Number(p.price_kopeks))||Number(p.price_kopeks)<100)
  missing.push('Ціна');
 if(newPublication&&(!Number.isInteger(Number(p.stock))||Number(p.stock)<1))
  missing.push('Залишок від 1 шт.');
 if(String(p.description||'').trim().length<30)missing.push('Опис (від 30 символів)');
 if(String(p.kit_contents||'').trim().length<10)missing.push('Склад набору');
 if((p.image_urls||[]).length+pendingImages<1)missing.push('Хоча б 1 фото');
 if(p.archived)missing.push('Розархівувати');
 return missing;
}
export function parseCSV(input){
 const text=String(input||'').replace(/^\uFEFF/,'');
 if(text.length>1000000)throw new Error('CSV має бути до 1 МБ.');
 const rows=[];let field='',row=[],quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(quoted&&text[i+1]==='"'){field+='"';i++}
   else if(!quoted&&field==='')quoted=true;
   else if(quoted)quoted=false;
   else throw new Error('Некоректні лапки у CSV.');
  }else if(c===','&&!quoted){row.push(field);field=''}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(field);field='';
   if(row.some(v=>v.trim()!==''))rows.push(row);
   row=[];
  }else field+=c;
 }
 if(quoted)throw new Error('CSV містить незакриті лапки.');
 row.push(field);if(row.some(v=>v.trim()!==''))rows.push(row);
 if(rows.length<2)return [];
 const header=rows.shift().map(x=>x.trim().toLowerCase());
 for(const required of ['title','category'])if(!header.includes(required))
  throw new Error('CSV має містити колонки title та category.');
 const items=[];
 for(const [index,fields] of rows.entries()){
  if(fields.length>header.length)throw new Error('Зайва колонка у рядку '+(index+2));
  const out={};header.forEach((key,i)=>{if(csvHeaders.includes(key))out[key]=String(fields[i]||'').trim()});
  items.push({...out,row:index+2});
 }
 return items;
}
export function exportCSV(products){
 const escaped=value=>{
  let text=String(value??'');
  // Protect spreadsheet users from formula injection on download.
  if(/^[=+@\t\r]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
 };
 const lines=[csvHeaders.map(escaped).join(',')];
 for(const p of products){
  const data={
   title:p.title,slug:p.slug,category:p.category,
   description:p.description,kit_contents:p.kit_contents,
   skill_level:p.skill_level,time_minutes:p.time_minutes??'',
   price_uah:p.price_kopeks==null?'':(p.price_kopeks/100).toFixed(2),
   stock:p.stock
  };
  lines.push(csvHeaders.map(h=>escaped(data[h])).join(','));
 }
 return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
export function parseImportRow(row){
 const title=String(row.title||'').trim();
 if(title.length<2||title.length>180)throw new Error('Некоректна назва');
 const category=String(row.category||'').toLowerCase();
 if(!productCategories.has(category))throw new Error('Некоректна категорія');
 const slug=String(row.slug||'').toLowerCase();
 if(slug&&!/^[a-z0-9][a-z0-9-]{1,70}$/.test(slug))throw new Error('Некоректний slug');
 const level=String(row.skill_level||'beginner').toLowerCase();
 if(!productLevels.has(level))throw new Error('Некоректна складність');
 const time=row.time_minutes===''||row.time_minutes==null?null:Number(row.time_minutes);
 if(time!==null&&(!Number.isInteger(time)||time<10||time>1440))
  throw new Error('Час має бути від 10 до 1440 хв');
 const priceText=String(row.price_uah||'').replace(',','.');
 const price=priceText===''?null:Number(priceText);
 if(price!==null&&(!Number.isFinite(price)||price<1||price>1000000))
  throw new Error('Некоректна ціна');
 const stock=row.stock===''||row.stock==null?0:Number(row.stock);
 if(!Number.isInteger(stock)||stock<0||stock>100000)throw new Error('Некоректний залишок');
 const description=String(row.description||'').slice(0,5000);
 const contents=String(row.kit_contents||'').slice(0,5000);
 return {
  title,slug,category,description,kit_contents:contents,
  skill_level:level,time_minutes:time,price_kopeks:price===null?null:Math.round(price*100),
  stock,published:false,featured:false,archived:false,image_urls:[]
 };
}
