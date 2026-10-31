'use strict';
(() => {
const storageKey='wordhop.listening.v1',cache=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grade=(question,value)=>window.WordHopReading.grade(question,value);
let player=null,replays=null,active=null,progress={},saveTimer=null,saveWarning=false;
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');if(saved?.version===1&&saved.tests&&typeof saved.tests==='object'&&!Array.isArray(saved.tests))progress=saved.tests;}catch{}
function persist(){
 clearTimeout(saveTimer);saveTimer=null;
 try{localStorage.setItem(storageKey,JSON.stringify({version:1,tests:progress}));}
 catch{if(!saveWarning){active?.toast?.('Your browser could not save your listening answers. You can still complete and check this part.');saveWarning=true;}}
}
function attempt(unitId,partId){
 const test=progress[unitId]||={};
 if(!test[partId]||typeof test[partId]!=='object'||!test[partId].answers||typeof test[partId].answers!=='object'||Array.isArray(test[partId].answers))test[partId]={answers:{},checked:false};
 return test[partId];
}
function stop(){
 replays?.dispose();replays=null;
 if(saveTimer)persist();active=null;
 if(player){player.pause();player.removeAttribute('src');player.load();player=null;}
}
function time(seconds){const value=Math.floor(seconds);return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');}
function cueRange(question,duration){
 const start=question.evidenceStart,end=question.evidenceEnd;
 if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(duration)||start<0||end<=start||start>=duration)return null;
 return {start:Math.max(0,start-0.75),end:Math.min(duration,end+0.9)};
}
function createReplayController(audio,notify){
 let clip=null,timer=null,disposed=false;
 const listeners=[];
 const on=(event,handler)=>{audio.addEventListener(event,handler);listeners.push([event,handler]);};
 const clearTimer=()=>{clearTimeout(timer);timer=null;};
 function finish(status='idle',pause=false,message=''){
  const previous=clip;clip=null;clearTimer();
  if(pause)audio.pause();
  if(previous)notify({question:previous.question,status,message});
 }
 function fail(){finish('error',true,'Audio could not be played. Try again or use the main player above.');}
 function update(status){if(clip){clip.status=status;notify({question:clip.question,status});}}
 function check(){
  clearTimer();
  if(!clip||disposed||clip.awaitingMetadata||audio.seeking||audio.readyState<2)return;
  if(audio.currentTime>=clip.end-0.02){finish('ended',true);return;}
  if(!audio.paused)timer=setTimeout(check,Math.max(30,Math.min(1000,(clip.end-audio.currentTime)/audio.playbackRate*1000)));
 }
 function seek(){
  if(!clip)return;
  try{audio.currentTime=clip.start;}
  catch{if(audio.readyState>0)fail();}
 }
 function toggle(question,range){
  if(disposed||!range||!Number.isFinite(range.start)||!Number.isFinite(range.end)||range.start<0||range.end<=range.start)return;
  if(clip?.question===question){finish('stopped',true);return;}
  finish();
  const next=clip={question,...range,awaitingMetadata:audio.readyState<1,status:'loading'};
  update('loading');seek();
  if(clip!==next)return;
  try{
   const pending=audio.play();
   pending?.then(()=>{if(clip===next&&!disposed){update('playing');check();}}).catch(()=>{if(clip===next&&!disposed)fail();});
  }catch{if(clip===next)fail();}
 }
 on('loadedmetadata',()=>{if(clip?.awaitingMetadata){clip.awaitingMetadata=false;seek();}});
 on('playing',()=>{if(clip){update('playing');check();}});
 on('timeupdate',check);
 on('ratechange',check);
 on('seeked',()=>{
  if(!clip||clip.awaitingMetadata)return;
  if(audio.currentTime<clip.start-0.25||audio.currentTime>clip.end+0.25)finish();
  else check();
 });
 on('waiting',()=>{clearTimer();if(clip)update('loading');});
 on('pause',()=>{if(clip&&audio.paused)finish('stopped');});
 on('ended',()=>finish('ended'));
 on('error',()=>{if(clip)fail();});
 on('emptied',()=>finish());
 return {toggle,stop(){if(clip)finish('idle',true);},dispose(){if(disposed)return;disposed=true;finish('idle',true);for(const [event,handler]of listeners)audio.removeEventListener(event,handler);},get question(){return clip?.question??null;}};
}
function replayMarkup(question,context){
 const cue=cueRange(question,context.track.duration);
 if(!cue)return '';
 return `<div class="listening-replay"><button class="btn listening-replay-button" type="button" data-listening-replay="${question.number}" aria-label="Listen to this answer for Question ${question.number}" aria-pressed="false"><svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true"><path class="replay-play-icon" d="M6 3.5 16 10 6 16.5Z"/><path class="replay-stop-icon" d="M5 5h10v10H5Z"/></svg><span data-replay-label>Listen to this answer</span></button><span class="listening-replay-range">${time(cue.start)}–${time(cue.end)}</span><span class="listening-replay-message" data-replay-message role="status" aria-live="polite"></span></div>`;
}
function replayState(context,event){
 if(!current(context))return;
 const button=document.querySelector(`[data-listening-replay="${event.question}"]`);
 if(!button)return;
 const playing=['loading','playing'].includes(event.status),holder=button.parentElement;
 button.classList.toggle('is-replaying',playing);button.setAttribute('aria-pressed',String(playing));
 button.setAttribute('aria-label',(playing?'Stop replay':'Listen to this answer')+' for Question '+event.question);
 button.querySelector('[data-replay-label]').textContent=playing?'Stop replay':'Listen to this answer';
 holder.querySelector('[data-replay-message]').textContent=event.message||({loading:'Loading audio…',playing:'Playing the key information.',ended:'Replay finished.',stopped:'Replay stopped.'}[event.status]||'');
}
function current(context){return active===context&&context.isCurrent();}
function validate(data,unitId){
 if(data?.id!==unitId||!Array.isArray(data.parts)||data.parts.length!==4||!data.source?.title||!data.source.publisher)throw new Error('Listening data mismatch');
 const numbers=[];
 for(const [index,part]of data.parts.entries()){
  if(part.id!=='part-'+(index+1)||!Array.isArray(part.questions)||part.questions.length!==[7,6,6,6][index]||!Array.isArray(part.pages)||!part.pages.length||typeof part.instructions!=='string')throw new Error('Invalid listening part');
  for(const page of part.pages)if(!/^assets\/listening\/[\w.-]+\.webp$/.test(page.image)||!(page.width>0)||!(page.height>0))throw new Error('Invalid listening page');
  for(const q of part.questions){
   if(!Number.isInteger(q.number)||!q.prompt||typeof q.answer!=='string'||!q.answer.trim()||!q.explanation?.trim()||!q.evidence?.trim())throw new Error('Incomplete listening answer');
   if(!Array.isArray(q.accepted)||!q.accepted.includes(q.answer)||q.accepted.some(a=>typeof a!=='string'||!a.trim()))throw new Error('Invalid accepted answers');
   if(!Number.isFinite(q.evidenceStart)||!Number.isFinite(q.evidenceEnd)||q.evidenceStart<0||q.evidenceEnd<=q.evidenceStart)throw new Error('Invalid listening replay timestamps');
   if(index===2?q.options!==undefined:(!Array.isArray(q.options)||q.options.join(',')!=='A,B,C'||!q.options.includes(q.answer)))throw new Error('Invalid listening options');
   numbers.push(q.number);
  }
 }
 if(numbers.join(',')!==Array.from({length:25},(_,i)=>i+1).join(','))throw new Error('Incomplete listening test');
 return data;
}
function load(unit){
 if(!cache.has(unit.listeningFile))cache.set(unit.listeningFile,fetch(unit.listeningFile).then(r=>{if(!r.ok)throw new Error('Listening unavailable');return r.json();}).then(data=>validate(data,unit.id)).catch(error=>{cache.delete(unit.listeningFile);throw error;}));
 return cache.get(unit.listeningFile);
}
function updateCompletion(context){
 if(!context.data)return;
 document.querySelector('#listening-completion').textContent=context.data.parts.filter(p=>attempt(context.unit.id,p.id).checked).length+'/4 parts checked';
 for(const p of context.data.parts){const indicator=document.querySelector(`[data-listening-status="${p.id}"]`);if(indicator)indicator.innerHTML=attempt(context.unit.id,p.id).checked?'<span class="visually-hidden">, checked</span><span aria-hidden="true"> ✓</span>':'';}
}
function inputMarkup(q,saved){
 const id='listening-q-'+q.number,value=String(saved.answers[q.number]??''),disabled=saved.checked?'disabled':'';
 const control=q.options
  ?`<select id="${id}" name="q-${q.number}" data-listening-number="${q.number}" ${disabled}><option value="">Choose</option>${q.options.map(option=>`<option value="${option}" ${option.toLowerCase()===value.trim().toLowerCase()?'selected':''}>${option}</option>`).join('')}</select>`
  :`<input id="${id}" name="q-${q.number}" data-listening-number="${q.number}" value="${esc(value)}" maxlength="80" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Your answer" ${disabled}>`;
 return `<div class="reading-answer-row${saved.checked?(grade(q,value)?' reading-correct':' reading-incorrect'):''}"><label for="${id}">Question ${q.number}<span class="visually-hidden">: ${esc(q.prompt)}</span></label>${control}${saved.checked?`<span class="reading-answer-state">${grade(q,value)?'Correct':value.trim()?'Review':'Not answered'}</span>`:''}</div>`;
}
function drawAnswers(context){
 if(!current(context)||!context.part)return;
 const part=context.part,saved=attempt(context.unit.id,part.id),correct=part.questions.filter(q=>grade(q,saved.answers[q.number])).length;
 document.querySelector('#listening-answers').innerHTML=`<form class="reading-answer-sheet" data-listening-form="true"><div class="reading-sheet-heading"><div><h3>Answer sheet</h3><p>${esc(part.instructions)}${part.id==='part-3'?' No word bank.':''}</p></div>${saved.checked?`<strong class="reading-score" tabindex="-1" role="status">${correct}/${part.questions.length} correct</strong>`:''}</div><div class="reading-answer-inputs">${part.questions.map(q=>inputMarkup(q,saved)).join('')}</div><div class="reading-submit-row">${saved.checked?'<button class="btn" type="button" data-listening-action="retry">Try this part again</button>':'<button class="btn btn-primary" type="submit">Check answers</button>'}<button class="text-button" type="button" data-listening-action="back-to-page">Back to book page ↑</button></div></form>
 ${saved.checked?`<section class="reading-solutions" aria-labelledby="listening-solutions-title"><h3 id="listening-solutions-title">Answer key &amp; explanations</h3><p class="reading-solution-note">WordHop answer key and explanations based on the recording. Replay the key information beside each explanation.</p>${part.questions.map(q=>{const value=String(saved.answers[q.number]??''),ok=grade(q,value);return `<article class="reading-solution ${ok?'reading-correct':'reading-incorrect'}"><div class="reading-solution-top"><h4>Question ${q.number} · ${esc(q.answer)}</h4><span>${ok?'Correct':'Review'}</span></div><p class="reading-your-answer">Your answer: <strong>${value.trim()?esc(value):'Not answered'}</strong>${q.accepted.length>1?` · Also accepted: ${q.accepted.filter(a=>a!==q.answer).map(esc).join(', ')}`:''}</p><div class="listening-explanation"><p>${esc(q.explanation)}</p>${replayMarkup(q,context)}</div><blockquote><span>Evidence from the recording</span>${esc(q.evidence)}</blockquote></article>`;}).join('')}</section>`:'<p class="reading-key-note">Check your answers to see the key and an explanation for every question. Unanswered questions receive no mark.</p>'}`;
 updateCompletion(context);
}
function drawBook(context,data){
 if(!current(context))return;context.data=data;context.part=data.parts.find(p=>p.id===context.track.id);
 const part=context.part,pages=part.pages;
 document.querySelector('#listening-exercises').innerHTML=`<div class="reading-part-heading listening-book-heading"><div><h3>Book questions</h3><p>Questions ${part.questions[0].number}–${part.questions.at(-1).number} · Book ${pages.length===1?'page':'pages'} ${pages.map(p=>p.printedPage).join('–')}</p></div><div class="reading-page-actions"><button class="btn" type="button" data-listening-action="zoom" aria-pressed="false">Zoom page</button><a class="text-button" href="${esc(pages[0].image)}" target="_blank" rel="noopener">Open full-size page ↗</a></div></div>
 ${['part-3','part-4'].includes(part.id)?`<p class="reading-key-note">Parts 3 and 4 share this book page. Part ${part.id==='part-3'?'3 is in the upper':'4 is in the lower'} half.</p>`:''}
 <div class="reading-page" tabindex="0" aria-label="Original listening instructions, questions and pictures">${pages.map((page,index)=>`<img src="${esc(page.image)}" width="${page.width}" height="${page.height}" alt="${esc(context.testTitle)}, Listening ${esc(part.title)}, book page ${page.printedPage}. Original instructions, questions and answer choices." decoding="async" ${index?'loading="lazy"':''}>`).join('')}</div><div id="listening-answers"></div><p class="reading-source-note">Original questions: ${esc(data.source.title)}. ${esc(data.source.publisher)}.</p>`;
 drawAnswers(context);
}
function loadExercises(context){
 document.querySelector('#listening-exercises').innerHTML='<p class="notice" role="status">Loading book questions…</p>';
 load(context.unit).then(data=>drawBook(context,data)).catch(()=>{if(current(context))document.querySelector('#listening-exercises').innerHTML='<div class="notice" role="alert">The book questions could not be loaded. Check your connection and try again.</div><button class="btn" type="button" data-listening-action="reload">Try again</button>';});
}
function render(context){
 stop();active=context;
 const {unit,header,partId,path}=context,tracks=unit.listening,index=Math.max(0,tracks.findIndex(part=>part.id===partId)),part=tracks[index];
 context.track=part;context.testTitle=unit.title.replace(/^Reading /,'');
 const link=(track,label)=>`<a class="btn" href="${esc(path+'/listening/'+track.id)}" data-nav="${esc(path+'/listening/'+track.id)}">${esc(label)}</a>`;
 document.querySelector('#main').innerHTML=header+`<section class="listening-view" aria-labelledby="listening-title">
 <div class="listening-intro"><div><h2 id="listening-title">Listening</h2><p>Listen, answer the book questions, then check the key and explanations. Your answers are saved on this device.</p></div><span class="listening-count" id="listening-completion">${tracks.length} audio parts</span></div>
 <nav class="listening-parts" aria-label="Listening parts">${tracks.map((track,i)=>`<a class="listening-part ${i===index?'active':''}" href="${esc(path+'/listening/'+track.id)}" data-nav="${esc(path+'/listening/'+track.id)}" ${i===index?'aria-current="page"':''}><strong>${esc(track.title)}<span data-listening-status="${track.id}"></span></strong><span>${time(track.duration)}</span></a>`).join('')}</nav>
 <div class="listening-player-card"><div class="listening-player-heading"><div><p class="section-label">${esc(context.testTitle)} · Listening</p><h3>${esc(part.title)}</h3></div><span class="listening-duration">${time(part.duration)}</span></div>
 <audio id="listening-audio" controls preload="none" src="${esc(part.src)}" aria-label="${esc(context.testTitle+' '+part.title+' listening audio')}">Your browser does not support audio playback.</audio>
 <div class="listening-tools"><label for="listening-speed">Playback speed <select id="listening-speed" aria-label="Playback speed"><option value="0.75">0.75×</option><option value="1" selected>1× · Normal</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label><a class="text-button" href="${esc(part.src)}" target="_blank" rel="noopener">Open audio file ↗</a></div>
 <div id="listening-error" class="notice" role="alert" hidden><span id="listening-error-message"></span> <button class="text-button" id="listening-retry" type="button">Reload audio</button></div>
 </div><div id="listening-exercises"></div><div class="listening-navigation">${index?link(tracks[index-1],'← Previous part'):'<span></span>'}${index<tracks.length-1?link(tracks[index+1],'Next part →'):'<span></span>'}</div></section>`;
 player=document.querySelector('#listening-audio');const audio=player,error=document.querySelector('#listening-error');
 replays=createReplayController(audio,event=>replayState(context,event));
 audio.addEventListener('error',()=>{if(player!==audio)return;document.querySelector('#listening-error-message').textContent=audio.error&&[3,4].includes(audio.error.code)?'Your browser could not play this audio. Try reloading it and playing from the beginning, or open the audio file.':'Audio could not be loaded. Check your connection, then try again.';error.hidden=false;});
 audio.addEventListener('canplay',()=>{if(player===audio)error.hidden=true;});
 document.querySelector('#listening-speed').addEventListener('change',event=>{audio.playbackRate=Number(event.target.value);});
 document.querySelector('#listening-retry').addEventListener('click',()=>{error.hidden=true;audio.load();});
 if(unit.listeningFile)loadExercises(context);
}
function remember(event){const control=event.target.closest('[data-listening-number]');if(!control||!active?.part||!current(active))return;const saved=attempt(active.unit.id,active.part.id);if(saved.checked)return;saved.answers[Number(control.dataset.listeningNumber)]=control.value;clearTimeout(saveTimer);saveTimer=setTimeout(persist,250);}
document.addEventListener('input',remember);document.addEventListener('change',remember);
document.addEventListener('submit',event=>{
 if(!event.target.matches('[data-listening-form]')||!active?.part||!current(active))return;event.preventDefault();const context=active,saved=attempt(context.unit.id,context.part.id);if(saved.checked)return;
 for(const control of event.target.querySelectorAll('[data-listening-number]'))saved.answers[Number(control.dataset.listeningNumber)]=control.value;
 saved.checked=true;persist();context.onGrade?.(context.part.questions.every(q=>grade(q,saved.answers[q.number])));drawAnswers(context);
 document.querySelector('#listening-answers .reading-score')?.focus({preventScroll:true});document.querySelector('#listening-answers')?.scrollIntoView({behavior:'smooth',block:'start'});
});
document.addEventListener('click',event=>{
 const replayButton=event.target.closest('[data-listening-replay]');
 if(replayButton){
  if(!active?.part||!current(active)||!attempt(active.unit.id,active.part.id).checked)return;
  const question=active.part.questions.find(q=>q.number===Number(replayButton.dataset.listeningReplay));
  if(question)replays?.toggle(question.number,cueRange(question,active.track.duration));
  return;
 }
 const button=event.target.closest('[data-listening-action]');if(!button||!active||!current(active))return;const action=button.dataset.listeningAction;
 if(action==='reload'){loadExercises(active);return;}
 if(action==='zoom'){const page=document.querySelector('#listening-exercises .reading-page'),zoomed=page.classList.toggle('is-zoomed');button.setAttribute('aria-pressed',String(zoomed));button.textContent=zoomed?'Fit page':'Zoom page';return;}
 if(action==='back-to-page'){document.querySelector('#listening-exercises .reading-page').scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(action==='retry'&&active.part){replays?.stop();progress[active.unit.id][active.part.id]={answers:{},checked:false};persist();drawAnswers(active);document.querySelector('[data-listening-number]')?.focus({preventScroll:true});}
});
window.addEventListener('pagehide',()=>{if(saveTimer)persist();replays?.stop();player?.pause();});
window.WordHopListening={render,stop,validate,grade,cueRange,createReplayController};
})();
