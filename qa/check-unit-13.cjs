const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-13');assert.ok(unit);assert.equal(unit.bookId,'basic-ielts-reading');assert.equal(unit.wordCount,28);assert.equal(unit.listening,undefined);
const report=read('qa/unit-13-import.json'),provenance=read('source-assets/unit-13/provenance.json');
assert.equal(report.sourceSha256,'d2e2d914a96c9097618dba89fb6d900c9436f443495e07a0a773d1251a4bc4b9');
assert.deepEqual([report.words,report.imageCards,report.passageCounts],[28,28,[17,11]]);
const bytes=fs.readFileSync(path.join(root,'dist',unit.dataFile.replace(/^\//,''))),data=JSON.parse(bytes);
assert.ok(unit.dataFile.includes(hash(bytes).slice(0,12)));assert.equal(data.id,unit.id);assert.equal(data.words.length,28);
assert.deepEqual(unit.wordIds,data.words.map(w=>w.id));assert.equal(new Set(unit.wordIds).size,28);
const custom=[];
for(const [i,word]of data.words.entries()){
 const source=provenance[i];assert.equal(source.slide,i+2);assert.equal(word.id,source.id);
 for(const field of ['term','definition','example'])assert.equal(word[field],source.original[field]);
 assert.equal(word.pos,source.original.pos||'n. phr.');assert.equal(word.cloze.split('________').length,2);
 assert.equal(word.cloze.replace('________',word.answer),word.clozeExample||word.example);assert.ok(word.accepted.includes(word.answer));
 if(word.clozeExample)custom.push(word.term);
 const image=fs.readFileSync(path.join(root,'dist',word.image.replace(/^\//,'')));
 assert.equal(word.image,source.image.image);assert.ok(word.image.includes(hash(image).slice(0,12)));
 assert.ok(source.image.width<=680&&source.image.height<=360);assert.equal(image.length,source.image.publishedBytes);
}
assert.deepEqual(custom,['decline','nest','increase']);
const reading=read('dist/'+unit.readingFile),manifest=read('source-assets/unit-13/reading-manifest.json');
assert.deepEqual(reading.parts.map(p=>p.questions.length),[17,20]);assert.equal(reading.parts[0].pages.at(-1).image,reading.parts[1].pages[0].image);
assert.deepEqual([manifest.questions,manifest.scoredQuestions,manifest.pages.length],[37,36,8]);
assert.ok(reading.parts.every(p=>p.pageNote.includes('111')));
const badQuestion=reading.parts[1].questions[1];assert.equal(badQuestion.publisherAnswer,'C');assert.equal(badQuestion.unscored,true);assert.match(badQuestion.reviewNote,/harmful|adverse/i);
console.log('PASS: Unit 13 has all 28 original illustrated flashcards, complete game clozes, 37 publisher-checked Reading questions and 8 original pages; its documented source error is not scored.');
