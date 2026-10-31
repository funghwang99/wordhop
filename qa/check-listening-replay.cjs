const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../dist/listening.js'),'utf8');
const timers=new Map();let sequence=0;
const context={window:{addEventListener(){}},document:{addEventListener(){}},localStorage:{getItem(){return null;}},setTimeout(fn){const id=++sequence;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
vm.createContext(context);vm.runInContext(source,context);
const {cueRange,createReplayController}=context.window.WordHopListening;
class Audio {
 constructor(){this.currentTime=0;this.duration=100;this.readyState=4;this.seeking=false;this.paused=true;this.ended=false;this.playbackRate=1;this.listeners=new Map();this.playCalls=0;this.pauseCalls=0;}
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
 removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
 emit(name){for(const fn of [...this.listeners.get(name)||[]])fn();}
 play(){this.playCalls++;this.paused=false;this.emit('playing');return this.playResult||Promise.resolve();}
 pause(){this.pauseCalls++;this.paused=true;this.emit('pause');}
 advance(time){this.currentTime=time;this.emit('timeupdate');}
}
(async()=>{
 const audio=new Audio(),events=[],controller=createReplayController(audio,event=>events.push(event));
 assert.deepEqual(JSON.parse(JSON.stringify(cueRange({evidenceStart:10,evidenceEnd:12},100))),{start:9.25,end:12.9});
 assert.equal(cueRange({evidenceStart:10,evidenceEnd:9},100),null);
 assert.equal(cueRange({evidenceStart:101,evidenceEnd:102},100),null);
 assert.equal(cueRange({evidenceStart:NaN,evidenceEnd:12},100),null);
 assert.deepEqual(JSON.parse(JSON.stringify(cueRange({evidenceStart:0.2,evidenceEnd:99.8},100))),{start:0,end:100});
 controller.toggle(1,{start:10,end:13});await Promise.resolve();
 assert.equal(audio.currentTime,10);assert.equal(audio.paused,false);assert.equal(controller.question,1);
 audio.advance(12);assert.equal(audio.paused,false);audio.advance(13.05);
 assert.equal(audio.paused,true);assert.equal(controller.question,null);assert.equal(events.at(-1).status,'ended');assert.equal(timers.size,0);
 controller.toggle(1,{start:10,end:13});await Promise.resolve();
 audio.currentTime=13.01;const scheduled=[...timers.values()][0];assert.equal(typeof scheduled,'function');scheduled();
 assert.equal(audio.paused,true,'End timer must stop playback between native timeupdate events');assert.equal(timers.size,0);
 // Switching answers seeks the same player and clears the previous end boundary.
 controller.toggle(1,{start:10,end:13});controller.toggle(2,{start:30,end:33});await Promise.resolve();
 assert.equal(controller.question,2);assert.equal(audio.currentTime,30);audio.advance(31);assert.equal(audio.paused,false);
 controller.toggle(2,{start:30,end:33});assert.equal(audio.paused,true);assert.equal(events.at(-1).status,'stopped');assert.equal(timers.size,0);
 // First replay works with preload=none: reposition after metadata arrives.
 audio.readyState=0;controller.toggle(3,{start:40,end:44});audio.currentTime=0;audio.readyState=1;audio.emit('loadedmetadata');
 assert.equal(audio.currentTime,40);audio.readyState=4;audio.emit('seeked');audio.emit('playing');
 audio.advance(44.1);assert.equal(audio.paused,true);assert.equal(controller.question,null);
 // Speed changes reschedule the end against media time; buffering must not stop a clip early.
 controller.toggle(4,{start:50,end:56});await Promise.resolve();audio.playbackRate=1.5;audio.emit('ratechange');
 assert.ok(timers.size>0);audio.emit('waiting');assert.equal(timers.size,0);assert.equal(controller.question,4);
 audio.emit('playing');assert.ok(timers.size>0);audio.advance(56.1);assert.equal(audio.paused,true);
 // Native pause stops replay. Seeking outside it returns control to the full recording.
 controller.toggle(5,{start:60,end:66});await Promise.resolve();audio.pause();assert.equal(controller.question,null);
 controller.toggle(5,{start:60,end:66});await Promise.resolve();audio.currentTime=80;audio.emit('seeked');
 assert.equal(controller.question,null);assert.equal(audio.paused,false);audio.advance(90);assert.equal(audio.paused,false);
 controller.stop();assert.equal(audio.paused,false,'Retry must preserve ordinary full-part playback');
 controller.toggle(6,{start:10,end:15});controller.stop();assert.equal(audio.paused,true);assert.equal(controller.question,null);
 // A denied play request can be retried, without a stale rejection stopping a newer answer.
 let rejectOld;audio.playResult=new Promise((_,reject)=>{rejectOld=reject;});controller.toggle(7,{start:20,end:25});
 audio.playResult=Promise.resolve();controller.toggle(8,{start:30,end:35});rejectOld(new Error('old request cancelled'));await Promise.resolve();await Promise.resolve();
 assert.equal(controller.question,8);assert.equal(audio.paused,false);
 audio.playResult=Promise.reject(new Error('play unavailable'));controller.toggle(9,{start:40,end:45});await Promise.resolve();await Promise.resolve();
 assert.equal(controller.question,null);assert.equal(audio.paused,true);assert.equal(events.at(-1).status,'error');
 audio.playResult=Promise.resolve();controller.toggle(9,{start:40,end:45});await Promise.resolve();assert.equal(controller.question,9);
 audio.emit('error');assert.equal(controller.question,null);assert.equal(events.at(-1).status,'error');
 controller.toggle(10,{start:50,end:55});controller.dispose();const count=events.length;audio.emit('loadedmetadata');audio.emit('playing');audio.advance(54);await Promise.resolve();
 assert.equal(events.length,count);assert.equal(audio.paused,true);assert.equal(timers.size,0);assert.ok([...audio.listeners.values()].every(set=>set.size===0));
 console.log('PASS: bounded answer replays, preload-none seeking, switching/stopping, speed/buffering, native playback, retry/error and navigation cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
