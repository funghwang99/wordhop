// Check the new book's source mappings and grading without weakening old-book checks.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),dist=path.join(root,'dist'),source=path.join(root,'source-assets/authentic-1');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const catalog=JSON.parse(fs.readFileSync(path.join(dist,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const manifest=read(path.join(source,'source-manifest.json')),audio=read(path.join(source,'audio-manifest.json'));
const publisher=read(path.join(source,'publisher-answer-key.json'));
assert.equal(publisher.sourceSha256,manifest.pdfSha256);
const vocabulary=read(path.join(source,'vocabulary.json'));
const records=kind=>['1-2','3-4'].flatMap(span=>{const data=read(path.join(source,`${kind}-${span}.json`));assert.deepEqual(data.needsReview,[]);return data.tests;});
const sources={reading:records('reading'),listening:records('listening')};
assert.equal(catalog.books.filter(b=>b.id==='authentic-1').length,1);
assert.equal(catalog.books.find(b=>b.id==='authentic-1').trackId,'pet');
assert.deepEqual([manifest.testCount,manifest.wordCount,manifest.readingQuestionCount,manifest.listeningQuestionCount,manifest.trackCount],[4,243,128,100,16]);
assert.deepEqual([audio.trackCount,audio.tracks.length],[16,16]);
assert.deepEqual(vocabulary.needsReview,[]);
const units=catalog.units.filter(u=>u.bookId==='authentic-1');assert.equal(units.length,4);
assert.equal(catalog.units.length,22);assert.equal(catalog.units.reduce((n,u)=>n+u.wordCount,0),935);
const context={window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{getItem(){return null;}},setTimeout,clearTimeout};
vm.createContext(context);
for(const module of ['reading.js','listening.js'])vm.runInContext(fs.readFileSync(path.join(dist,module),'utf8'),context);
const totals={reading:0,listening:0},pages={reading:new Set(),listening:new Set()},wordIds=new Set();
function hashed(file){const bytes=fs.readFileSync(path.join(dist,file));assert.ok(file.includes(sha(bytes).slice(0,12)),file);return JSON.parse(bytes);}
for(const [index,unit]of units.entries()){
 const test=index+1;assert.equal(unit.id,`authentic-1-test-${test}`);
 const vocab=hashed(unit.dataFile.replace(/^\//,''));assert.equal(vocab.id,unit.id);
 assert.equal(vocab.words.length,[62,62,57,62][index]);
 assert.deepEqual(unit.wordIds,vocab.words.map(w=>w.id));
 for(const [i,word]of vocab.words.entries()){
  assert.ok(!wordIds.has(word.id));wordIds.add(word.id);
  const {id,...fields}=word;assert.deepEqual(fields,vocabulary.tests[index].words[i]);
  assert.equal(word.cloze.split('________').length,2);assert.equal(word.cloze.replace('________',word.answer),word.example);
  assert.ok(word.accepted.includes(word.answer));
 }
 assert.deepEqual(unit.listening.map(t=>t.id),['part-1','part-2','part-3','part-4']);
 for(const [i,track]of unit.listening.entries()){
  const original=audio.tracks.find(t=>t.test===test&&t.part===i+1),bytes=fs.readFileSync(path.join(dist,track.src));
  assert.equal(track.src,original.asset);assert.equal(track.duration,original.durationSeconds);
  assert.equal(sha(bytes),original.assetSha256);assert.ok(track.src.includes(original.assetSha256.slice(0,12)));
  assert.equal(bytes.length,original.bytes);assert.equal(original.channels,1);assert.equal(original.codec_name,'mp3');
  assert.equal(original.decodeReview.status,'passed');assert.deepEqual(original.decodeReview.errors,[]);
  assert.ok(Math.abs(original.sourceDecodedDurationSeconds-original.assetDecodedDurationSeconds)<.001);
 }
 for(const kind of ['reading','listening']){
  const data=hashed(unit[kind+'File']),original=sources[kind][index],publisherTest=publisher[kind][index];
  const module=kind==='reading'?context.window.WordHopReading:context.window.WordHopListening;
  module.validate(data,unit.id);assert.equal(data.parts.length,kind==='reading'?6:4);
  assert.equal(data.source.answerKeyPdfSha256,manifest.pdfSha256);
  assert.match(data.source.answerKeyOrigin,/Checked against the supplied publisher/);
  for(const [i,part]of data.parts.entries()){
   const originalPart=original.parts[i];
   assert.deepEqual(part.pages.map(p=>p.pdfPage),originalPart.pdfPages);
   for(const page of part.pages){
    assert.equal(page.printedPage,page.pdfPage-2);assert.ok(page.width>=1300&&page.height>=1400);
    const bytes=fs.readFileSync(path.join(dist,page.image));assert.ok(page.image.includes(sha(bytes).slice(0,12)));pages[kind].add(page.image);
   }
   for(const [j,q]of part.questions.entries()){
    totals[kind]++;assert.deepEqual(q,originalPart.questions[j]);
    assert.equal(q.publisherKeyPdfPage,publisherTest.keyPdfPage);
    assert.equal(module.grade(q,publisherTest.answers[q.number-1]),true);
    for(const answer of publisherTest.accepted[q.number]||[])assert.equal(module.grade(q,answer),true);
    for(const answer of q.accepted)assert.equal(module.grade(q,'  '+answer.toUpperCase().replace(/ /g,'  ')+'  '),true);
    assert.equal(module.grade(q,''),false);assert.equal(module.grade(q,'clearly incorrect answer'),false);
    if(q.options)for(const answer of q.options)assert.equal(module.grade(q,answer),q.accepted.includes(answer));
    if(kind==='listening'){
     const cue=module.cueRange(q,unit.listening[i].duration);assert.ok(cue&&cue.start>=0&&cue.end<=unit.listening[i].duration);
     assert.ok(q.evidenceEnd-q.evidenceStart<65,'Review an unusually long replay');
     assert.ok(q.cueReview&&q.cueReview.status==='reviewed',`Missing cue review: T${test}Q${q.number}`);
    }
   }
  }
  assert.deepEqual(data.parts.flatMap(p=>p.questions.map(q=>q.number)),Array.from({length:kind==='reading'?32:25},(_,i)=>i+1));
  if(kind==='listening')for(const part of data.parts){const starts=part.questions.map(q=>q.evidenceStart);assert.deepEqual(starts,[...starts].sort((a,b)=>a-b));}
  if(kind==='listening')assert.notEqual(data.parts[2].pages[0].image,data.parts[3].pages[0].image);
 }
}
assert.deepEqual(totals,{reading:128,listening:100});assert.equal(pages.reading.size,40);assert.equal(pages.listening.size,24);assert.equal(wordIds.size,243);
const third=hashed(units[2].listeningFile).parts[2].questions.find(q=>q.number===14);
assert.equal(context.window.WordHopListening.grade(third,'quarter past eight'),true);
assert.equal(context.window.WordHopListening.grade(third,'eight'),false);
const second=hashed(units[1].listeningFile).parts[2].questions.find(q=>q.number===18);
assert.equal(context.window.WordHopListening.grade(second,'8 months'),true);
assert.equal(context.window.WordHopListening.grade(second,'8'),false);
console.log('PASS: Authentic 1: 243 source vocabulary entries, 128 publisher-checked Reading questions, 100 Listening questions with reviewed replay cues, 64 original pages and 16 complete recordings.');
