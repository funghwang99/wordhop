const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.join(__dirname,'../dist');
const context={window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{getItem(){return null;}},setTimeout,clearTimeout};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'reading.js'),'utf8'),context);
const {validate,grade}=context.window.WordHopReading;
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data.js'),'utf8').replace(/^window\.WQ_CATALOG = /,'').replace(/;\s*$/,''));
const units=catalog.units.filter(u=>u.readingFile);assert.equal(units.length,8);
let questions=0,scored=0,excluded=[],images=new Set();
for(const unit of units){
  assert.equal(unit.bookId,'simply-pet');
  assert.ok(!unit.readingFile.startsWith('/'));
  const file=path.join(root,unit.readingFile),bytes=fs.readFileSync(file),data=JSON.parse(bytes);
  assert.ok(file.includes(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12)));
  validate(data,unit.id);assert.equal(data.parts.length,6);
  for(const part of data.parts){
    assert.ok(part.width>=1000&&part.height>=1400);
    assert.ok(fs.existsSync(path.join(root,part.image)));images.add(part.image);
    for(const q of part.questions){
      questions++;
      if(q.unscored){assert.equal(grade(q,q.answer),null);assert.ok(q.reviewNote);excluded.push([unit.id,q.number]);continue;}
      scored++;
      assert.equal(grade(q,q.answer),true);
      for(const answer of q.accepted||[q.answer])assert.equal(grade(q,'  '+answer.toUpperCase()+'  '),true);
      assert.equal(grade(q,''),false);assert.equal(grade(q,'clearly incorrect answer'),false);
      if(q.options)for(const answer of q.options)assert.equal(grade(q,answer),answer===q.answer);
    }
  }
  const bad=JSON.parse(JSON.stringify(data));bad.parts[0].questions[0].number=2;
  assert.throws(()=>validate(bad,unit.id),/incomplete/);
}
assert.equal(questions,256);assert.equal(scored,254);assert.equal(images.size,47);
assert.deepEqual(excluded,[['simply-pet-test-7',4],['simply-pet-test-8',11]]);
const last=JSON.parse(fs.readFileSync(path.join(root,units.find(u=>u.id==='simply-pet-test-8').readingFile),'utf8'));
assert.equal(last.parts[4].pdfPage,129);assert.equal(last.parts[5].pdfPage,129);assert.equal(last.parts[4].image,last.parts[5].image);
console.log('PASS: 8 complete reading tests, 48 parts, 256 questions and 47 original book pages.');
console.log('PASS: case and spacing normalisation, valid alternative words, wrong and blank answers; 2 imprecise source questions excluded.');
