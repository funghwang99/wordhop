const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const context={window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{getItem(){return null;}},setTimeout,clearTimeout};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'dist/writing.js'),'utf8'),context);
const {validate,wordCount}=context.window.WordHopWriting;
assert.equal(wordCount(''),0);assert.equal(wordCount('  Hello,\nmy friend!  '),3);assert.equal(wordCount('... — !'),0);assert.equal(wordCount("I'm ready for a long-term project."),6);
const manifest=read('source-assets/pet-writing/source-manifest.json');
assert.deepEqual([manifest.tests,manifest.parts,manifest.prompts,manifest.uniqueOriginalPages],[12,24,36,24]);
const expectedPages={'simply-pet':[[33,34],[47,48],[61,62],[75,76],[89,90],[103,104],[117,118],[130,131]],'authentic-1':[[20,21],[38,39],[56,57],[74,75]]};
const hashes={'simply-pet':'f5e184c54780c02c3e4e4f39b3cf9fde47a659f0558b00495163fce78cd62630','authentic-1':'492cb871679ccec89b3b50935a21ae5911a2a2adccd655dfd63607a1522d69fe'};
const units=catalog.units.filter(u=>u.writingFile),images=new Set();assert.equal(units.length,12);
let prompts=0;
for(const unit of units){
 assert.ok(expectedPages[unit.bookId]);assert.match(unit.writingFile,/^writings\/[\w.-]+\.json$/);
 const bytes=fs.readFileSync(path.join(root,'dist',unit.writingFile)),data=JSON.parse(bytes);
 assert.ok(unit.writingFile.includes(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12)));
 validate(data,unit.id);assert.equal(data.source.sha256,hashes[unit.bookId]);
 const n=Number(unit.id.split('-').at(-1)),expected=expectedPages[unit.bookId][n-1];
 assert.deepEqual(data.parts.map(p=>p.pages.map(page=>page.pdfPage)),expected.map(n=>[n]));
 assert.deepEqual(data.parts.map(p=>p.questions.map(q=>q.number)),[[1],[2,3]]);
 assert.deepEqual(data.parts.flatMap(p=>p.questions.map(q=>q.genre)),['email','article','story']);
 for(const part of data.parts){
  assert.equal(part.requiredQuestions,1);assert.match(part.instructions,/100 words/);
  for(const q of part.questions){assert.equal(q.targetWords,100);assert.ok(q.title);prompts++;}
  for(const page of part.pages){
   assert.equal(page.printedPage,page.pdfPage-(unit.bookId==='simply-pet'?1:2));assert.ok(page.width>=1300&&page.height>=1400);
   const image=fs.readFileSync(path.join(root,'dist',page.image));assert.ok(page.image.includes(crypto.createHash('sha256').update(image).digest('hex').slice(0,12)));images.add(page.image);
  }
 }
 const missing=JSON.parse(JSON.stringify(data));missing.parts[1].questions.pop();assert.throws(()=>validate(missing,unit.id),/Incomplete writing questions/);
 const unsafe=JSON.parse(JSON.stringify(data));unsafe.parts[0].pages[0].image='../book.webp';assert.throws(()=>validate(unsafe,unit.id),/Invalid writing page/);
}
assert.equal(prompts,36);assert.equal(images.size,24);
const app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
Object.assign(context,{catalog});
vm.runInContext(app.slice(app.indexOf('function trackById('),app.indexOf('function unitTitle('))+app.slice(app.indexOf('function parseRoute('),app.indexOf('function closeModal(')),context);
for(const unit of units){const parsed=context.parseRoute('#/pet/'+unit.bookId+'/'+unit.id+'/writing/part-2');assert.equal(parsed.unit.id,unit.id);assert.equal(parsed.view,'writing');assert.equal(parsed.writingPart,'part-2');}
assert.ok(app.indexOf("if(screen==='writing')")<app.indexOf('if(!Array.isArray(route.unit.words))'),'Writing should load independently of vocabulary');
console.log('PASS: PET Writing has 12 tests, 24 original pages and all 36 prompts; Part 2 keeps both choices, source hashes/page mappings match, and direct Writing routes load independently.');
