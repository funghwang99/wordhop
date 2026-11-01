const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-14');
assert.ok(unit);assert.equal(unit.bookId,'basic-ielts-reading');assert.equal(unit.wordCount,34);assert.equal(unit.listening,undefined);
assert.equal(catalog.units.indexOf(unit),catalog.units.findIndex(u=>u.id==='bir-unit-13')+1);
const report=read('qa/unit-14-import.json'),provenance=read('source-assets/unit-14/provenance.json');
assert.equal(report.sourceSha256,'1ddf1b5ec916a2b9a18f4f0d76eaa55f32c02d42df4876f98627e366976da36a');
assert.deepEqual([report.slideCount,report.declaredCoverWords,report.words,report.imageCards,report.passageCounts],[35,35,34,34,[25,9]]);
const bytes=fs.readFileSync(path.join(root,'dist',unit.dataFile.replace(/^\//,''))),data=JSON.parse(bytes);
assert.ok(unit.dataFile.includes(hash(bytes).slice(0,12)));assert.equal(data.id,unit.id);
assert.deepEqual(data.words.map(w=>w.term),['accessible','administer','automate','boundary','charm','complement','convenience','dramatic','embrace','explorer','ferry','frequency','harbour','identify','marine','panel','partnership','prepay','ramp','rear','skinny','stroller','terminal','transfer','transit','behave','blame','board','criticise','decrease','depress','disturb','divorce','object']);
assert.deepEqual(unit.wordIds,data.words.map(w=>w.id));assert.equal(new Set(unit.wordIds).size,34);
for(const [i,word]of data.words.entries()){
 const source=provenance[i];assert.equal(source.slide,i+2);assert.equal(word.id,source.id);
 for(const field of ['term','pos','definition','example'])assert.equal(word[field],source.original[field]);
 assert.equal(word.cloze.split('________').length,2);assert.equal(word.cloze.replace('________',word.answer),word.example);
 assert.ok(word.accepted.includes(word.answer));
 const image=fs.readFileSync(path.join(root,'dist',word.image.replace(/^\//,'')));
 assert.equal(word.image,source.image.image);assert.ok(word.image.includes(hash(image).slice(0,12)));
 assert.ok(source.image.width<=680&&source.image.height<=360);assert.equal(image.length,source.image.publishedBytes);
}
assert.ok(data.words.find(w=>w.term==='harbour').accepted.includes('Harbor'));
assert.ok(data.words.find(w=>w.term==='criticise').accepted.includes('criticize'));
const reading=read('dist/'+unit.readingFile),manifest=read('source-assets/unit-14/reading-manifest.json');
assert.deepEqual(reading.parts.map(p=>p.questions.length),[23,17]);
assert.deepEqual(reading.parts.map(p=>p.pages.map(page=>page.pdfPage)),[[116,117,118,119,120],[120,121,122,123,124]]);
assert.equal(reading.parts[0].pages.at(-1).image,reading.parts[1].pages[0].image);
assert.deepEqual([manifest.questions,manifest.scoredQuestions,manifest.pages.length],[40,40,9]);
assert.deepEqual(manifest.unscored,[]);assert.ok(reading.parts.every(p=>p.pageNote.includes('120')));
const publisherAnswers=[['A','A','B','A','attractions','ferry terminals','Low-floor','baby strollers','long skinny','rectangular','served','information tubes','transfer','connecting','FALSE','FALSE','TRUE','TRUE','FALSE','FALSE','NOT GIVEN','TRUE','FALSE'],['B','C','A','C','B','C','A','D','H','E','F','A','A','B','C','D','A, C, E, F']];
for(const [i,part]of reading.parts.entries()){
 assert.deepEqual(part.questions.map(q=>q.publisherAnswer),publisherAnswers[i]);
 for(const q of part.questions){assert.equal(q.publisherKeyPrintedPage,174);assert.ok(!q.unscored);}
}
assert.deepEqual(reading.parts[0].questions[6].accepted,['Low-floor','low floor']);
const multiple=reading.parts[1].questions.at(-1);
assert.equal(multiple.multiple,4);assert.deepEqual(multiple.options,['A','B','C','D','E','F','G']);assert.equal(multiple.answer,'A, C, E, F');
console.log('PASS: Unit 14 has all 34 supplied illustrated cards, original examples, complete game clozes, 40 publisher-checked Reading questions and 9 original pages.');
