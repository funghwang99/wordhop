'use strict';
(function trainer(){
 const TESTS=[
  {id:1,training:true,pages:{reading:"10–27",writing:"28–33",listening:"34–43",speaking:"44–51"}},
  {id:2,training:true,pages:{reading:"52–69",writing:"70–75",listening:"76–85",speaking:"86–93"}},
  {id:3,training:false,pages:{reading:"94–103",writing:"104–105",listening:"106–110",speaking:"111"}},
  {id:4,training:false,pages:{reading:"112–121",writing:"122–123",listening:"124–128",speaking:"129"}},
  {id:5,training:false,pages:{reading:"130–139",writing:"140–141",listening:"142–146",speaking:"147"}},
  {id:6,training:false,pages:{reading:"148–157",writing:"158–159",listening:"160–164",speaking:"165"}}
 ];
 const SKILLS={reading:6,writing:2,listening:4,speaking:4};
 const READY={"1:exam:reading:part-1":"trainer/test-1-reading-part-1.json","2:exam:reading:part-1":"trainer/test-2-reading-part-1.json"};
 const BASE="#/pet/trainer", cache=new Map();
 let audioIndex=null,audioLoad=null;
 const audioUrl=name=>new URL(name,document.baseURI).href;
 function audioFor(context){
  const box=document.querySelector("#trainer-audio-slots");
  if(!box||!context)return;
  const route=context.route||{},here=location.hash;
  if(!audioIndex){
   if(!audioLoad)audioLoad=fetch(audioUrl("trainer/audio-manifest.json")).then(r=>{if(!r.ok)throw Error("Missing manifest");return r.json();}).then(data=>{audioIndex=data;}).catch(()=>{audioIndex={tracks:[]};});
   audioLoad.then(()=>{if(here===location.hash&&box.isConnected)audioFor(context);});
   return;
  }
  const tracks=audioIndex.tracks.filter(x=>x.test===Number(route.test)&&x.mode===route.mode&&x.skill===route.skill&&x.part===route.part);
  if(!tracks.length){box.innerHTML="";return;}
  box.innerHTML='<p class="trainer-meta" role="status">Checking availability of the source audio…</p>';
  Promise.all(tracks.map(async t=>{
   const src=audioUrl("audio/trainer/"+t.file);
   try{const res=await fetch(src,{method:"HEAD",cache:"no-store"});return {...t,src,available:res.ok};}catch{return {...t,src,available:false};}
  })).then(items=>{
   if(here!==location.hash||!box.isConnected)return;
   const ready=items.filter(x=>x.available);
   if(!ready.length){
    box.innerHTML='<section class="trainer-empty"><h2>Source audio not published yet</h2><p>The recordings have been matched to this Part, but the original MP3 files are not yet hosted on WordHop. No broken players or invented recordings are shown.</p></section>';
    return;
   }
   box.innerHTML='<section class="trainer-audio"><h2>Audio practice</h2><p>Select and play the recording for this part. Training activities may contain several tracks.</p>'+
    ready.map(t=>'<div class="trainer-audio-track"><strong>Track '+String(t.track).padStart(2,"0")+'</strong><span>'+esc(t.description)+'</span><audio controls preload="none" src="'+esc(t.src)+'" aria-label="Trainer test '+t.test+' track '+t.track+'"></audio></div>').join("")+
    '</section>';
  });
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
 const selectedTab=(url,title,active)=>'<a class="unit-tab'+(active?' active':'')+'" href="'+esc(url)+'" data-nav="'+esc(url)+'"'+(active?' aria-current="page"':'')+'>'+esc(title)+'</a>';
 function testNav(t,mode,skill){
  const title='Test '+t.id;
  const current=mode==='training'?'Training':'Exam Practice';
  const intro='<div class="unit-heading trainer-test-heading"><div><h1>'+title+'</h1><p>Trainer · PET · '+current+'</p></div><button class="text-button trainer-clear" type="button" data-trainer-action="clear-test">Clear saved results</button></div>';
  const modes=t.training?'<nav class="trainer-mode-tabs" aria-label="Practice mode">'+selectedTab(path(t.id,'training','reading'),'Training',mode==='training')+selectedTab(path(t.id,'exam','reading'),'Exam Practice',mode==='exam')+'</nav>':'';
  const skills='<nav class="unit-tabs trainer-skill-tabs" aria-label="Choose a skill">'+Object.keys(SKILLS).map(s=>selectedTab(path(t.id,mode,s),s[0].toUpperCase()+s.slice(1),s===skill)).join('')+'</nav>';
  return intro+modes+skills;
 }
 function render(context){
  const r=context.route||{},main=context.container,t=TESTS.find(x=>x.id===Number(r.test));
  const mode=t&&r.mode==='training'&&t.training?'training':'exam';
  const skill=SKILLS[r.skill]?r.skill:'reading';
  latest={container:main,route:{...r,mode,skill}};
  if(!t){
   const description='Choose a test to practise Reading, Writing, Listening and Speaking. Tests 1–2 also include guided Training activities.';
   main.innerHTML=frame(head('Trainer',description)+'<p class="section-label">Choose a test</p>'+tiles(TESTS.map(x=>tile(path(x.id,'exam','reading'),x.training?'Training + Exam Practice':'Exam Practice','Test '+x.id,'Reading · Writing · Listening · Speaking',x.training?'Training and exam practice':'Full practice test'))));
   return;
  }
  const nav=testNav(t,mode,skill),count=SKILLS[skill];
  const part=/^part-([1-6])$/.exec(r.part||'');
  if(!part||Number(part[1])>count){
   main.innerHTML=frame(back(BASE,'All tests')+nav+'<p class="section-label">Choose a part</p>'+tiles(Array.from({length:count},(_,n)=>{
    const p='part-'+(n+1),k=[t.id,mode,skill,p].join(':'),ready=Boolean(READY[k]);
    let label=ready?(attempt(k).checked?'Answers checked':'Ready to practise'):'Content in preparation';
    let description=ready?'Original exam questions with official answers and Vietnamese explanations.':'Verified questions and answer keys are being prepared for this part.';
    if(!ready&&(skill==='listening'||skill==='speaking')){
     label='Audio practice';
     description='Original recordings are shown here when the MP3 files are hosted. Questions and scoring are being prepared.';
    }
    return tile(path(t.id,mode,skill,p),label,'Part '+(n+1),description,ready?'5 questions · scored':'Book pages '+t.pages[skill]);
   })));
   return;
  }
  const currentRoute={...r,mode,skill},k=key(currentRoute),heading='Test '+t.id+' · '+skill[0].toUpperCase()+skill.slice(1)+' · Part '+part[1];
  const sectionTop=back(path(t.id,mode,skill),'All parts')+nav;
  if(!READY[k]){
   main.innerHTML=frame(sectionTop+head(heading,'Exam questions and publisher-verified keys are still in preparation.')+'<section class="trainer-empty"><h2>Content in preparation</h2><p>This Part is not yet available as a scored test. When its original audio has been uploaded, the player will be available below for listening or speaking practice.</p></section><div id="trainer-audio-slots"></div>');
   audioFor(latest);
   return;
  }
  if(!cache.has(k)){
   main.innerHTML=frame(sectionTop+head(heading,'Loading original questions…')+'<p class="notice" role="status">Loading questions…</p>');
   const currentHash=location.hash;
   fetch(new URL(READY[k],document.baseURI)).then(x=>{if(!x.ok)throw Error('HTTP '+x.status);return x.json();}).then(x=>{if(!Array.isArray(x.questions)||!x.questions.length)throw Error('Invalid questions');cache.set(k,x);if(location.hash===currentHash)render(latest);}).catch(()=>{if(location.hash===currentHash)main.innerHTML=frame(sectionTop+head(heading,'Unable to load questions')+'<p class="notice" role="alert">Please check your connection and reopen this Part.</p>');});
   return;
  }
  const data=cache.get(k),saved=attempt(k),score=data.questions.filter(q=>saved.answers[q.id]===q.answer).length;
  const questions=data.questions.map((q,i)=>{
   const status=saved.checked?'<span class="'+(saved.answers[q.id]===q.answer?'trainer-good':'trainer-bad')+'">'+(saved.answers[q.id]===q.answer?'Correct':'Incorrect')+'</span>':'';
   const options=Object.entries(q.options).map(([letter,option])=>'<label class="trainer-choice '+(saved.checked&&q.answer===letter?'trainer-right':'')+'"><input type="radio" name="'+esc(q.id)+'" value="'+letter+'" data-trainer-question="'+esc(q.id)+'" '+(saved.answers[q.id]===letter?'checked':'')+'><b class="answer-key">'+letter+'</b><span>'+esc(option)+'</span></label>').join('');
   const explanation=saved.checked?'<div class="trainer-explain" lang="vi"><strong>Đáp án: '+q.answer+'</strong><p>'+esc(q.explanationVi)+'</p></div>':'';
   return '<article class="trainer-question"><div class="trainer-qtop"><h2>Question '+(i+1)+'</h2>'+status+'</div><div class="trainer-source">'+esc(q.source)+'</div>'+(q.ask?'<p class="trainer-ask">'+esc(q.ask)+'</p>':'')+'<fieldset '+(saved.checked?'disabled':'')+'><legend>Choose A, B or C</legend><div class="trainer-choices">'+options+'</div></fieldset>'+explanation+'</article>';
  }).join('');
  main.innerHTML=frame(sectionTop+head(data.title,data.instructions)+'<p class="trainer-meta">Questions: '+data.questions.length+' · Printed pages '+esc(data.bookPages)+' · '+(saved.checked?'Answers checked':'Answers saved in this browser')+'</p>'+questions+
   '<div class="trainer-actions">'+(saved.checked?'<p class="trainer-score" role="status">Score: <strong>'+score+'/'+data.questions.length+'</strong></p><button class="btn" type="button" data-trainer-action="retry">Try again</button>':'<button class="btn btn-primary" type="button" data-trainer-action="check">Check answers</button>')+'</div><p class="trainer-credit">Verified against the official Teacher’s Notes &amp; Keys. '+esc(data.keySource)+'.</p>');
 }
 document.addEventListener("change",e=>{
  const input=e.target.closest("#trainer input[data-trainer-question]");if(!input||!latest)return;
  const k=key(latest.route),v=attempt(k);if(v.checked)return;v.answers[input.dataset.trainerQuestion]=input.value;
  if(!persist(k,v))window.alert("Could not save the answer in browser storage.");
 });
 document.addEventListener("click",e=>{
  const btn=e.target.closest("#trainer [data-trainer-action]");if(!btn||!latest)return;
  e.preventDefault();
  if(btn.dataset.trainerAction==="clear-test"){
    if(!window.confirm("Clear saved Trainer answers and scores for this test on this device?"))return;
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
