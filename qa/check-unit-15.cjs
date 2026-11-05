const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-15');
assert.ok(unit);assert.equal(unit.bookId,'basic-ielts-reading');assert.equal(unit.wordCount,42);assert.equal(unit.listening,undefined);
assert.equal(catalog.units.indexOf(unit),catalog.units.findIndex(u=>u.id==='bir-unit-14')+1);
const report=read('qa/unit-15-import.json'),provenance=read('source-assets/unit-15/provenance.json');
assert.equal(report.sourceSha256,'f98b5234d99a41fd68e101277d79b19bb52bff10393da3f6a471704c99906d6a');
assert.deepEqual([report.slideCount,report.declaredCoverWords,report.words,report.imageCards,report.passageCounts],[43,42,42,40,[23,19]]);
assert.deepEqual(report.textOnlyWords,['via','despite']);
const bytes=fs.readFileSync(path.join(root,'dist',unit.dataFile.replace(/^\//,''))),data=JSON.parse(bytes);
assert.ok(unit.dataFile.includes(hash(bytes).slice(0,12)));assert.equal(data.id,unit.id);
assert.deepEqual(data.words.map(w=>w.term),['academic','button','collaboration','communicate','concrete','contractor','convenient','data','decentralise','document','estimate','grant','heading','large-scale','military','nuclear','numerous','reassemble','reliable','software','tiny','transmit','via','alternate','assumption','candidly','caution','considerable','cross-cultural','curriculum','desire','despite','domestic','empathy','enhance','factor','handicap','option','personality','primary','schooling','sequencing']);
assert.deepEqual(unit.wordIds,data.words.map(w=>w.id));assert.equal(new Set(unit.wordIds).size,42);
const custom=[],textOnly=[];
for(const [i,word]of data.words.entries()){
 const source=provenance[i];assert.equal(source.slide,i+2);assert.equal(word.id,source.id);
 for(const field of ['term','pos','definition','example'])assert.equal(word[field],source.original[field]);
 assert.equal(word.cloze.split('________').length,2);assert.equal(word.cloze.replace('________',word.answer),word.clozeExample||word.example);
 assert.ok(word.accepted.includes(word.answer));assert.equal(source.gameExample,word.clozeExample||word.example);
 if(word.clozeExample)custom.push(word.term);
 if(!word.image){textOnly.push(word.term);assert.equal(source.image,null);continue;}
 const image=fs.readFileSync(path.join(root,'dist',word.image.replace(/^\//,'')));
 assert.equal(word.image,source.image.image);assert.ok(word.image.includes(hash(image).slice(0,12)));
 assert.ok(source.image.width<=680&&source.image.height<=360);assert.equal(image.length,source.image.publishedBytes);
}
assert.deepEqual(custom,['academic','military']);assert.deepEqual(textOnly,['via','despite']);
assert.ok(data.words.find(w=>w.term==='decentralise').accepted.includes('decentralize'));
assert.ok(data.words.find(w=>w.term==='large-scale').accepted.includes('large scale'));
assert.ok(data.words.find(w=>w.term==='cross-cultural').accepted.includes('cross cultural'));
const reading=read('dist/'+unit.readingFile),manifest=read('source-assets/unit-15/reading-manifest.json');
assert.deepEqual(reading.parts.map(p=>p.questions.length),[19,21]);
assert.deepEqual(reading.parts.map(p=>p.pages.map(page=>page.pdfPage)),[[125,126,127,128],[129,130,131,132]]);
assert.deepEqual([manifest.questions,manifest.scoredQuestions,manifest.pages.length],[40,40,8]);assert.deepEqual(manifest.unscored,[]);
const publisherAnswers=[['C','D','A','E','B','F','B','A','C','B','A','D','C','D','B','B','D','C','A'],['D','A','E','B','F','C','C','D','A','E','H','disadvantages','assumptions','schooling issues','internationally mobile','individually','sequencing of curriculum','academic system','handicapped','benefit','empathise']];
for(const [i,part]of reading.parts.entries()){
 assert.deepEqual(part.questions.map(q=>q.publisherAnswer),publisherAnswers[i]);
 for(const q of part.questions){assert.equal(q.publisherKeyPrintedPage,174);assert.ok(!q.unscored);}
}
assert.ok(reading.parts[1].questions.at(-1).accepted.includes('empathize'));
console.log('PASS: Unit 15 has all 42 supplied words, 40 source pictures, complete game clozes, 40 publisher-checked Reading questions and 8 original pages.');
