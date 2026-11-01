'use strict';
(() => {
const catalog=window.WQ_CATALOG;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<svg class="icon" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const normalize=v=>String(v).normalize('NFKC').toLowerCase().trim().replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/\s+/g,' ');
const shuffle=items=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
const modes={match:{title:'Matching',icon:'link',description:'Match words and definitions in sets of five. Complete every set to finish the round.'},quiz:{title:'Multiple choice',icon:'check',description:'Choose the correct definition from four options.'},cloze:{title:'Fill in the blanks',icon:'edit',description:'Complete each example sentence with a word or phrase you have studied. No word bank.'}};
const main=$('#main'),modal=$('#modal'),key='wordquest.courses.v2';
let state={seen:{},history:[],count:'all',sound:true,roundSizeVersion:1};
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved.seen==='object'&&saved.seen&&Array.isArray(saved.history)){state.seen=saved.seen;state.history=saved.history.filter(h=>h&&catalog.units.some(u=>u.id===h.unitId)&&modes[h.mode]&&Number.isFinite(h.correct)&&Number.isFinite(h.attempted)&&Number.isFinite(h.at)&&Array.isArray(h.missed)).slice(-100);if(saved.roundSizeVersion===1&&[10,20,'all'].includes(saved.count))state.count=saved.count;if(typeof saved.sound==='boolean')state.sound=saved.sound;}}catch{}
let route=null,screen='flash',study=null,game=null,result=null,currentHash=location.hash||'#/',pendingAction=null,pendingCancel=null,matchTimer=null,toastTimer=null,flashPreloadTicket=0;
const unitLoads=new Map();
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{toast('Your browser could not save your progress. You can still study and play.');}}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3800);}
function trackById(id){return catalog.tracks.find(x=>x.id===id);}
function levelById(id){return catalog.levels.find(x=>x.id===id);}
function bookById(id){return catalog.books.find(x=>x.id===id);}
function unitById(id){return catalog.units.find(x=>x.id===id);}
function booksFor(trackId,levelId){return catalog.books.filter(b=>b.trackId===trackId&&(!levelId||b.levelId===levelId));}
function unitsFor(bookId){return catalog.units.filter(u=>u.bookId===bookId);}
function unitTitle(unit){return unit.bookId==='simply-pet'?unit.title.replace(/^Reading /,''):unit.title;}
function unitSize(unit){return unit.wordCount??unit.words?.length??0;}
function loadUnitWords(unit){
 if(Array.isArray(unit.words))return Promise.resolve();
 if(!unitLoads.has(unit.id)){
  const request=fetch(unit.dataFile).then(response=>{if(!response.ok)throw new Error('Unit unavailable');return response.json();}).then(data=>{
   if(data.id!==unit.id||!Array.isArray(data.words)||data.words.length!==unitSize(unit)||data.words.some((w,i)=>w.id!==unit.wordIds[i]))throw new Error('Unit data mismatch');
   unit.words=data.words;
  }).catch(error=>{unitLoads.delete(unit.id);throw error;});
  unitLoads.set(unit.id,request);
 }
 return unitLoads.get(unit.id);
}
function bookPath(book){return '#/'+[book.trackId,book.levelId,book.id].filter(Boolean).join('/');}
function unitPath(unit){return bookPath(bookById(unit.bookId))+'/'+unit.id;}
function parseRoute(hash){let parts;try{parts=hash.replace(/^#\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);}catch{return{};}if(parts[0]==='results')return{history:true};const track=trackById(parts[0]);if(!track)return{};const r={track};let i=1;if(track.id==='ielts'){r.level=levelById(parts[i]);if(!r.level||r.level.trackId!==track.id)return r;i++;}const book=bookById(parts[i]);if(!book||book.trackId!==track.id||(r.level&&book.levelId!==r.level.id))return r;r.book=book;const unit=unitById(parts[i+1]);if(unit&&unit.bookId===book.id){r.unit=unit;r.view=['practice','game','result','reading','listening'].includes(parts[i+2])?parts[i+2]:'flash';if(r.view==='reading')r.readingPart=parts[i+3]||'part-1';if(r.view==='listening')r.listeningPart=parts[i+3]||'part-1';}return r;}
function closeModal(){modal.close();pendingAction=null;const cancel=pendingCancel;pendingCancel=null;cancel?.();}
function clearUnitResults(unit){
 const nextHistory=state.history.filter(item=>item.unitId!==unit.id);
 let historyCleared=false;
 try{localStorage.setItem(key,JSON.stringify({...state,history:nextHistory}));state.history=nextHistory;historyCleared=true;}catch{}
 const readingCleared=window.WordHopReading.clearResults(unit.id),listeningCleared=window.WordHopListening.clearResults(unit.id);
 clearTimeout(matchTimer);game=null;result=null;
 applyRoute(location.hash||'#/');
 toast(historyCleared&&readingCleared&&listeningCleared?'Saved results cleared for '+unitTitle(unit)+'.':'Some saved results could not be cleared. Check your browser storage settings and try again.');
}
function confirmClearResults(){
 const unit=route.unit;if(!unit)return;
 pendingAction=()=>clearUnitResults(unit);
 pendingCancel=()=>{if((location.hash||'#/')!==currentHash)applyRoute(location.hash||'#/');};
 $('#modal-content').innerHTML=`<h2 id="modal-title">Clear saved results?</h2><p>Clear all Reading and Listening answers and game results for <strong>${esc(unitTitle(unit))}</strong> on this device?</p><p>Your next visit will start with blank answers. Viewed flashcards will stay marked.${game&&!game.finished?' Your current round will also end.':''}</p><div class="modal-buttons"><button class="btn" data-action="stay">Cancel</button><button class="btn btn-primary" data-action="leave">Clear results</button></div>`;
 if(!modal.open)modal.showModal();
}
function guard(action,onCancel=null){if(game&&!game.finished){pendingAction=action;pendingCancel=onCancel;$('#modal-content').innerHTML=`<h2 id="modal-title">Leave this round?</h2><p>Your current round will not be saved.</p><div class="modal-buttons"><button class="btn" data-action="stay">Keep playing</button><button class="btn btn-primary" data-action="leave">Leave round</button></div>`;if(!modal.open)modal.showModal();return;}action();}
function navigate(path){guard(()=>{clearTimeout(matchTimer);game=null;result=null;study=null;if(location.hash===path)applyRoute(path);else location.hash=path;});}
function setUnitView(next,replace=false){const path=unitPath(route.unit)+(next==='flash'?'':'/'+next);if(replace||path!==currentHash)history[replace?'replaceState':'pushState'](null,'',path);currentHash=path;route=parseRoute(path);screen=next;}
function changeScreen(next){guard(()=>{clearTimeout(matchTimer);game=null;result=null;if(next==='practice'&&(screen==='game'||screen==='result')){history.back();return;}setUnitView(next);if(next==='flash'&&!study)resetStudy();render();window.scrollTo({top:0,behavior:'instant'});focusMain();});}
function focusMain(){main.focus({preventScroll:true});}
function render(){window.WordHopListening.stop();updateSoundButton();route=route||parseRoute(location.hash||'#/');$('#courses-link').classList.toggle('active',!route.history);$('#results-link').classList.toggle('active',!!route.history);$('#courses-link').setAttribute('aria-current',route.history?'false':'page');$('#results-link').setAttribute('aria-current',route.history?'page':'false');if(route.history)renderHistory();else if(route.unit)renderUnit();else if(route.book)renderBook();else if(route.level)renderLevel();else if(route.track)renderTrack();else renderHome();}
function crumbs(){const p=[{label:'Courses',path:'#/'}];if(route.track)p.push({label:route.track.title,path:'#/'+route.track.id});if(route.level)p.push({label:route.level.title,path:'#/'+route.track.id+'/'+route.level.id});if(route.book)p.push({label:route.book.title,path:bookPath(route.book)});if(route.unit)p.push({label:unitTitle(route.unit),path:unitPath(route.unit)});return `<nav class="breadcrumbs" aria-label="Breadcrumb">${p.map((x,i)=>(i?'<span class="sep" aria-hidden="true">/</span>':'')+(i===p.length-1?`<span class="current" aria-current="page">${esc(x.label)}</span>`:`<a href="${esc(x.path)}" data-nav="${esc(x.path)}">${esc(x.label)}</a>`)).join('')}</nav>`;}
function heading(title,subtitle,home=false){return `<div class="page-heading ${home?'home-heading':''}"><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>`;}
function card({path,label,title,description,meta,compact=false,empty=false}){return `<a class="nav-card ${compact?'compact':''} ${empty?'empty':''}" href="${esc(path)}" data-nav="${esc(path)}"><div class="nav-card-top"><span class="card-label ${empty?'neutral':''}">${esc(label)}</span>${icon('arrow')}</div><h2>${esc(title)}</h2>${description?`<p>${esc(description)}</p>`:''}${meta?`<span class="card-meta">${esc(meta)}</span>`:''}</a>`;}
function empty(title,description,backPath,backLabel='Choose another course'){return `<section class="empty-state">${icon('book')}<h2>${esc(title)}</h2><p>${esc(description)}</p>${backPath?`<a href="${esc(backPath)}" data-nav="${esc(backPath)}" class="btn">${esc(backLabel)} ${icon('arrow')}</a>`:''}</section>`;}
function renderHome(){main.innerHTML=heading('Vocabulary practice','Choose your course, study the flashcards, then practise with games.',true)+`<p class="section-label">Courses</p><div class="cards">${catalog.tracks.map(t=>{const books=booksFor(t.id);return card({path:'#/'+t.id,label:t.subtitle,title:t.title,description:t.description,meta:books.length?books.length+(books.length===1?' book available':' books available'):'No books yet'});}).join('')}</div><div class="flow-note"><span>Choose a level and book</span>${icon('arrow')}<span>Study flashcards</span>${icon('arrow')}<span>Practise with games</span></div>`;}
function renderTrack(){const t=route.track;if(t.id==='ielts'){main.innerHTML=crumbs()+heading('Choose your IELTS level','Each level has its own books and vocabulary.')+`<div class="cards">${catalog.levels.filter(l=>l.trackId===t.id).map(l=>{const books=booksFor(t.id,l.id);return card({path:'#/'+t.id+'/'+l.id,label:books.length?'Available':'No books yet',title:l.title,meta:books.length?books.map(b=>b.title).join(' · '):'Books will be added here',compact:true,empty:!books.length});}).join('')}</div>`;}else{const books=booksFor(t.id);main.innerHTML=crumbs()+heading(t.title,'Choose a book to study its vocabulary.')+(books.length?`<div class="cards">${books.map(bookCard).join('')}</div>`:empty('No PET books yet','PET books and vocabulary will appear here when added.','#/'));}}
function bookCard(b){const path=bookPath(b);return `<a class="nav-card compact book-card" href="${esc(path)}" data-nav="${esc(path)}"><h2>${esc(b.title)}</h2>${icon('arrow')}</a>`;}
function renderLevel(){const books=booksFor(route.track.id,route.level.id);main.innerHTML=crumbs()+heading(route.level.title,'Choose the book you are using in this course.')+(books.length?`<div class="cards">${books.map(bookCard).join('')}</div>`:empty('No books at this level yet','Vocabulary will appear here when course materials are added.','#/ielts','Choose another level'));}
function seenCount(unit){const ids=new Set(Array.isArray(state.seen[unit.id])?state.seen[unit.id]:[]);return(unit.wordIds||unit.words.map(w=>w.id)).filter(id=>ids.has(id)).length;}
function renderBook(){const b=route.book,units=unitsFor(b.id);main.innerHTML=crumbs()+heading(b.title,route.level?.title||route.track.title)+`<p class="section-label">Choose a ${esc(b.unitLabel||'unit')}</p><div class="cards">${units.map(u=>card({path:unitPath(u),label:unitSize(u)+' words',title:unitTitle(u),description:(u.readingFile?'Reading · ':'')+(u.listening?.length?'Listening · ':'')+'Flashcards · Matching · Multiple choice · Fill in the blanks',meta:'Viewed '+seenCount(u)+'/'+unitSize(u)+' flashcards',compact:true})).join('')}</div>`;}
function unitHeader(){
 const u=route.unit,practice=screen!=='flash'&&screen!=='reading'&&screen!=='listening';
 return crumbs()+`<div class="unit-heading"><div><h1>${esc(unitTitle(u))}</h1><p>${esc(route.book.title)} · ${esc(route.level?.title||route.track.title)}</p></div><div class="unit-heading-actions"><span class="unit-badge">${unitSize(u)} words</span><button class="text-button clear-results-button" type="button" data-action="clear-results">Clear saved results</button></div></div><div class="unit-tabs" role="tablist" aria-label="Study and practice"><button role="tab" class="unit-tab ${screen==='flash'?'active':''}" aria-selected="${screen==='flash'}" data-screen="flash"><span class="step-num">1</span>Study flashcards</button><button role="tab" class="unit-tab ${practice?'active':''}" aria-selected="${practice}" data-screen="practice"><span class="step-num">2</span>Practice</button>${u.readingFile?`<button role="tab" class="unit-tab ${screen==='reading'?'active':''}" aria-selected="${screen==='reading'}" data-screen="reading"><span class="step-num">3</span>Reading</button>`:''}${u.listening?.length?`<button role="tab" class="unit-tab ${screen==='listening'?'active':''}" aria-selected="${screen==='listening'}" data-screen="listening"><span class="step-num">4</span>Listening</button>`:''}</div>`;
}
function resetStudy(words){study={unitId:route.unit.id,words:words||route.unit.words,index:0,flipped:false,review:!!words};}
function renderUnit(){
 if(screen==='listening'){
  if(!route.unit.listening?.length)setUnitView('flash',true);
  else{const unit=route.unit,partId=route.listeningPart;window.WordHopListening.render({unit,header:unitHeader(),partId,path:unitPath(unit),isCurrent:()=>screen==='listening'&&route?.unit?.id===unit.id&&route.listeningPart===partId,toast,onGrade:correct=>playFeedbackSound(correct)});return;}
 }
 if(!Array.isArray(route.unit.words)){
  const unit=route.unit;
  main.innerHTML=crumbs()+heading(unit.title,route.book.title)+`<p class="notice" role="status">Loading vocabulary…</p>`;
  loadUnitWords(unit).then(()=>{if(route?.unit?.id===unit.id)renderUnit();}).catch(()=>{
   if(route?.unit?.id===unit.id)main.innerHTML=crumbs()+heading(unit.title,route.book.title)+`<div class="notice" role="alert">This unit could not be loaded. Please check your connection and try again.</div><button class="btn btn-primary" data-action="retry-unit">Try again</button>`;
  });
  return;
 }
 if(screen==='reading'){
  if(!route.unit.readingFile)setUnitView('flash',true);
  else{const unit=route.unit,partId=route.readingPart;window.WordHopReading.render({unit,header:unitHeader(),partId,path:unitPath(unit),isCurrent:()=>screen==='reading'&&route?.unit?.id===unit.id&&route.readingPart===partId,toast,onGrade:correct=>playFeedbackSound(correct)});return;}
 }
 if((screen==='game'&&!game)||(screen==='result'&&!result))setUnitView('practice',true);
 if(screen==='game')renderGame();else if(screen==='result')renderResult();else if(screen==='practice')renderPractice();else{if(!study||study.unitId!==route.unit.id)resetStudy();renderFlash();}
}
function wordRow(w){return `<div class="word-row"><div class="word-term">${esc(w.term)} <small>(${esc(w.pos)})</small></div><div><p>${esc(w.definition)}</p><em>${esc(w.example)}</em></div></div>`;}
function flashIllustration(w){
 if(w.image)return `<span class="flash-visual ${w.illustration?'has-symbol':''}">${w.illustration?`<span class="flash-symbol" aria-hidden="true">${esc(w.illustration)}</span>`:''}<img class="flash-image" src="${esc(w.image)}" alt="${esc(w.imageAlt||w.term)}" decoding="async" fetchpriority="high" draggable="false"></span>`;
 return w.illustration?`<span class="flash-visual flash-symbol" role="img" aria-label="Illustration of ${esc(w.term)}">${esc(w.illustration)}</span>`:'';
}
function renderFlash(){
 const u=route.unit,w=study.words[study.index];
 main.innerHTML=unitHeader()+`<div class="study-area"><div class="study-top"><span>${study.review?'Review words':'Flashcards'} · <strong>${study.index+1}/${study.words.length}</strong></span><button class="text-button" data-action="speak">${icon('sound')} Listen</button></div>
 <div class="flash-stage"><button class="flashcard ${study.flipped?'is-flipped':''}" data-action="flip" data-card-id="${esc(w.id)}" aria-label="Flip flashcard: ${esc(w.term)}" aria-pressed="${study.flipped}">
 <span class="flash-inner"><span class="flash-face flash-front" aria-hidden="${study.flipped}"><span class="flash-label">Vocabulary</span>${flashIllustration(w)}<span class="flash-term">${esc(w.term)}</span><span class="flash-pos">(${esc(w.pos)})</span><span class="flip-note">Tap the card to see the definition and example</span></span>
 <span class="flash-face flash-back" aria-hidden="${!study.flipped}"><span class="flash-label">Definition & example</span><span class="back-term">${esc(w.term)} <small>(${esc(w.pos)})</small></span><span class="flash-definition">${esc(w.definition)}</span><span class="flash-example">${esc(w.example)}</span></span></span></button></div>
 <span class="visually-hidden" id="flip-status" role="status" aria-live="polite"></span><div class="flash-actions"><button class="btn" data-action="previous-card" ${study.index===0?'disabled':''}>← Previous</button><button class="btn" data-action="flip">Flip card</button><button class="btn" data-action="next-card" ${study.index===study.words.length-1?'disabled':''}>Next →</button></div>
 <div class="study-bottom"><p class="study-progress">${seenCount(u)}/${u.words.length} cards viewed in this unit.<br>Use ← and → to change cards.</p><button class="btn btn-primary" data-screen="practice">Go to practice ${icon('arrow')}</button></div><details class="word-list-details"><summary>View all ${u.words.length} words in ${esc(u.title)}</summary><div class="word-list">${u.words.map(wordRow).join('')}</div></details></div>`;
 preloadNextFlashImage();
}
function preloadNextFlashImage(){
 const ticket=++flashPreloadTicket,next=study.words[study.index+1],connection=navigator.connection;
 if(!next?.image||connection?.saveData||['slow-2g','2g'].includes(connection?.effectiveType))return;
 const preload=()=>{
  if(ticket!==flashPreloadTicket||screen!=='flash')return;
  const image=new Image();image.decoding='async';image.fetchPriority='low';image.src=next.image;
 };
 const schedule=()=>{if('requestIdleCallback'in window)window.requestIdleCallback(preload,{timeout:750});else setTimeout(preload,150);};
 const visible=$('.flash-stage > .flashcard:not(.flash-outgoing) img.flash-image');
 if(visible&&!visible.complete){visible.addEventListener('load',schedule,{once:true});visible.addEventListener('error',schedule,{once:true});}else schedule();
}
function moveFlashCard(direction){
 if(!study||screen!=='flash')return;
 const nextIndex=study.index+direction;if(nextIndex<0||nextIndex>=study.words.length)return;
 const active=document.activeElement,withinStudy=active?.closest('.study-area'),fromControls=active?.closest('.flash-actions'),action=active?.closest('[data-action]')?.dataset.action;
 const position={x:window.scrollX,y:window.scrollY};
 const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const current=$('.flash-stage > .flashcard:not(.flash-outgoing)');
 const outgoing=!reduceMotion&&current?current.cloneNode(true):null;
 study.index=nextIndex;study.flipped=false;renderFlash();
 if(outgoing){
  const stage=$('.flash-stage');stage.classList.add(direction>0?'moving-next':'moving-previous');
  outgoing.classList.add('flash-outgoing');outgoing.disabled=true;outgoing.inert=true;outgoing.tabIndex=-1;
  outgoing.setAttribute('aria-hidden','true');outgoing.removeAttribute('data-action');outgoing.removeAttribute('data-card-id');
  stage.append(outgoing);
  const remove=()=>outgoing.remove();outgoing.addEventListener('animationend',remove,{once:true});setTimeout(remove,400);
 }
 if(withinStudy){
  const selector=fromControls?`.flash-actions [data-action="${CSS.escape(action)}"]`:action==='speak'?'.study-top [data-action="speak"]':'.flash-stage > .flashcard:not(.flash-outgoing)';
  const target=$(selector);if(target&&!target.disabled)target.focus({preventScroll:true});else $('.flash-stage > .flashcard:not(.flash-outgoing)').focus({preventScroll:true});
 }
 window.scrollTo(position.x,position.y);
}
function flipCard(){
 study.flipped=!study.flipped;
 if(study.flipped){const id=study.words[study.index].id,seen=new Set(Array.isArray(state.seen[route.unit.id])?state.seen[route.unit.id]:[]);seen.add(id);state.seen[route.unit.id]=[...seen];save();}
 const card=$('.flashcard');card.classList.toggle('is-flipped',study.flipped);card.setAttribute('aria-pressed',String(study.flipped));$('.flash-front',card).setAttribute('aria-hidden',String(study.flipped));$('.flash-back',card).setAttribute('aria-hidden',String(!study.flipped));
 $('.study-progress').innerHTML=`${seenCount(route.unit)}/${route.unit.words.length} cards viewed in this unit.<br>Use ← and → to change cards.`;
 const w=study.words[study.index];$('#flip-status').textContent=study.flipped?w.definition+' Example: '+w.example:'Vocabulary: '+w.term;
}
function renderPractice(){const u=route.unit;main.innerHTML=unitHeader()+`<p class="practice-intro">Choose a game to review this unit. Use All words to practise every word, or choose a shorter round below.</p><div class="practice-grid">${Object.entries(modes).map(([id,m])=>`<button class="mode-card" data-start="${id}">${icon(m.icon)}<h2>${m.title}</h2><p>${m.description}</p><span class="start-label">Start ${icon('arrow')}</span></button>`).join('')}</div><div class="practice-options"><label for="question-count">Words per round<select id="question-count"><option value="all" ${state.count==='all'?'selected':''}>All ${u.words.length} words</option><option value="10" ${state.count===10?'selected':''}>10 words</option><option value="20" ${state.count===20?'selected':''}>20 words</option></select></label><span>No time limit.</span></div>${seenCount(u)<u.words.length?`<div class="notice">Viewed ${seenCount(u)}/${u.words.length} flashcards. You can return to study before starting a game.</div>`:''}`;}
function startGame(mode){if(!modes[mode])return;warmAudio();clearTimeout(matchTimer);game={mode,items:shuffle(route.unit.words).slice(0,state.count==='all'?route.unit.words.length:state.count),index:0,offset:0,correct:0,attempted:0,missed:new Set(),answered:false,finished:false};setUnitView('game',screen==='result');if(mode==='match')prepareMatch();renderGame();window.scrollTo({top:0,behavior:'instant'});focusMain();}
function gameTop(){const g=game,total=g.items.length,done=g.mode==='match'?g.offset+g.match.matched.length:g.index;return `<button class="text-button game-back" data-screen="practice">← Back to games</button><div class="game-top"><h2>${modes[g.mode].title}</h2><span>${g.mode==='match'?`${done}/${total} pairs`:`Question ${g.index+1}/${total}`}</span></div><div class="question-progress" aria-label="Completed ${done}/${total}"><span style="width:${done/total*100}%"></span></div>`;}
function renderGame(){if(!game)return;if(game.mode==='match'){renderMatch();return;}const g=game,w=g.items[g.index];if(!w){finishGame();return;}g.answered=false;if(g.mode==='quiz'){const defs=shuffle([...new Set(route.unit.words.filter(x=>x.id!==w.id&&x.definition!==w.definition).map(x=>x.definition))]).slice(0,3);g.options=shuffle([{text:w.definition,correct:true},...defs.map(text=>({text,correct:false}))]);}main.innerHTML=unitHeader()+`<div class="game-wrap">${gameTop()}<section class="question-card">${g.mode==='quiz'?`<p class="instruction">Choose the correct definition for this word.</p><h2 class="quiz-word">${esc(w.term)}</h2><p class="question-pos">(${esc(w.pos)})</p><div class="answer-grid">${g.options.map((o,i)=>`<button class="answer" data-answer="${i}"><span class="answer-key">${String.fromCharCode(65+i)}</span><span>${esc(o.text)}</span></button>`).join('')}</div>`:`<p class="instruction">Complete the sentence with a word or phrase you have studied. Use the correct form.<br>No word bank.</p><h2 class="cloze-sentence">${w.cloze.split('________').map(esc).join('<span class="blank" aria-label="blank">________</span>')}</h2><form class="cloze-form" id="cloze-form"><label for="cloze-answer">Your answer</label><input id="cloze-answer" name="answer" aria-label="Your answer" placeholder="Type a word or phrase..." autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="100"></form>`}<div id="feedback" aria-live="polite"></div><div class="question-footer"><button class="text-button" data-action="skip">I don’t know yet</button>${g.mode==='cloze'?`<button class="btn btn-primary" form="cloze-form" type="submit">Check answer ${icon('check')}</button>`:'<p class="hint">There is one correct answer.</p>'}</div></section></div>`;if(g.mode==='cloze')$('#cloze-answer').focus({preventScroll:true});}
function record(correct){const g=game,w=g.items[g.index];g.attempted++;if(correct)g.correct++;else g.missed.add(w.id);playFeedbackSound(correct);}
function answerQuiz(index){if(!game||game.answered||game.mode!=='quiz')return;const chosen=game.options[index];if(!chosen)return;game.answered=true;$$('.answer').forEach((el,i)=>{el.disabled=true;el.classList.toggle('correct',game.options[i].correct);el.classList.toggle('incorrect',i===index&&!chosen.correct);});record(chosen.correct);feedback(chosen.correct);}
function answerCloze(){if(!game||game.answered||game.mode!=='cloze')return;const input=$('#cloze-answer');if(!input.value.trim()){toast('Enter your answer before checking.');input.focus();return;}const w=game.items[game.index],correct=w.accepted.some(x=>normalize(x)===normalize(input.value));game.answered=true;input.disabled=true;record(correct);feedback(correct);}
function skip(){if(!game||game.answered||game.mode==='match')return;game.answered=true;if(game.mode==='quiz')$$('.answer').forEach((el,i)=>{el.disabled=true;if(game.options[i].correct)el.classList.add('correct');});else $('#cloze-answer').disabled=true;record(false);feedback(false);}
function feedback(correct){const g=game,w=g.items[g.index],visual=flashIllustration(w);$('#feedback').innerHTML=`<div class="feedback ${correct?'':'wrong'}"><strong><span class="feedback-icon" aria-hidden="true">${icon(correct?'check':'close')}</span>${correct?'Correct!':g.mode==='cloze'?'Answer: '+esc(w.answer):'Review this word and try again.'}</strong><div class="feedback-body${visual?' has-illustration':''}"><div class="feedback-copy"><span class="term-line">${esc(w.term)} (${esc(w.pos)})</span>${esc(w.definition)}<em>${esc(w.example)}</em></div>${visual?`<div class="feedback-illustration">${visual}</div>`:''}</div></div>`;$('.question-footer').innerHTML=`<p class="hint">${g.correct}/${g.attempted} correct answers</p><button class="btn btn-primary" data-action="next-question">${g.index===g.items.length-1?'See results':'Next question'} ${icon('arrow')}</button>`;showAnswerEffect(correct);$('.question-footer .btn').focus({preventScroll:true});}
function showAnswerEffect(correct){
 $('.question-card')?.classList.add(correct?'has-correct-answer':'has-wrong-answer');
 const target=game.mode==='quiz'?$(correct?'.answer.correct':'.answer.incorrect'):$('#cloze-answer');
 if(target&&(game.mode!=='cloze'||target.value.trim()))target.classList.add(correct?'answer-pop':'answer-shake',correct?'is-answer-correct':'is-answer-wrong');
}
function showMatchEffect(correct,leftId,rightId){
 for(const [side,id] of [['left',leftId],['right',rightId]])$(`[data-${side}="${CSS.escape(id)}"]`)?.classList.add(correct?'answer-pop':'answer-shake');
 $('.match-status')?.classList.add(correct?'status-correct':'status-wrong','status-animate');
}
function prepareMatch(){const items=game.items.slice(game.offset,game.offset+5);game.match={items,right:shuffle(items),matched:[],left:null,rightId:null,locked:false,status:'Select a word and its matching definition.'};}
function renderMatch(focusSide,focusId){const g=game,m=g.match;main.innerHTML=unitHeader()+`<div class="game-wrap">${gameTop()}<section class="question-card"><p class="instruction match-instruction">Select a word in one column and its definition in the other.</p><div class="match-labels"><span>Vocabulary</span><span>Definition</span></div><div class="match-grid"><div class="match-column">${m.items.map(w=>matchTile(w,'left')).join('')}</div><div class="match-column">${m.right.map(w=>matchTile(w,'right')).join('')}</div></div><p class="match-status" aria-live="polite">${esc(m.status)}</p>${m.matched.length===m.items.length?`<div class="question-footer"><p class="hint">Matched ${game.offset+m.matched.length}/${g.items.length} pairs.</p><button class="btn btn-primary" data-action="next-match">${game.offset+m.items.length>=g.items.length?'See results':'Next round'} ${icon('arrow')}</button></div>`:''}</section></div>`;if(m.matched.length===m.items.length)$('[data-action="next-match"]').focus({preventScroll:true});else if(focusSide&&focusId)$(`[data-${focusSide}="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true});}
function matchTile(w,side){const m=game.match,matched=m.matched.includes(w.id),selected=(side==='left'?m.left:m.rightId)===w.id;return `<button class="match-tile ${matched?'matched':''} ${selected?'selected':''}" data-${side}="${esc(w.id)}" aria-pressed="${selected}" ${matched?'disabled':''}>${esc(side==='left'?w.term:w.definition)}${matched?' '+icon('check'):''}</button>`;}
function chooseMatch(side,id){
 if(!game||game.mode!=='match')return;
 const m=game.match;if(m.locked||m.matched.includes(id)||!m.items.some(w=>w.id===id))return;
 if(side==='left')m.left=id;else m.rightId=id;renderMatch(side,id);if(!m.left||!m.rightId)return;
 const leftId=m.left,rightId=m.rightId;game.attempted++;
 if(leftId===rightId){
  playFeedbackSound(true);game.correct++;m.matched.push(leftId);m.left=null;m.rightId=null;
  m.status=m.matched.length===m.items.length?'You have matched every pair in this round.':'Correct! Match the next pair.';
  renderMatch();showMatchEffect(true,leftId,rightId);
 }else{
  playFeedbackSound(false);game.missed.add(leftId);game.missed.add(rightId);m.locked=true;m.status='Not quite. Try another pair.';
  $('.match-status').textContent=m.status;$(`[data-left="${CSS.escape(leftId)}"]`).classList.add('wrong');$(`[data-right="${CSS.escape(rightId)}"]`).classList.add('wrong');
  showMatchEffect(false,leftId,rightId);
  matchTimer=setTimeout(()=>{if(!game||screen!=='game')return;m.left=null;m.rightId=null;m.locked=false;renderMatch('left',leftId);},850);
 }
}
function nextMatch(){const g=game;if(!g||g.mode!=='match'||g.match.matched.length!==g.match.items.length)return;g.offset+=g.match.items.length;if(g.offset>=g.items.length)finishGame();else{prepareMatch();renderMatch();window.scrollTo({top:0,behavior:'instant'});focusMain();}}
function finishGame(){if(!game||game.finished)return;game.finished=true;result={unitId:route.unit.id,mode:game.mode,correct:game.correct,attempted:game.attempted,total:game.items.length,missed:[...game.missed],at:Date.now()};state.history.push(result);state.history=state.history.slice(-100);save();setUnitView('result',true);renderResult();window.scrollTo({top:0,behavior:'instant'});focusMain();}
function renderResult(){if(!result){screen='practice';renderPractice();return;}const r=result,u=route.unit,missed=u.words.filter(w=>r.missed.includes(w.id)),accuracy=Math.round(100*r.correct/Math.max(1,r.attempted));main.innerHTML=unitHeader()+`<div class="game-wrap"><section class="result-summary"><span class="result-check">${icon('check')}</span><h2>Round complete</h2><p>${modes[r.mode].title} · ${r.total} words${r.mode==='match'?'<br>Accuracy is based on all pairing attempts.':''}</p><div class="result-numbers"><div><strong>${r.correct}/${r.attempted}</strong><small>${r.mode==='match'?'Correct matches':'Correct answers'}</small></div><div><strong>${accuracy}%</strong><small>Accuracy</small></div></div><div class="result-actions"><button class="btn btn-primary" data-start="${r.mode}">Play again ${icon('arrow')}</button><button class="btn" data-screen="practice">Choose another game</button></div></section>${missed.length?`<section class="review-section"><h2>${missed.length} ${missed.length===1?'word':'words'} to review</h2><p>Review the definitions and examples, then try another round.</p><div class="review-words">${missed.map(wordRow).join('')}</div><div class="result-actions"><button class="btn" data-action="review-missed">Review with flashcards ${icon('arrow')}</button></div></section>`:`<div class="notice">Every answer was correct. Try another game to practise the words in a different way.</div>`}</div>`;}
function renderHistory(){main.innerHTML=`<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/" data-nav="#/">Courses</a><span class="sep">/</span><span class="current">Results</span></nav>`+heading('Practice history','Rounds completed on this device.')+(state.history.length?`<div class="history-list">${state.history.slice().reverse().slice(0,30).map(r=>{const u=unitById(r.unitId),b=bookById(u.bookId);return `<div class="history-row"><div><h2>${esc(b.title)} · ${esc(u.title)}</h2><p>${modes[r.mode].title} · ${new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(r.at))}</p><a class="history-link" href="${unitPath(u)}" data-nav="${unitPath(u)}">Study this unit</a></div><div class="history-score"><strong>${Math.round(100*r.correct/Math.max(1,r.attempted))}%</strong><small>${r.correct}/${r.attempted} ${r.mode==='match'?'correct matches':'correct answers'}</small></div></div>`;}).join('')}</div>`:empty('No results yet','Complete a game to see your results here.','#/'))+`<p class="storage-note">Flashcard progress and results are saved in this browser. They do not sync across devices.</p>`;}
function speak(){const term=study?.words[study.index]?.term;if(!term)return;if(!('speechSynthesis'in window)){toast('This device does not support word pronunciation.');return;}const speech=new SpeechSynthesisUtterance(term);speech.lang='en-GB';speech.rate=.85;speech.onerror=()=>toast('The word could not be read aloud. Check that an English voice is available on your device.');speechSynthesis.cancel();speechSynthesis.speak(speech);}
function applyRoute(next){clearTimeout(matchTimer);currentHash=next;route=parseRoute(next);screen=route.view||'flash';study=null;game=null;result=null;render();window.scrollTo({top:0,behavior:'instant'});focusMain();}
function handleRoute(){const next=location.hash||'#/';if(next===currentHash||modal.open)return;if(game&&!game.finished){const previous=currentHash;guard(()=>applyRoute(location.hash||'#/'),()=>history.pushState(null,'',previous));return;}applyRoute(next);}
// Replacing a finished session does not affect previously stored results.
function startFromButton(mode){if(game&&!game.finished){guard(()=>{game=null;startGame(mode);});}else startGame(mode);}

document.addEventListener('click',event=>{const el=event.target.closest('[data-nav],[data-screen],[data-action],[data-start],[data-answer],[data-left],[data-right]');if(!el||el.disabled)return;if(el.dataset.nav){event.preventDefault();navigate(el.dataset.nav);return;}if(el.dataset.screen){changeScreen(el.dataset.screen);return;}if(el.dataset.start){startFromButton(el.dataset.start);return;}if(el.dataset.answer!==undefined){answerQuiz(Number(el.dataset.answer));return;}if(el.dataset.left){chooseMatch('left',el.dataset.left);return;}if(el.dataset.right){chooseMatch('right',el.dataset.right);return;}switch(el.dataset.action){case'clear-results':confirmClearResults();break;case'retry-unit':renderUnit();break;case'flip':flipCard();break;case'previous-card':moveFlashCard(-1);break;case'next-card':moveFlashCard(1);break;case'speak':speak();break;case'skip':skip();break;case'next-question':if(game?.answered){game.index++;renderGame();}break;case'next-match':nextMatch();break;case'review-missed':{const words=route.unit.words.filter(w=>result.missed.includes(w.id));game=null;setUnitView('flash');resetStudy(words);renderFlash();window.scrollTo({top:0,behavior:'instant'});break;}case'stay':closeModal();break;case'leave':{const action=pendingAction;modal.close();pendingAction=null;pendingCancel=null;clearTimeout(matchTimer);game=null;action?.();break;}}});
document.addEventListener('submit',event=>{if(event.target.id==='cloze-form'){event.preventDefault();answerCloze();}});
document.addEventListener('change',event=>{if(event.target.id==='question-count'){const value=event.target.value;if(['10','20','all'].includes(value)){state.count=value==='all'?'all':Number(value);save();}}});
document.addEventListener('keydown',event=>{if(modal.open||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;if(route.unit&&screen==='flash'&&study){if(event.key==='ArrowLeft'){event.preventDefault();moveFlashCard(-1);}if(event.key==='ArrowRight'){event.preventDefault();moveFlashCard(1);}}if(screen==='game'&&game?.mode==='quiz'&&!game.answered&&['1','2','3','4'].includes(event.key)){event.preventDefault();answerQuiz(Number(event.key)-1);}});
$('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView({behavior:'instant'});});
window.addEventListener('popstate',handleRoute);
window.addEventListener('hashchange',handleRoute);
window.addEventListener('beforeunload',event=>{if(game&&!game.finished){event.preventDefault();event.returnValue='';}});
modal.addEventListener('cancel',()=>{pendingAction=null;const cancel=pendingCancel;pendingCancel=null;cancel?.();});

let feedbackAudio=null;
function audioContext(){if(!state.sound)return null;const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return null;try{feedbackAudio=feedbackAudio||new Context();return feedbackAudio;}catch{return null;}}
function warmAudio(){const context=audioContext();if(context?.state==='suspended')context.resume().catch(()=>{});}
function playFeedbackSound(correct){
 const context=audioContext();if(!context)return;
 const play=()=>{if(!state.sound)return;const at=context.currentTime+.008;const notes=correct?[[659.25,0,.13],[880,.11,.19]]:[[220,0,.25]];
  for(const [frequency,delay,duration] of notes){const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,at+delay);if(!correct)oscillator.frequency.exponentialRampToValueAtTime(145,at+delay+duration);gain.gain.setValueAtTime(.0001,at+delay);gain.gain.exponentialRampToValueAtTime(correct ? 0.055 : 0.045,at+delay+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+delay+duration);oscillator.connect(gain);gain.connect(context.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};oscillator.start(at+delay);oscillator.stop(at+delay+duration+.01);}
 };
 if(context.state==='suspended')context.resume().then(play).catch(()=>{});else play();
}
function updateSoundButton(){const button=$('#sound-toggle');button.setAttribute('aria-pressed',String(state.sound));button.classList.toggle('is-muted',!state.sound);button.title=state.sound?'Mute sound effects':'Enable sound effects';$('.sound-label',button).textContent=state.sound?'Sound on':'Sound off';}
$('#sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;save();updateSoundButton();if(state.sound)playFeedbackSound(true);});

route=parseRoute(location.hash||'#/');screen=route.view||'flash';render();
})();
