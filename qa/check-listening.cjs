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
let count=0;const seen=new Set(),sourceIssues=[];
for(const unit of catalog.units){
 const test=Number(unit.id.match(/^simply-pet-test-([1-8])$/)?.[1]);
 if(test>=1&&test<=8){
  assert.deepEqual(unit.listening.map(p=>p.id),['part-1','part-2','part-3','part-4']);
  for(const [i,track] of unit.listening.entries()){
   count++;assert.ok(!seen.has(track.src));seen.add(track.src);
   const source=manifest.tracks.find(item=>item.test===test&&item.part===i+1);
   assert.ok(source);assert.equal(track.src,source.asset);assert.equal(track.duration,source.durationSeconds);
   assert.equal(source.sourceFilename,`Test ${test} Part ${i+1}.mp3`);
   assert.ok(track.src.startsWith('audio/simply-pet/')&&!track.src.includes('..'));
   const bytes=fs.readFileSync(path.join(root,'dist',track.src));
   const hash=crypto.createHash('sha256').update(bytes).digest('hex');
   assert.equal(hash,source.sourceSha256);assert.ok(track.src.includes(hash.slice(0,12)));
   assert.equal(bytes.length,source.bytes);assert.ok(track.duration>200&&track.duration<900);
   assert.equal(source.codec_name,'mp3');assert.equal(source.channels,2);
   if(source.decodeReview.status==='passed')assert.equal(track.sourceWarning,undefined);
   else{assert.equal(source.decodeReview.status,'damaged-data');assert.match(track.sourceWarning,/damaged audio data/);sourceIssues.push([test,i+1]);}
   const route=context.parseRoute(`#/pet/simply-pet/${unit.id}/listening/${track.id}`);
   assert.equal(route.unit.id,unit.id);assert.equal(route.view,'listening');assert.equal(route.listeningPart,track.id);
  }
 }else assert.equal(unit.listening,undefined);
}
assert.equal(count,32);
assert.equal(context.parseRoute('#/pet/simply-pet/simply-pet-test-1/reading/part-6').readingPart,'part-6');
console.log('PASS: all 32 original MP3s match source SHA-256, filename, test, part, duration and channel metadata.');
console.log('PASS: direct links reach every listening part; Reading routes and tests without supplied audio are preserved.');
console.log(`PASS: ${count-sourceIssues.length} fully decoded recordings; all ${sourceIssues.length} supplied recording issues have visible source warnings.`);
