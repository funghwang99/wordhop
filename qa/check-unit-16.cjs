const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const unit=catalog.units.find(u=>u.id==='bir-unit-16');
assert.ok(unit);assert.equal(unit.bookId,'basic-ielts-reading');assert.equal(unit.wordCount,44);assert.equal(unit.listening,undefined);
assert.equal(catalog.units.indexOf(unit),catalog.units.findIndex(u=>u.id==='bir-unit-15')+1);
const report=read('qa/unit-16-import.json'),provenance=read('source-assets/unit-16/provenance.json');
assert.equal(report.sourceSha256,'98da4e1be3565fa38618f767d9df219bef51a4c45f723b432c302e07c243b8f3');
assert.deepEqual([report.slideCount,report.declaredCoverWords,report.words,report.imageCards,report.passageCounts],[45,44,44,44,[22,22]]);
assert.deepEqual(report.textOnlyWords,[]);
const bytes=fs.readFileSync(path.join(root,'dist',unit.dataFile.replace(/^\//,''))),data=JSON.parse(bytes);
assert.ok(unit.dataFile.includes(hash(bytes).slice(0,12)));assert.equal(data.id,unit.id);
assert.deepEqual(data.words.map(w=>w.term),['alternative','bacteria','brand','claim','contaminant','contamination','disinfectant','dissolve','distil','drain','filter','gasoline','hazardous','interfere','label','lead','leak','pesticide','purify','sufficiently','supplier','tap','ambition','benefit','beware','block','career','combination','disable','earnings','eligible','financial','firm','ideal','occupational','pension','pitfall','promotion','retirement','scheme','spouse','stumble','survey','voluntarily']);
assert.deepEqual(unit.wordIds,data.words.map(w=>w.id));assert.equal(new Set(unit.wordIds).size,44);
const custom=[];
for(const [i,word]of data.words.entries()){
 const source=provenance[i];assert.equal(source.slide,i+2);assert.equal(word.id,source.id);assert.equal(source.passage,i<22?1:2);
 for(const field of ['term','pos','definition','example'])assert.equal(word[field],source.original[field]);
 assert.equal(word.cloze.split('________').length,2);assert.equal(word.cloze.replace('________',word.answer),word.clozeExample||word.example);
 assert.ok(word.accepted.includes(word.answer));assert.equal(source.gameExample,word.clozeExample||word.example);
 const escaped=word.answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');assert.ok(!new RegExp('(?<!\\w)'+escaped+'(?!\\w)','i').test(word.cloze));
 if(word.clozeExample)custom.push(word.term);
 assert.ok(word.image&&source.image);assert.equal(word.image,source.image.image);
 const image=fs.readFileSync(path.join(root,'dist',word.image.replace(/^\//,'')));
 assert.ok(word.image.includes(hash(image).slice(0,12)));
 assert.ok(source.image.width<=680&&source.image.height<=360);assert.equal(image.length,source.image.publishedBytes);
 assert.match(source.image.originalSha256,/^[a-f0-9]{64}$/);assert.ok(Object.values(source.image.crop).every(c=>c>=0&&c<1));
}
assert.deepEqual(custom,['claim','label']);assert.ok(data.words.find(w=>w.term==='distil').accepted.includes('distill'));
const reading=read('dist/'+unit.readingFile),manifest=read('source-assets/unit-16/reading-manifest.json');
assert.deepEqual(reading.parts.map(p=>p.questions.length),[20,22]);
assert.deepEqual(reading.parts.map(p=>p.pages.map(page=>page.pdfPage)),[[133,134,135,136,137],[137,138,139,140]]);
assert.deepEqual(reading.parts[0].pages.at(-1),reading.parts[1].pages[0]);assert.ok(reading.parts.every(p=>p.pageNote.includes('137')));
assert.deepEqual([manifest.questions,manifest.scoredQuestions,manifest.pages.length],[42,42,8]);assert.deepEqual(manifest.unscored,[]);
assert.deepEqual([manifest.keyPdfPage,manifest.keyPrintedPage],[8,175]);
const publisherAnswers=[['B','B','A','B','Private wells','Drinking bottled water','Pesticides','Level of lead','Laboratory test results','Listing the minerals','Minerals','Sulfur','NO','YES','NOT GIVEN','NO','NO','YES','YES','NOT GIVEN'],['D','A','B','F','C','E','NOT GIVEN','YES','YES','NO','NO','NOT GIVEN','studying','disability','retirement','experience','doubled','Complement','unemployed','benefits','pension schemes','pension']];
for(const [i,part]of reading.parts.entries()){
 assert.deepEqual(part.questions.map(q=>q.publisherAnswer.toLowerCase()),publisherAnswers[i].map(a=>a.toLowerCase()));
 for(const q of part.questions){assert.equal(q.publisherKeyPrintedPage,175);assert.ok(!q.unscored);assert.ok(q.explanation&&q.evidence);}
}
for(const spelling of ['sulfur','taste of sulfur','sulphur','taste of sulphur'])assert.ok(reading.parts[0].questions[11].accepted.some(a=>a.toLowerCase()===spelling));
assert.equal(read('source-assets/unit-16/publisher-key.json').parts[0].answers[11].printedAnswer,'(Taste of) Sulfur');
assert.equal(reading.parts[0].questions[19].answer,'NOT GIVEN');
console.log('PASS: Unit 16 has all 44 supplied words and pictures, complete game clozes, 42 publisher-checked Reading questions and 8 original pages.');
