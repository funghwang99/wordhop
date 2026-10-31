const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'../dist');
const context={window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{getItem(){return null;}},setTimeout,clearTimeout};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'reading.js'),'utf8'),context);
const {validate,grade}=context.window.WordHopReading;
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const units=catalog.units.filter(u=>u.readingFile);assert.equal(units.length,21);
const expectedBasic=[[10,16],[20,16],[16,20],[20,16],[17,19],[17,18],[19,18],[20,18],[19,20]];
const publisher=JSON.parse(fs.readFileSync(path.join(__dirname,'../source-assets/basic-ielts-reading/publisher-answer-key.json'),'utf8'));
const publisherUnits=new Map(publisher.units.map(u=>[u.id,u]));
assert.equal(publisher.reviewedQuestionCount,319);
let publisherChecked=0;
const totals={};const excluded=[];
for(const unit of units){
  const simply=unit.bookId==='simply-pet',authentic=unit.bookId==='authentic-1',pet=simply||authentic;assert.ok(pet||unit.bookId==='basic-ielts-reading');
  const total=totals[unit.bookId]||={units:0,parts:0,questions:0,scored:0,images:new Set()};total.units++;
  assert.ok(!unit.readingFile.startsWith('/'));
  const file=path.join(root,unit.readingFile),bytes=fs.readFileSync(file),data=JSON.parse(bytes);
  assert.ok(file.includes(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12)));
  validate(data,unit.id);assert.equal(data.parts.length,pet?6:2);
  if(simply)assert.match(data.source.answerKeyOrigin,/not a publisher-provided/);
  else{assert.match(data.source.answerKeyOrigin,/Checked against the supplied publisher/);if(!authentic)assert.equal(data.source.answerKeyPdfSha256,publisher.sourceSha256);}
  if(pet)assert.deepEqual(data.parts.flatMap(p=>p.questions.map(q=>q.number)),Array.from({length:32},(_,i)=>i+1));
  else assert.deepEqual(data.parts.map(p=>p.questions.length),expectedBasic[Number(unit.id.split('-').at(-1))-4]);
  for(const part of data.parts){
    total.parts++;
    if(!pet)assert.deepEqual(part.questions.map(q=>q.number),Array.from({length:part.questions.length},(_,i)=>i+1));
    for(const page of part.pages||[part]){
      assert.ok(page.width>=1000&&page.height>=1400);
      const img=fs.readFileSync(path.join(root,page.image));total.images.add(page.image);
      assert.ok(page.image.includes(crypto.createHash('sha256').update(img).digest('hex').slice(0,12)));
    }
    for(const q of part.questions){
      total.questions++;
      if(!pet){
        const key=publisherUnits.get(unit.id).parts.find(p=>p.id===part.id).answers.find(k=>k.number===q.number);
        assert.ok(key,`${unit.id} ${part.id} Q${q.number}: missing publisher record`);
        assert.equal(q.publisherAnswer,key.answer);publisherChecked++;
        if(!q.unscored)for(const answer of key.accepted)assert.equal(grade(q,answer),true,`${unit.id} ${part.id} Q${q.number}: publisher answer ${answer} rejected`);
      }
      if(q.unscored){assert.equal(grade(q,q.answer),null);assert.ok(q.reviewNote);excluded.push([unit.id,q.number]);continue;}
      total.scored++;
      assert.equal(grade(q,q.answer),true);
      for(const answer of q.accepted||[q.answer])assert.equal(grade(q,'  '+answer.toUpperCase()+'  '),true);
      assert.equal(grade(q,''),false);assert.equal(grade(q,'clearly incorrect answer'),false);
      if(q.multiple){
        const expected=q.answer.split(',').map(x=>x.trim());
        assert.equal(grade(q,[...expected].reverse()),true);
        assert.equal(grade(q,expected.slice(1)),false);
        assert.equal(grade(q,[...expected,expected[0]]),false);
        assert.equal(grade(q,[...expected,q.options.find(x=>!expected.includes(x))]),false);
        assert.equal(grade(q,[expected[0],expected[0],expected[1]]),false);
      }else if(q.options)for(const answer of q.options)assert.equal(grade(q,answer),(q.accepted||[q.answer]).includes(answer));
    }
  }
  const bad=JSON.parse(JSON.stringify(data));bad.parts[0].questions[0].number=2;
  assert.throws(()=>validate(bad,unit.id),/incomplete/);
  const missing=JSON.parse(JSON.stringify(data));missing.parts[0].pages=[];
  assert.throws(()=>validate(missing,unit.id),/pages/);
}
for(const [book,expected] of [['simply-pet',[8,48,256,254,47]],['basic-ielts-reading',[9,18,319,317,60]],['authentic-1',[4,24,128,128,40]]]){
 const t=totals[book];assert.deepEqual([t.units,t.parts,t.questions,t.scored,t.images.size],expected);
}
assert.equal(publisherChecked,319);
assert.deepEqual(excluded,[['bir-unit-8',1],['bir-unit-12',5],['simply-pet-test-7',4],['simply-pet-test-8',11]]);
const last=JSON.parse(fs.readFileSync(path.join(root,units.find(u=>u.id==='simply-pet-test-8').readingFile),'utf8'));
assert.equal(last.parts[4].pdfPage,129);assert.equal(last.parts[5].pdfPage,129);assert.equal(last.parts[4].image,last.parts[5].image);
console.log('PASS: Simply PET 256, Authentic 1 128 and IELTS 319 Reading questions across 147 original pages.');
console.log('PASS: all 319 IELTS questions checked against publisher records; every scored publisher answer and optional form accepted.');
console.log('PASS: alternative answers, case/spacing, exact unordered multi-select, wrong/blank answers and 4 documented source questions excluded.');
