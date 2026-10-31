const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'source-assets/simply-pet-listening/source-manifest.json'),'utf8'));
assert.equal(manifest.trackCount,32);assert.equal(manifest.testCount,8);
assert.equal(manifest.tracks.length,32);
const app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');
const routeSource=app.match(/function parseRoute\(hash\)\{.*\n/)[0];
const context={catalog};vm.createContext(context);
vm.runInContext(`const trackById=id=>catalog.tracks.find(x=>x.id===id),levelById=id=>catalog.levels.find(x=>x.id===id),bookById=id=>catalog.books.find(x=>x.id===id),unitById=id=>catalog.units.find(x=>x.id===id);${routeSource}`,context);
let count=0;const seen=new Set(),decoderWarnings=[];
for(const unit of catalog.units){
 const test=Number(unit.id.match(/^simply-pet-test-([1-8])$/)?.[1]);
 if(test>=1&&test<=8){
  assert.deepEqual(unit.listening.map(p=>p.id),['part-1','part-2','part-3','part-4']);
  for(const [i,track] of unit.listening.entries()){
   count++;assert.ok(!seen.has(track.src));seen.add(track.src);
   const source=manifest.tracks.find(item=>item.test===test&&item.part===i+1);
   assert.ok(source);assert.equal(track.src,source.asset);assert.equal(track.duration,source.durationSeconds);
   assert.match(source.sourceFilename,new RegExp(`^Test ${test} Part ${i+1}(?:\\(\\d+\\))?\\.(mp3|m4a)$`));
   assert.ok(track.src.startsWith('audio/simply-pet/')&&!track.src.includes('..'));
   const bytes=fs.readFileSync(path.join(root,'dist',track.src));
   const hash=crypto.createHash('sha256').update(bytes).digest('hex');
   assert.equal(hash,source.sourceSha256);assert.ok(track.src.includes(hash.slice(0,12)));
   assert.equal(bytes.length,source.bytes);assert.ok(track.duration>200&&track.duration<900);
   assert.equal(source.codec_name,track.src.endsWith('.m4a')?'aac':'mp3');assert.equal(source.channels,2);
   assert.equal(track.sourceWarning,undefined);
   assert.ok(['passed','warning'].includes(source.decodeReview.status));
   if(source.decodeReview.status==='warning'){assert.ok(source.decodeReview.errors.length>0);decoderWarnings.push([test,i+1]);}
   const route=context.parseRoute(`#/pet/simply-pet/${unit.id}/listening/${track.id}`);
   assert.equal(route.unit.id,unit.id);assert.equal(route.view,'listening');assert.equal(route.listeningPart,track.id);
  }
 }else if(unit.bookId!=='authentic-1')assert.equal(unit.listening,undefined);
}
assert.equal(count,32);
assert.equal(context.parseRoute('#/pet/simply-pet/simply-pet-test-1/reading/part-6').readingPart,'part-6');
console.log('PASS: all 32 original recordings match source SHA-256, filename, test, part, duration and channel metadata.');
console.log('PASS: direct links reach every listening part; Reading routes and tests without supplied audio are preserved.');
console.log(`PASS: ${count-decoderWarnings.length} recordings passed the decoder check; ${decoderWarnings.length} diagnostic results remain internal and do not impose replacement notices.`);

assert.equal(decoderWarnings.length,0);
assert.equal(manifest.replacements.length,2);
for(const replacement of manifest.replacements){
 const previous=fs.readFileSync(path.join(root,'dist',replacement.previousAsset));
 assert.equal(crypto.createHash('sha256').update(previous).digest('hex'),replacement.previousSha256);
 assert.ok(manifest.tracks.some(t=>t.sourceSha256===replacement.replacementSha256));
}
const replaced=manifest.tracks.filter(t=>(t.test===4&&t.part===2)||(t.test===5&&t.part===3));
assert.deepEqual(replaced.map(t=>[t.sourceFilename,t.bytes,t.codec_name]),[['Test 4 Part 2.m4a',13803188,'aac'],['Test 5 Part 3(1).mp3',3322629,'mp3']]);
const gradingContext={window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{getItem(){return null;}},setTimeout,clearTimeout};
vm.createContext(gradingContext);
for(const module of ['reading.js','listening.js'])vm.runInContext(fs.readFileSync(path.join(root,'dist',module),'utf8'),gradingContext);
const {validate,grade,cueRange}=gradingContext.window.WordHopListening;
const exercises=JSON.parse(fs.readFileSync(path.join(root,'source-assets/simply-pet-listening/exercise-manifest.json')));
const questions=JSON.parse(fs.readFileSync(path.join(root,'source-assets/simply-pet-listening/questions.json')));
const keys=JSON.parse(fs.readFileSync(path.join(root,'source-assets/simply-pet-listening/answer-key.json')));
assert.deepEqual(keys.needsReview,[]);
assert.deepEqual([exercises.testCount,exercises.partCount,exercises.questionCount,exercises.uniqueBookPageCount],[8,32,200,32]);
let partCount=0,questionCount=0,gapCount=0;const images=new Set();
for(const unit of catalog.units){
 if(unit.bookId!=='simply-pet'){if(unit.bookId!=='authentic-1')assert.equal(unit.listeningFile,undefined);continue;}
 assert.match(unit.listeningFile,/^listening\/[\w.-]+\.json$/);
 const bytes=fs.readFileSync(path.join(root,'dist',unit.listeningFile)),data=JSON.parse(bytes);
 assert.ok(unit.listeningFile.includes(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12)));
 validate(data,unit.id);assert.match(data.source.answerKey,/not a publisher key/);
 const original=questions.tests.find(t=>t.id===unit.id),key=keys.tests.find(t=>t.id===unit.id);
 for(const [i,part]of data.parts.entries()){
  partCount++;assert.deepEqual(part.pages.map(p=>p.pdfPage),original.parts[i].pdfPages);
  for(const page of part.pages){const image=fs.readFileSync(path.join(root,'dist',page.image));images.add(page.image);assert.ok(page.width>=1300&&page.height>=1400);assert.ok(page.image.includes(crypto.createHash('sha256').update(image).digest('hex').slice(0,12)));}
  for(const [j,q]of part.questions.entries()){
   questionCount++;if(!q.options)gapCount++;
   assert.equal(q.prompt,original.parts[i].questions[j].prompt);
   for(const field of ['answer','accepted','explanation','evidence','evidenceStart','evidenceEnd'])assert.deepEqual(q[field],key.parts[i].questions[j][field]);
   const cue=cueRange(q,unit.listening[i].duration);assert.ok(cue&&cue.start>=0&&cue.end>cue.start&&cue.end<=unit.listening[i].duration);
   assert.ok(q.evidenceStart>=0&&q.evidenceEnd>q.evidenceStart&&q.evidenceEnd<=unit.listening[i].duration+1);
   for(const answer of q.accepted)assert.equal(grade(q,'  '+answer.toUpperCase().replace(/ /g,'  ')+'  '),true);
   assert.equal(grade(q,''),false);assert.equal(grade(q,'clearly incorrect answer'),false);
   if(q.options)for(const option of q.options)assert.equal(grade(q,option),option===q.answer);
  }
 }
 assert.equal(data.parts[2].pages[0].image,data.parts[3].pages[0].image);
 const bad=JSON.parse(bytes);bad.parts[0].questions[0].number=2;assert.throws(()=>validate(bad,unit.id),/Incomplete/);
 const missing=JSON.parse(bytes);missing.parts[0].pages=[];assert.throws(()=>validate(missing,unit.id),/Invalid/);
}
assert.deepEqual([partCount,questionCount,gapCount,images.size],[32,200,48,32]);
const deadline=keys.tests.find(t=>t.test===2).parts[2].questions.find(q=>q.number===18);
assert.equal(grade(deadline,'Tuesday afternoon'),true);assert.equal(grade(deadline,'Wednesday morning'),false);assert.equal(grade(deadline,'Friday afternoon'),false);
console.log('PASS: 8 complete Listening tests / 32 parts / 200 questions / 32 original pages, including all picture choices and 48 typed gaps.');
console.log('PASS: all keys, explanations, evidence timestamps, accepted forms, case/spacing, wrong/blank answers and both clean audio replacements checked.');

require('./check-listening-replay.cjs');
require('./check-authentic-1.cjs');
