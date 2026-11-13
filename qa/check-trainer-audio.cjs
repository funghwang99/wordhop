'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/trainer/audio-manifest.json'),'utf8'));
assert.equal(manifest.book,'trainer');
assert.equal(manifest.mode,'exam');
assert.equal(manifest.totalSourceTracks,57);
assert.equal(manifest.selectedTracks,24);
const tracks=manifest.tracks;
assert.equal(tracks.length,24);
assert.equal(new Set(tracks.map(x=>x.track)).size,24);
assert.equal(new Set(tracks.map(x=>x.src)).size,24);
assert.equal(manifest.excludedTrainingTracks.length,33);
const excluded=new Set(manifest.excludedTrainingTracks);
const expected={
  1:[3,6,9,12],
  2:[28,32,35,36],
  3:[42,43,44,45],
  4:[46,47,48,49],
  5:[50,51,52,53],
  6:[54,55,56,57],
};
assert.deepEqual([...new Set(tracks.map(x=>x.test))].sort(),[1,2,3,4,5,6]);
for(const [key,nums] of Object.entries(expected)){
 const test=Number(key),partTracks=tracks.filter(x=>x.test===test);
 assert.deepEqual(partTracks.map(x=>x.part),[1,2,3,4]);
 assert.deepEqual(partTracks.map(x=>x.track),nums);
}
for(const track of tracks){
 assert.equal(track.skill,'listening');
 assert.equal(excluded.has(track.track),false);
 assert.ok(Number.isFinite(track.duration)&&track.duration>10);
 assert.match(track.src,/^audio\/trainer\/test-[1-6]\/listening-part-[1-4]\.mp3$/);
}
assert.ok([14,16,17,18,20,23,41].every(n=>excluded.has(n)),'Training Speaking examples must be excluded');
assert.deepEqual(manifest.bundles.map(x=>x.file),[
 'trainer_exam_listening_tests_1_2.zip',
 'trainer_exam_listening_tests_3_4.zip',
 'trainer_exam_listening_tests_5_6.zip'
]);
const script=fs.readFileSync(path.join(root,'dist/trainer.js'),'utf8');
new Function(script);
assert.match(script,/trainer\/audio-manifest[.]json/);
assert.match(script,/showExamAudio/);
assert.match(script,/data-trainer-audio-speed/);
assert.equal(fs.existsSync(path.join(root,'dist/audio/trainer')),false);
console.log('PASS: 24 verified Listening Exam Practice tracks, 33 Training tracks excluded, 6 complete tests.');
