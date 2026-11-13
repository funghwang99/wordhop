'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/trainer/audio-manifest.json'),'utf8'));
const tracks=manifest.tracks;
assert.equal(manifest.book,'trainer');
assert.equal(manifest.mode,'exam');
assert.equal(manifest.totalSourceTracks,57);
assert.equal(manifest.selectedTracks,30);
assert.equal(tracks.length,30);
assert.equal(new Set(tracks.map(x=>x.track)).size,30);
assert.equal(new Set(tracks.map(x=>x.src)).size,30);
assert.equal(manifest.excludedTrainingTracks.length,27);
assert.deepEqual([...new Set(tracks.map(x=>x.test))].sort(),[1,2,3,4,5,6]);
const expected={
 1:[3,6,9,12,14,16,17,18,20,23],
 2:[28,32,35,36],
 3:[42,43,44,45],
 4:[46,47,48,49],
 5:[50,51,52,53],
 6:[54,55,56,57],
};
const training=new Set(manifest.excludedTrainingTracks);
assert.equal(training.size,27);
for(const test of Object.keys(expected)){
 const got=tracks.filter(x=>x.test===Number(test)).map(x=>x.track).sort((a,b)=>a-b);
 assert.deepEqual(got,expected[test]);
 const listening=tracks.filter(x=>x.test===Number(test)&&x.skill==='listening');
 assert.deepEqual(listening.map(x=>x.part),[1,2,3,4]);
}
for(const track of tracks){
 assert.equal(training.has(track.track),false);
 assert.ok(Number.isFinite(track.duration)&&track.duration>10);
 assert.match(track.src,/^audio\/trainer\/test-[1-6]\/(?:listening-part-[1-4]|speaking-part-[1-4](?:-sample-[1-3])?)\.mp3$/);
 assert.match(track.skill,/^(listening|speaking)$/);
 if(track.skill==='speaking')assert.equal(track.test,1);
}
assert.equal(tracks.filter(x=>x.skill==='listening').length,24);
assert.equal(tracks.filter(x=>x.skill==='speaking').length,6);
assert.deepEqual(manifest.bundles.map(x=>x.file),[
 'trainer_exam_audio_tests_1_2.zip',
 'trainer_exam_audio_tests_3_4.zip',
 'trainer_exam_audio_tests_5_6.zip'
]);
const script=fs.readFileSync(path.join(root,'dist/trainer.js'),'utf8');
new Function(script);
assert.match(script,/trainer\/audio-manifest[.]json/);
assert.match(script,/showExamAudio/);
assert.match(script,/data-trainer-audio-speed/);
assert.equal(fs.existsSync(path.join(root,'dist/audio/trainer')),false);
console.log('PASS: Trainer Exam Practice mapped to 30 correct recordings, 27 Training tracks excluded, all 6 Listening tests covered.');
