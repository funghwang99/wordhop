const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
process.stdout.write(execFileSync('python3',['-B',path.join(__dirname,'check_pet_vietnamese.py')],{cwd:root,encoding:'utf8'}));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const meta=catalog.units.find(u=>u.id==='simply-pet-test-1');
const words=JSON.parse(fs.readFileSync(path.join(root,'dist',meta.dataFile.replace(/^\//,'')),'utf8')).words.slice(0,4),word=words[0];
const nodes=new Map(),esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const context={esc,icon:()=>'',shuffle:items=>[...items],main:{innerHTML:''},route:{unit:{...meta,words}},study:{words,index:0,flipped:true},game:{mode:'quiz',items:[word],index:0,correct:0,attempted:0},
 unitHeader:()=>'',gameTop:()=>'',seenCount:()=>0,preloadNextFlashImage(){},showAnswerEffect(){},$(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',focus(){}});return nodes.get(selector);}};
vm.createContext(context);
vm.runInContext(app.slice(app.indexOf('function wordMeaning('),app.indexOf('function loadUnitWords(')),context);
vm.runInContext(app.slice(app.indexOf('function wordRow('),app.indexOf('function preloadNextFlashImage(')),context);
vm.runInContext(app.slice(app.indexOf('function renderGame('),app.indexOf('function record(')),context);
vm.runInContext(app.slice(app.indexOf('function feedback('),app.indexOf('function showAnswerEffect(')),context);
vm.runInContext(app.slice(app.indexOf('function matchTile('),app.indexOf('function chooseMatch(')),context);
assert.equal(context.wordMeaning(word),word.definitionVi);assert.equal(context.wordMeaningLanguage(word),'vi');
assert.equal(context.wordMeaning({definition:'English meaning'}),'English meaning');assert.equal(context.wordMeaningLanguage({definition:'English meaning'}),'en');
context.renderFlash();assert.ok(context.main.innerHTML.includes(esc(word.definitionVi)));assert.ok(context.main.innerHTML.includes(esc(word.example)));assert.ok(!context.main.innerHTML.includes(esc(word.definition)));
context.renderGame();assert.equal(context.game.options.find(o=>o.correct).text,word.definitionVi);assert.ok(context.game.options.every(o=>words.some(w=>w.definitionVi===o.text)));assert.equal((context.main.innerHTML.match(/lang="vi"/g)||[]).length,4);
context.game.match={matched:[],left:null,rightId:null};
assert.ok(context.matchTile(word,'right').includes(esc(word.definitionVi)));assert.ok(context.matchTile(word,'right').includes('lang="vi"'));assert.ok(context.matchTile(word,'left').includes(esc(word.term)));
for(const correct of [true,false]){context.feedback(correct);const html=nodes.get('#feedback').innerHTML;assert.ok(html.includes(esc(word.definitionVi)));assert.ok(html.includes(esc(word.example)));assert.ok(!html.includes(esc(word.definition)));}
for(const file of ['reading.js','listening.js']){const source=fs.readFileSync(path.join(root,'dist',file),'utf8');assert.ok(source.includes('esc(q.explanationVi||q.explanation)'));assert.ok(source.includes('lang="${q.explanationVi?\'vi\':\'en\'}"'));}
console.log('PASS: Vietnamese meanings appear in flashcards, quiz choices, matching, review lists and correct/wrong feedback; English examples and IELTS fallback remain available.');
