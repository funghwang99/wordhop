'use strict';
(function trainer(){
 const TESTS=[
  {id:1,training:false,pages:{reading:"10–27",writing:"28–33",listening:"34–43",speaking:"44–51"}},
  {id:2,training:false,pages:{reading:"52–69",writing:"70–75",listening:"76–85",speaking:"86–93"}},
  {id:3,training:false,pages:{reading:"94–103",writing:"104–105",listening:"106–110",speaking:"111"}},
  {id:4,training:false,pages:{reading:"112–121",writing:"122–123",listening:"124–128",speaking:"129"}},
  {id:5,training:false,pages:{reading:"130–139",writing:"140–141",listening:"142–146",speaking:"147"}},
  {id:6,training:false,pages:{reading:"148–157",writing:"158–159",listening:"160–164",speaking:"165"}}
 ];
 const SKILLS={reading:6,listening:4,writing:2};
 const READY={"1:exam:reading:part-1":"trainer/test-1-reading-part-1.json","1:exam:reading:part-2":"trainer/test-1-reading-part-2.json","1:exam:reading:part-3":"trainer/test-1-reading-part-3.json","2:exam:reading:part-1":"trainer/test-2-reading-part-1.json","2:exam:reading:part-2":"trainer/test-2-reading-part-2.json","2:exam:reading:part-3":"trainer/test-2-reading-part-3.json"};
 const BASE="#/pet/trainer", cache=new Map();

 let manifestRequest=null;
 const pageStatus=new Map();
 const pageRoot=()=>'<section id="trainer-original-pages" class="trainer-original-pages" aria-label="Original exam pages"><p class="notice" role="status">Checking original exam page images…</p></section>';
 const pageAsset=src=>new URL(src,document.baseURI).href;
 function getManifest(){
  if(!manifestRequest)manifestRequest=fetch(pageAsset('trainer/exam-pages.json')).then(r=>{if(!r.ok)throw Error('Exam manifest missing');return r.json();}).catch(()=>null);
  return manifestRequest;
 }
 function checkAsset(src){
  if(!pageStatus.has(src))pageStatus.set(src,fetch(pageAsset(src),{method:'HEAD'}).then(r=>r.ok).catch(()=>false));
  return pageStatus.get(src);
 }
 async function showOriginalPages(t,skill,part,atHash){
  const slot=document.querySelector('#trainer-original-pages');
  if(!slot)return;
  const manifest=await getManifest();
  if(location.hash!==atHash||!slot.isConnected)return;
  const pages=manifest?.tests?.find(x=>x.test===Number(t))?.skills?.[skill]?.find(x=>x.id===part)?.pages||[];
  const images=await Promise.all(pages.map(async p=>({p,ok:await checkAsset(p.image)})));
  if(location.hash!==atHash||!slot.isConnected)return;
  const found=images.filter(x=>x.ok),transcript=document.querySelector('#trainer-transcript');
  if(transcript)transcript.open=!found.length;
  if(!found.length){
   slot.innerHTML='<section class="trainer-empty"><h2>Original exam page images pending</h2><p>The source pages have been extracted, but the image assets are not yet hosted on this website. Existing checked Reading questions are still available below. No Training pages are included.</p></section>';
   return;
  }
  const first=found[0].p;
  const numbers=found.map(x=>x.p.printedPage);
  slot.innerHTML='<div class="reading-part-heading"><div><h3>Part '+part.split('-')[1]+' · Original Exam Practice</h3><p>Book '+(numbers.length===1?'page ':'pages ')+numbers.join('–')+'</p></div><div class="reading-page-actions"><button class="btn" type="button" data-trainer-action="zoom-pages" aria-pressed="false">Zoom page</button><a class="text-button" href="'+esc(first.image)+'" target="_blank" rel="noopener">Open full-size page ↗</a></div></div>'+
   '<div class="reading-page" tabindex="0" aria-label="Original Cambridge exam pages">'+found.map(({p},i)=>'<img src="'+esc(p.image)+'" width="'+p.width+'" height="'+p.height+'" loading="'+(i?'lazy':'eager')+'" decoding="async" alt="Trainer Test '+t+', '+esc(skill)+' '+esc(part)+', book page '+p.printedPage+'">').join('')+'</div>'+
   (found.length<pages.length?'<p class="notice">Some original page images are still pending upload.</p>':'');
 }

 let audioManifestRequest=null;
 const trainerAudioStatus=new Map();
 function getAudioManifest(){
  if(!audioManifestRequest)audioManifestRequest=fetch(pageAsset('trainer/audio-manifest.json')).then(r=>{if(!r.ok)throw Error('Audio manifest missing');return r.json();}).catch(()=>null);
  return audioManifestRequest;
 }
 function checkAudioAsset(src){
  if(!trainerAudioStatus.has(src))trainerAudioStatus.set(src,fetch(pageAsset(src),{method:'HEAD'}).then(r=>r.ok).catch(()=>false));
  return trainerAudioStatus.get(src);
 }
 const audioDuration=seconds=>Math.floor(seconds/60)+':'+String(Math.floor(seconds%60)).padStart(2,'0');
 async function showExamAudio(test,skill,part,atHash){
  const slot=document.querySelector('#trainer-audio-status');
  if(!slot)return;
  const manifest=await getAudioManifest();
  if(location.hash!==atHash||!slot.isConnected)return;
  const all=manifest?.tracks?.filter(x=>x.test===Number(test)&&x.skill===skill)||[];
  const availability=await Promise.all(all.map(async track=>({...track,published:await checkAudioAsset(track.src)})));
  if(location.hash!==atHash||!slot.isConnected)return;
  if(skill==='listening'){
   for(let i=1;i<=4;i++){
    const label=document.querySelector('[data-trainer-available-part="'+i+'"]');
    if(!label)continue;
    const track=availability.find(x=>x.part===i);
    label.textContent=track?.published?audioDuration(track.duration):'Audio pending';
   }
  }
  const current=availability.filter(x=>x.part===Number(part.split('-')[1]));
  const published=current.filter(x=>x.published);
  if(!published.length){
   slot.innerHTML='<p class="notice" role="status">'+(current.length?'Audio prepared but not yet published to this website.':'No Exam Practice audio was supplied for this part.')+' You can still view the original book page below.</p>';
   return;
  }
  slot.innerHTML=published.map((track,i)=>{
   const id='trainer-exam-audio-'+i;
   const title=skill==='speaking'&&track.sample?'Sample '+track.sample:'Part '+track.part;
   return '<div class="trainer-audio-track"><div class="trainer-audio-track-heading"><strong>'+esc(title)+'</strong><span>'+audioDuration(track.duration)+' · Original Track '+track.track+'</span></div>'+
    '<audio id="'+id+'" controls preload="none" src="'+esc(track.src)+'" aria-label="Trainer Test '+test+' '+esc(skill)+' '+esc(title)+' original recording">Your browser does not support HTML audio playback.</audio>'+
    '<div class="listening-tools"><label for="trainer-speed-'+i+'">Playback speed <select id="trainer-speed-'+i+'" data-trainer-audio-speed="'+id+'" aria-label="Playback speed for '+esc(title)+'"><option value="0.75">0.75×</option><option value="1" selected>1× · Normal</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label><a class="text-button" href="'+esc(track.src)+'" target="_blank" rel="noopener">Open audio file ↗</a></div></div>';
  }).join('');
 }

 let latest=null;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const path=(t,m,s,p)=>BASE+[t,m,s,p].filter(Boolean).map(x=>"/"+encodeURIComponent(x)).join("");
 const key=r=>[r.test,r.mode,r.skill,r.part].join(":");
 const studentKey=()=>`wordhop.trainer.v1.${window.WordHopStudent?.current()?.id||"guest"}`;
 function storage(){try{const s=JSON.parse(localStorage.getItem(studentKey())||"{}");return s&&typeof s==="object"&&!Array.isArray(s)?s:{};}catch{return {};}}
 function attempt(k){const x=storage()[k];return x&&x.answers&&typeof x.answers==="object"?x:{answers:{},checked:false};}
 function persist(k,a){const v=storage();v[k]=a;try{localStorage.setItem(studentKey(),JSON.stringify(v));return true;}catch{return false;}}

 const back=(url,name)=>'<a class="text-button trainer-back" href="'+esc(url)+'" data-nav="'+esc(url)+'">← '+esc(name)+'</a>';
 const head=(title,description)=>'<div class="page-heading"><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div>';
 const frame=body=>'<div id="trainer" class="trainer"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/" data-nav="#/">Courses</a><span class="sep" aria-hidden="true">/</span><a href="#/pet" data-nav="#/pet">PET</a><span class="sep" aria-hidden="true">/</span><a href="'+BASE+'" data-nav="'+BASE+'">Trainer</a></nav>'+body+'</div>';
 const tiles=items=>'<div class="cards trainer-cards">'+items.join('')+'</div>';
 const tile=(url,label,title,desc,meta)=>'<a class="nav-card compact trainer-tile" href="'+esc(url)+'" data-nav="'+esc(url)+'"><div class="nav-card-top"><span class="card-label">'+esc(label)+'</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"></use></svg></div><h2>'+esc(title)+'</h2>'+(desc?'<p>'+esc(desc)+'</p>':'')+(meta?'<span class="card-meta">'+esc(meta)+'</span>':'')+'</a>';
 const selectedTab=(url,title,active,index)=>'<a class="unit-tab'+(active?' active':'')+'" href="'+esc(url)+'" data-nav="'+esc(url)+'"'+(active?' aria-current="page"':'')+'><span class="step-num">'+(index+1)+'</span>'+esc(title)+'</a>';
 function testNav(t,mode,skill){
  const title='Test '+t.id;
  const current='Exam Practice';
  const intro='<div class="unit-heading trainer-test-heading"><div><h1>'+title+'</h1><p>Trainer · PET</p></div><div class="unit-heading-actions"><span class="unit-badge">Exam Practice</span><button class="text-button trainer-clear" type="button" data-trainer-action="clear-test">Clear saved results</button></div></div>';
  const modes='';
  const studyPath=BASE+'/trainer-test-'+t.id;
  const vocabularyTabs=selectedTab(studyPath,'Study flashcards',false,0)+selectedTab(studyPath+'/practice','Practice',false,1);
  const skills='<nav class="unit-tabs trainer-skill-tabs" aria-label="Study and practise this test">'+vocabularyTabs+Object.keys(SKILLS).map((s,i)=>selectedTab(path(t.id,mode,s,'part-1'),s[0].toUpperCase()+s.slice(1),s===skill,i+2)).join('')+'</nav>';
  return intro+modes+skills;
 }
 function render(context){
  const r=context.route||{},main=context.container,t=TESTS.find(x=>x.id===Number(r.test));
  const mode='exam';
  if(t && r.skill==='speaking'){
   location.replace(path(t.id,'exam','reading','part-1'));
   return;
  }
  const skill=SKILLS[r.skill]?r.skill:'reading';
  latest={container:main,route:{...r,mode,skill}};
  if(!t){
   const description='6 B1 Preliminary for Schools Exam Practice tests · 24 vocabulary flashcards per test · Reading, Listening and Writing.';
   main.innerHTML=frame(head('Trainer',description)+'<p class="section-label">Choose a test</p>'+tiles(TESTS.map(x=>tile(BASE+'/trainer-test-'+x.id,'24 vocabulary words','Test '+x.id,'Flashcards · Practice · Reading · Listening · Writing',x.id<=2?'24 words · Reading Parts 1–3 checked · Original exam pages':'24 words · Original exam pages · Answer keys being prepared'))));
   return;
  }
  const selectedId=/^part-([1-6])$/.test(r.part||'') ? r.part : 'part-1';
  const number=Number(selectedId.split('-')[1]);
  const countShared=SKILLS[skill];
  const selectedPart=number<=countShared?selectedId:'part-1';
  const sectionHeader=frame(back(BASE,'All tests')+testNav(t,mode,skill));
  const unit={id:'trainer-test-'+t.id,title:'Test '+t.id,readingFile:'readings/trainer-test-'+t.id+'.json',writingFile:'writings/trainer-test-'+t.id+'.json'};
  const base=path(t.id,'exam');
  const atHash=location.hash;
  const isCurrent=()=>Boolean(window.WordHopStudent?.current())&&location.hash===atHash;
  // Use the exact same Reading / Writing components as Simply PET and Authentic 1.
  // Scanned original pages are handled inside those components.
  if(skill==='reading'&&window.WordHopReading){
   window.WordHopReading.render({unit,header:sectionHeader,partId:selectedPart,path:base,isCurrent,toast:()=>{}});
   return;
  }
  if(skill==='writing'&&window.WordHopWriting){
   window.WordHopWriting.render({unit,title:unit.title,header:sectionHeader,partId:selectedPart,path:base,isCurrent,toast:()=>{}});
   return;
  }
  if(skill==='reading'||skill==='writing'){
   main.innerHTML=frame(back(BASE,'All tests')+testNav(t,mode,skill)+'<p class="notice" role="alert">The shared exam component is unavailable. Reload the page to try again.</p>');
   return;
  }
  const pendingTitle=skill==='listening'?'Listening':'Speaking';
  const links=Array.from({length:countShared},(_,i)=>{
   const item='part-'+(i+1),url=path(t.id,'exam',skill,item),active=selectedPart===item;
   return '<a class="'+(skill==='listening'?'listening-part':'reading-part-link')+(active?' active':'')+'" href="'+esc(url)+'" data-nav="'+esc(url)+'"'+(active?' aria-current="page"':'')+'>'+(skill==='listening'?'<strong>Part '+(i+1)+'</strong><span data-trainer-available-part="'+(i+1)+'">Checking audio…</span>':'Part '+(i+1))+'</a>';
  }).join('');
  const navigation='<nav class="'+(skill==='listening'?'listening-parts':'reading-parts')+'" aria-label="'+pendingTitle+' parts">'+links+'</nav>';
  const introduction='<div class="'+(skill==='listening'?'listening-intro':'reading-intro')+'"><div><h2>'+pendingTitle+'</h2><p>Original Exam Practice pages · Test '+t.id+'. '+(skill==='listening'?'Play the original Exam Practice recording below, then answer the questions on the book page.':'Read the original speaking test instructions and prompts.')+'</p></div></div>';
  const player=skill==='listening'?'<section class="listening-player-card trainer-player-card" aria-label="Listening recording"><div class="listening-player-heading"><div><p class="section-label">Test '+t.id+' · Listening</p><h3>Part '+selectedPart.split('-')[1]+'</h3></div></div><div id="trainer-audio-status" aria-live="polite"><p class="notice" role="status">Checking Exam Practice audio…</p></div></section>':'';
  const awaiting=skill==='listening'?'<section class="reading-answer-sheet trainer-pending-key"><div class="reading-sheet-heading"><div><h3>Answer sheet in preparation</h3><p>The book questions can be viewed above. Audio and verified answer keys must be added before scoring is enabled.</p></div></div></section>':'';
  const body='<section class="'+(skill==='listening'?'listening-view':'reading-view')+' trainer-pet-view" aria-label="'+pendingTitle+' Exam Practice">'+introduction+navigation+player+pageRoot()+awaiting+'<p class="reading-source-note">Original exam pages: Cambridge B1 Preliminary for Schools Trainer. Only Exam Practice is included.</p></section>';
  main.innerHTML=frame(back(BASE,'All tests')+testNav(t,mode,skill)+body);
  showOriginalPages(t.id,skill,selectedPart,atHash);
  if(skill==='listening')showExamAudio(t.id,skill,selectedPart,atHash);
  return;

  const nav=testNav(t,mode,skill),count=SKILLS[skill];
  const part=/^part-([1-6])$/.exec(r.part||'');
  if(!part||Number(part[1])>count){
   main.innerHTML=frame(back(BASE,'All tests')+nav+'<p class="section-label">Choose a part</p>'+tiles(Array.from({length:count},(_,n)=>{
    const p='part-'+(n+1),k=[t.id,mode,skill,p].join(':'),ready=Boolean(READY[k]);
    let label=ready?(attempt(k).checked?'Answers checked':'Ready to practise'):'Content in preparation';
    let description=ready?'Original exam questions with official answers and Vietnamese explanations.':'Verified questions and answer keys are being prepared for this part.';
    if(!ready&&(skill==='listening'||skill==='speaking')){
     label='Awaiting audio';
     description='The original audio files have not yet been supplied. No sample or placeholder audio is published.';
    }
    return tile(path(t.id,mode,skill,p),label,'Part '+(n+1),description,ready?'5 questions · scored':'Book pages '+t.pages[skill]);
   })));
   return;
  }
  const currentRoute={...r,mode,skill},k=key(currentRoute),heading='Test '+t.id+' · '+skill[0].toUpperCase()+skill.slice(1)+' · Part '+part[1];
  const sectionTop=back(path(t.id,mode,skill),'All parts')+nav;
  if(!READY[k]){
   const when=location.hash;
   main.innerHTML=frame(sectionTop+head(heading,'Original exam pages can be viewed here; the answer key is not yet digitised.')+pageRoot()+'<section class="trainer-empty"><h2>Answer checking in preparation</h2><p>These original exam pages are for reference. Scored questions and answers are not yet available for this part. Listening and Speaking audio will be added after the original files are supplied.</p></section>');
   showOriginalPages(t.id,skill,'part-'+part[1],when);
   return;
  }
  if(!cache.has(k)){
   main.innerHTML=frame(sectionTop+head(heading,'Loading original questions…')+'<p class="notice" role="status">Loading questions…</p>');
   const currentHash=location.hash;
   fetch(new URL(READY[k],document.baseURI)).then(x=>{if(!x.ok)throw Error('HTTP '+x.status);return x.json();}).then(x=>{if(!Array.isArray(x.questions)||!x.questions.length)throw Error('Invalid questions');cache.set(k,x);if(location.hash===currentHash)render(latest);}).catch(()=>{if(location.hash===currentHash)main.innerHTML=frame(sectionTop+head(heading,'Unable to load questions')+'<p class="notice" role="alert">Please check your connection and reopen this Part.</p>');});
   return;
  }
  const data=cache.get(k),saved=attempt(k),score=data.questions.filter(q=>saved.answers[q.id]===q.answer).length;
  const questionRows=data.questions.map((q,i)=>{
   const number=Number(String(q.id).replace(/^q/,''))||i+1,selected=saved.answers[q.id]||'';
   const options=Object.keys(q.options).map(letter=>'<option value="'+esc(letter)+'" '+(selected===letter?'selected':'')+'>'+esc(letter)+'</option>').join('');
   const answerStatus=saved.checked?'<span class="reading-answer-state '+(selected===q.answer?'trainer-good':'trainer-bad')+'">'+(selected===q.answer?'Correct':selected?'Review':'Not answered')+'</span>':'';
   return '<div class="reading-answer-row '+(saved.checked?(selected===q.answer?'reading-correct':'reading-incorrect'):'')+'"><label for="trainer-answer-'+esc(q.id)+'">Question '+number+'</label><select id="trainer-answer-'+esc(q.id)+'" data-trainer-question="'+esc(q.id)+'" aria-label="Answer to question '+number+'" '+(saved.checked?'disabled':'')+'><option value="">Choose</option>'+options+'</select>'+answerStatus+'</div>';
  }).join('');
  const questions='<section class="reading-answer-sheet" aria-label="Exam answer sheet"><div class="reading-sheet-heading"><div><h3>Answer sheet</h3><p>Choose the answer letter shown on the original book page. Your answers are saved on this device.</p></div>'+(saved.checked?'<strong class="reading-score" role="status">'+score+'/'+data.questions.length+' correct</strong>':'')+'</div><div class="reading-answer-inputs">'+questionRows+'</div><div class="reading-submit-row">'+(saved.checked?'<button class="btn" type="button" data-trainer-action="retry">Try this part again</button>':'<button class="btn btn-primary" type="button" data-trainer-action="check">Check answers</button>')+'<button class="text-button" type="button" data-trainer-action="back-to-page">Back to original page ↑</button></div></section>';
  const questionTranscript=data.questions.map((q,i)=>'<div class="trainer-text-question"><h3>Question '+(Number(String(q.id).replace(/^q/,''))||i+1)+'</h3>'+(q.source?'<p class="trainer-source">'+esc(q.source)+'</p>':'')+(q.ask?'<p>'+esc(q.ask)+'</p>':'')+'<ol type="A">'+Object.entries(q.options).map(([letter,value])=>'<li><b>'+esc(letter)+'</b> '+esc(value)+'</li>').join('')+'</ol></div>').join('');
  const solutions=saved.checked?'<section class="reading-solutions" aria-label="Answer key and explanations"><h3>Answer key &amp; explanations</h3>'+data.questions.map((q,i)=>'<article class="reading-solution '+(saved.answers[q.id]===q.answer?'reading-correct':'reading-incorrect')+'"><div class="reading-solution-top"><b>Question '+(Number(String(q.id).replace(/^q/,''))||i+1)+'</b><span>'+esc(q.answer)+' · '+(saved.answers[q.id]===q.answer?'Correct':'Review')+'</span></div><p lang="vi">'+esc(q.explanationVi)+'</p></article>').join('')+'</section>':'';
  const readingPassage=data.passage?'<section class="trainer-article" aria-label="Reading article"><h2>'+esc(data.passageTitle||'Reading article')+'</h2>'+(data.passageBy?'<p class="trainer-article-by">'+esc(data.passageBy)+'</p>':'')+'<div class="trainer-article-text">'+esc(data.passage)+'</div></section>':'';
  const sharedContext=Array.isArray(data.context)&&data.context.length?'<section class="trainer-passage" aria-label="Reading texts"><h2>'+esc(data.contextTitle||'Reading texts')+'</h2><p class="trainer-passage-intro">Read these descriptions before choosing your answers.</p><div class="trainer-passage-grid">'+data.context.map(item=>'<article class="trainer-passage-item"><div class="trainer-passage-title"><b>'+esc(item.letter)+'</b><h3>'+esc(item.title)+'</h3></div><p>'+esc(item.description)+'</p></article>').join('')+'</div></section>':'';
  main.innerHTML=frame(sectionTop+head(data.title,data.instructions)+'<p class="trainer-meta">Questions: '+data.questions.length+' · Printed pages '+esc(data.bookPages)+' · '+(saved.checked?'Answers checked':'Answers saved in this browser')+'</p>'+pageRoot()+'<details id="trainer-transcript" class="trainer-text-transcript"><summary>Text-only version of the passage and questions</summary>'+readingPassage+sharedContext+questionTranscript+'</details>'+questions+solutions+'<p class="trainer-credit">Verified against the official Teacher’s Notes &amp; Keys. '+esc(data.keySource)+'.</p>');
  showOriginalPages(t.id,skill,'part-'+part[1],location.hash);
 }
 document.addEventListener("change",e=>{
  const speed=e.target.closest("#trainer [data-trainer-audio-speed]");
  if(speed){const player=document.getElementById(speed.dataset.trainerAudioSpeed);if(player)player.playbackRate=Number(speed.value);return;}
  const input=e.target.closest("#trainer [data-trainer-question]");if(!input||!latest)return;
  const k=key(latest.route),v=attempt(k);if(v.checked)return;v.answers[input.dataset.trainerQuestion]=input.value;
  if(!persist(k,v))window.alert("Could not save the answer in browser storage.");
 });
 document.addEventListener("click",e=>{
  const btn=e.target.closest("#trainer [data-trainer-action]");if(!btn||!latest)return;
  e.preventDefault();
  if(btn.dataset.trainerAction==="back-to-page"){
   document.querySelector('#trainer-original-pages')?.scrollIntoView({behavior:'smooth',block:'start'});
   return;
  }
  if(btn.dataset.trainerAction==="zoom-pages"){
   const pg=document.querySelector('#trainer-original-pages .reading-page');
   if(pg){const zoomed=pg.classList.toggle('is-zoomed');btn.setAttribute('aria-pressed',String(zoomed));btn.textContent=zoomed?'Fit pages':'Zoom pages';}
   return;
  }
  if(btn.dataset.trainerAction==="clear-test"){
    if(!window.confirm("Clear saved Trainer answers and scores for this test on this device?"))return;
    const testId='trainer-test-'+Number(latest.route.test);
    const readingOk=window.WordHopReading?.clearResults?.(testId);
    const writingOk=window.WordHopWriting?.clearResults?.(testId);
    if(readingOk===false||writingOk===false){window.alert("Unable to clear all saved PET results on this device.");return;}
    const all=storage(),prefix=String(latest.route.test)+":";
    for(const item of Object.keys(all))if(item.startsWith(prefix))delete all[item];
    try{localStorage.setItem(studentKey(),JSON.stringify(all));}catch{window.alert("Could not clear saved results.");return;}
    render(latest);return;
  }
  const k=key(latest.route),v=attempt(k);
  if(btn.dataset.trainerAction==="check")v.checked=true;
  else if(btn.dataset.trainerAction==="retry")v.answers={},v.checked=false;
  else return;
  if(!persist(k,v))window.alert("Unable to save this result on your device.");
  render(latest);
 });
 window.WordHopTrainer={render,stop(){latest=null;}};
})();
