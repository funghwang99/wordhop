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
 const SKILLS={reading:6,writing:2,listening:4,speaking:4};
 const READY={"1:exam:reading:part-1":"trainer/test-1-reading-part-1.json","1:exam:reading:part-2":"trainer/test-1-reading-part-2.json","1:exam:reading:part-3":"trainer/test-1-reading-part-3.json","2:exam:reading:part-1":"trainer/test-2-reading-part-1.json","2:exam:reading:part-2":"trainer/test-2-reading-part-2.json","2:exam:reading:part-3":"trainer/test-2-reading-part-3.json"};
 const BASE="#/pet/trainer", cache=new Map();
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
  const modes='';
  const skills='<nav class="unit-tabs trainer-skill-tabs" aria-label="Choose a skill">'+Object.keys(SKILLS).map(s=>selectedTab(path(t.id,mode,s),s[0].toUpperCase()+s.slice(1),s===skill)).join('')+'</nav>';
  return intro+modes+skills;
 }
 function render(context){
  const r=context.route||{},main=context.container,t=TESTS.find(x=>x.id===Number(r.test));
  const mode='exam';
  const skill=SKILLS[r.skill]?r.skill:'reading';
  latest={container:main,route:{...r,mode,skill}};
  if(!t){
   const description='Choose one of six Exam Practice tests. Reading Parts 1–3 in Tests 1–2 are available; the remaining content is being prepared. Original audio will be added once supplied.';
   main.innerHTML=frame(head('Trainer',description)+'<p class="section-label">Choose a test</p>'+tiles(TESTS.map(x=>tile(path(x.id,'exam','reading'),x.id<=2?'Exam Practice · Reading ready':'Exam Practice · Preparing','Test '+x.id,'Reading · Writing · Listening · Speaking',x.id<=2?'3 Reading parts ready · audio pending':'Exam content in preparation'))));
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
   main.innerHTML=frame(sectionTop+head(heading,'This Exam Practice part is not yet available.')+'<section class="trainer-empty"><h2>Content in preparation</h2><p>This part is not ready as a scored test. Listening and Speaking recordings will be added after the original audio files are supplied.</p></section>');
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
   return '<article class="trainer-question"><div class="trainer-qtop"><h2>Question '+(Number(String(q.id).replace(/^q/,''))||i+1)+'</h2>'+status+'</div><div class="trainer-source">'+esc(q.source)+'</div>'+(q.ask?'<p class="trainer-ask">'+esc(q.ask)+'</p>':'')+'<fieldset '+(saved.checked?'disabled':'')+'><legend>Choose the correct option</legend><div class="trainer-choices">'+options+'</div></fieldset>'+explanation+'</article>';
  }).join('');
  const readingPassage=data.passage?'<section class="trainer-article" aria-label="Reading article"><h2>'+esc(data.passageTitle||'Reading article')+'</h2>'+(data.passageBy?'<p class="trainer-article-by">'+esc(data.passageBy)+'</p>':'')+'<div class="trainer-article-text">'+esc(data.passage)+'</div></section>':'';
  const sharedContext=Array.isArray(data.context)&&data.context.length?'<section class="trainer-passage" aria-label="Reading texts"><h2>'+esc(data.contextTitle||'Reading texts')+'</h2><p class="trainer-passage-intro">Read these descriptions before choosing your answers.</p><div class="trainer-passage-grid">'+data.context.map(item=>'<article class="trainer-passage-item"><div class="trainer-passage-title"><b>'+esc(item.letter)+'</b><h3>'+esc(item.title)+'</h3></div><p>'+esc(item.description)+'</p></article>').join('')+'</div></section>':'';
  main.innerHTML=frame(sectionTop+head(data.title,data.instructions)+'<p class="trainer-meta">Questions: '+data.questions.length+' · Printed pages '+esc(data.bookPages)+' · '+(saved.checked?'Answers checked':'Answers saved in this browser')+'</p>'+readingPassage+sharedContext+questions+
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
