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
  slot.innerHTML='<div class="trainer-original-heading"><div><h2>Original Exam Practice pages</h2><p>Read the original book page, then complete the answer sheet below.</p></div><button class="btn" type="button" data-trainer-action="zoom-pages" aria-pressed="false">Zoom pages</button></div>'+
   '<div class="reading-page" tabindex="0" aria-label="Original Cambridge exam pages">'+found.map(({p},i)=>'<figure class="trainer-original-page"><img src="'+esc(p.image)+'" width="'+p.width+'" height="'+p.height+'" loading="'+(i?'lazy':'eager')+'" decoding="async" alt="Trainer Test '+t+', '+esc(skill)+' '+esc(part)+', printed page '+p.printedPage+'"><figcaption>Book page '+p.printedPage+' · <a href="'+esc(p.image)+'" target="_blank" rel="noopener">Open full-size page</a></figcaption></figure>').join('')+'</div>'+
   (found.length<pages.length?'<p class="notice">Some original page images are still pending upload.</p>':'');
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
  const questions=data.questions.map((q,i)=>{
   const status=saved.checked?'<span class="'+(saved.answers[q.id]===q.answer?'trainer-good':'trainer-bad')+'">'+(saved.answers[q.id]===q.answer?'Correct':'Incorrect')+'</span>':'';
   const options=Object.entries(q.options).map(([letter,option])=>'<label class="trainer-choice '+(saved.checked&&q.answer===letter?'trainer-right':'')+'"><input type="radio" name="'+esc(q.id)+'" value="'+letter+'" data-trainer-question="'+esc(q.id)+'" '+(saved.answers[q.id]===letter?'checked':'')+'><b class="answer-key">'+letter+'</b><span>'+esc(option)+'</span></label>').join('');
   const explanation=saved.checked?'<div class="trainer-explain" lang="vi"><strong>Đáp án: '+q.answer+'</strong><p>'+esc(q.explanationVi)+'</p></div>':'';
   return '<article class="trainer-question"><div class="trainer-qtop"><h2>Question '+(Number(String(q.id).replace(/^q/,''))||i+1)+'</h2>'+status+'</div><div class="trainer-source">'+esc(q.source)+'</div>'+(q.ask?'<p class="trainer-ask">'+esc(q.ask)+'</p>':'')+'<fieldset '+(saved.checked?'disabled':'')+'><legend>Choose the correct option</legend><div class="trainer-choices">'+options+'</div></fieldset>'+explanation+'</article>';
  }).join('');
  const readingPassage=data.passage?'<section class="trainer-article" aria-label="Reading article"><h2>'+esc(data.passageTitle||'Reading article')+'</h2>'+(data.passageBy?'<p class="trainer-article-by">'+esc(data.passageBy)+'</p>':'')+'<div class="trainer-article-text">'+esc(data.passage)+'</div></section>':'';
  const sharedContext=Array.isArray(data.context)&&data.context.length?'<section class="trainer-passage" aria-label="Reading texts"><h2>'+esc(data.contextTitle||'Reading texts')+'</h2><p class="trainer-passage-intro">Read these descriptions before choosing your answers.</p><div class="trainer-passage-grid">'+data.context.map(item=>'<article class="trainer-passage-item"><div class="trainer-passage-title"><b>'+esc(item.letter)+'</b><h3>'+esc(item.title)+'</h3></div><p>'+esc(item.description)+'</p></article>').join('')+'</div></section>':'';
  main.innerHTML=frame(sectionTop+head(data.title,data.instructions)+'<p class="trainer-meta">Questions: '+data.questions.length+' · Printed pages '+esc(data.bookPages)+' · '+(saved.checked?'Answers checked':'Answers saved in this browser')+'</p>'+pageRoot()+'<details id="trainer-transcript" class="trainer-text-transcript"><summary>Text-only version of the passage and questions</summary>'+readingPassage+sharedContext+'</details>'+questions+
   '<div class="trainer-actions">'+(saved.checked?'<p class="trainer-score" role="status">Score: <strong>'+score+'/'+data.questions.length+'</strong></p><button class="btn" type="button" data-trainer-action="retry">Try again</button>':'<button class="btn btn-primary" type="button" data-trainer-action="check">Check answers</button>')+'</div><p class="trainer-credit">Verified against the official Teacher’s Notes &amp; Keys. '+esc(data.keySource)+'.</p>');
  showOriginalPages(t.id,skill,'part-'+part[1],location.hash);
 }
 document.addEventListener("change",e=>{
  const input=e.target.closest("#trainer input[data-trainer-question]");if(!input||!latest)return;
  const k=key(latest.route),v=attempt(k);if(v.checked)return;v.answers[input.dataset.trainerQuestion]=input.value;
  if(!persist(k,v))window.alert("Could not save the answer in browser storage.");
 });
 document.addEventListener("click",e=>{
  const btn=e.target.closest("#trainer [data-trainer-action]");if(!btn||!latest)return;
  e.preventDefault();
  if(btn.dataset.trainerAction==="zoom-pages"){
   const pg=document.querySelector('#trainer-original-pages .reading-page');
   if(pg){const zoomed=pg.classList.toggle('is-zoomed');btn.setAttribute('aria-pressed',String(zoomed));btn.textContent=zoomed?'Fit pages':'Zoom pages';}
   return;
  }
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
