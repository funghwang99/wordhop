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
 const READY={"1:exam:reading:part-1":"trainer/test-1-reading-part-1.json"};
 const BASE="#/pet/trainer", cache=new Map();
 let latest=null;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const path=(t,m,s,p)=>BASE+[t,m,s,p].filter(Boolean).map(x=>"/"+encodeURIComponent(x)).join("");
 const key=r=>[r.test,r.mode,r.skill,r.part].join(":");
 const studentKey=()=>`wordhop.trainer.v1.${window.WordHopStudent?.current()?.id||"guest"}`;
 function storage(){try{const s=JSON.parse(localStorage.getItem(studentKey())||"{}");return s&&typeof s==="object"&&!Array.isArray(s)?s:{};}catch{return {};}}
 function attempt(k){const x=storage()[k];return x&&x.answers&&typeof x.answers==="object"?x:{answers:{},checked:false};}
 function persist(k,a){const v=storage();v[k]=a;try{localStorage.setItem(studentKey(),JSON.stringify(v));return true;}catch{return false;}}
 const back=(url,name)=>`<a class="trainer-back" href="${esc(url)}" data-nav="${esc(url)}">← ${esc(name)}</a>`;
 const head=(title,description)=>`<div class="trainer-head"><small>CAMBRIDGE B1 PRELIMINARY FOR SCHOOLS</small><h1>${esc(title)}</h1><p>${esc(description)}</p></div>`;
 const frame=body=>`<div id="trainer" class="trainer"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/" data-nav="#/">Courses</a> / <a href="#/pet" data-nav="#/pet">PET</a> / <a href="${BASE}" data-nav="${BASE}">Trainer</a></nav>${body}</div>`;
 const tiles=items=>`<div class="trainer-grid">${items.join("")}</div>`;
 const tile=(url,label,title,desc)=>`<a class="trainer-tile" href="${esc(url)}" data-nav="${esc(url)}"><span class="trainer-badge">${esc(label)}</span><h2>${esc(title)}</h2><p>${esc(desc)}</p><strong>Open →</strong></a>`;
 function render(context){
  latest=context; const r=context.route||{},main=context.container,t=TESTS.find(x=>x.id===Number(r.test));
  if(!t){main.innerHTML=frame(head("B1 Preliminary for Schools Trainer","Six tests. Tests 1–2 separate Training activities from Exam Practice. Tests 3–6 contain full practice tests.")+tiles(TESTS.map(x=>tile(path(x.id),x.training?"Training + Exam Practice":"Practice Test",`Test ${x.id}`,"Reading · Writing · Listening · Speaking"))));return;}
  if(!r.mode||(r.mode!=="training"&&r.mode!=="exam")||(r.mode==="training"&&!t.training)){
   const modes=t.training?["training","exam"]:["exam"];
   main.innerHTML=frame(back(BASE,"All tests")+head(`Test ${t.id}`,t.training?"Choose Training or Exam Practice. They are not mixed together.":"Choose the exam-style practice test.")+tiles(modes.map(m=>tile(path(t.id,m),m==="training"?"Guided practice":"Exam-style paper",m==="training"?"Training":"Exam Practice",m==="training"?"Warm-up activities organised by skill and part.":"Reading · Writing · Listening · Speaking"))));return;
  }
  if(!SKILLS[r.skill]){
   main.innerHTML=frame(back(path(t.id),`Test ${t.id}`)+head(`Test ${t.id} · ${r.mode==="training"?"Training":"Exam Practice"}`,"Choose a skill. Page references refer to the printed Trainer book.")+tiles(Object.keys(SKILLS).map(s=>tile(path(t.id,r.mode,s),"Book pages "+t.pages[s],s[0].toUpperCase()+s.slice(1),SKILLS[s]+" parts"))));return;
  }
  const count=SKILLS[r.skill],part=/^part-([1-6])$/.exec(r.part||"");
  if(!part||Number(part[1])>count){
   main.innerHTML=frame(back(path(t.id,r.mode),`Test ${t.id}`)+head(`${r.skill[0].toUpperCase()+r.skill.slice(1)} · Test ${t.id}`,`Book pages ${t.pages[r.skill]}. Only source-verified parts can be scored.`)+tiles(Array.from({length:count},(_,n)=>{
    const p=`part-${n+1}`,k=[t.id,r.mode,r.skill,p].join(":");
    return tile(path(t.id,r.mode,r.skill,p),READY[k]?(attempt(k).checked?"Answers checked":"Ready to practise"):"Content in preparation",`Part ${n+1}`,READY[k]?"Original exam questions with official answer key and Vietnamese explanations.":"This Part has not yet been transferred to the site.");
   })));return;
  }
  const k=key(r),heading=`Test ${t.id} · ${r.skill[0].toUpperCase()+r.skill.slice(1)} · Part ${part[1]}`;
  const returnLink=back(path(t.id,r.mode,r.skill),"All parts");
  if(!READY[k]){main.innerHTML=frame(returnLink+head(heading,"This Part is not available for student use yet.")+`<section class="trainer-empty"><h2>Content in preparation</h2><p>The source questions, audio and publisher-checked answer key have not been published. This Part will not be scored until they are verified.</p></section>`);return;}
  if(!cache.has(k)){
   main.innerHTML=frame(returnLink+head(heading,"Loading original questions…")+`<p class="notice" role="status">Loading questions…</p>`);
   const currentHash=location.hash;
   fetch(new URL(READY[k],document.baseURI)).then(x=>{if(!x.ok)throw Error("HTTP "+x.status);return x.json();}).then(x=>{if(!Array.isArray(x.questions)||!x.questions.length)throw Error("Invalid questions");cache.set(k,x);if(location.hash===currentHash)render(latest);}).catch(()=>{if(location.hash===currentHash)main.innerHTML=frame(returnLink+head(heading,"Unable to load the exam questions.")+`<p class="notice" role="alert">Please check your connection, then reopen this Part.</p>`);});return;
  }
  const data=cache.get(k),saved=attempt(k),score=data.questions.filter(q=>saved.answers[q.id]===q.answer).length;
  main.innerHTML=frame(returnLink+head(data.title,data.instructions)+`<div class="trainer-meta">Questions: ${data.questions.length} · Printed pages ${esc(data.bookPages)} · ${saved.checked?"Answer key checked":"Answers saved in this browser"}</div>`+
   data.questions.map((q,i)=>`<article class="trainer-question"><div class="trainer-qtop"><h2>Question ${i+1}</h2>${saved.checked?`<strong class="${saved.answers[q.id]===q.answer?"trainer-good":"trainer-bad"}">${saved.answers[q.id]===q.answer?"Correct":"Incorrect"}</strong>`:""}</div><div class="trainer-source">${esc(q.source)}</div>${q.ask?`<p class="trainer-ask">${esc(q.ask)}</p>`:""}<fieldset ${saved.checked?"disabled":""}><legend>Choose A, B or C</legend>${Object.entries(q.options).map(([letter,option])=>`<label class="trainer-choice ${saved.checked&&q.answer===letter?"trainer-right":""}"><input type="radio" name="${esc(q.id)}" value="${letter}" data-trainer-question="${esc(q.id)}" ${saved.answers[q.id]===letter?"checked":""}><b>${letter}</b><span>${esc(option)}</span></label>`).join("")}</fieldset>${saved.checked?`<div class="trainer-explain" lang="vi"><b>Đáp án: ${q.answer}</b><p>${esc(q.explanationVi)}</p></div>`:""}</article>`).join("")+
   `<div class="trainer-actions">${saved.checked?`<p class="trainer-score" role="status">Score: <strong>${score}/${data.questions.length}</strong></p><button class="btn" type="button" data-trainer-action="retry">Try again</button>`:`<button class="btn btn-primary" type="button" data-trainer-action="check">Check answers</button>`}</div><p class="trainer-credit">Verified against the official Teacher’s Notes &amp; Keys. ${esc(data.keySource)}.</p>`);
 }
 document.addEventListener("change",e=>{
  const input=e.target.closest("#trainer input[data-trainer-question]");if(!input||!latest)return;
  const k=key(latest.route),v=attempt(k);if(v.checked)return;v.answers[input.dataset.trainerQuestion]=input.value;
  if(!persist(k,v))window.alert("Could not save the answer in browser storage.");
 });
 document.addEventListener("click",e=>{
  const btn=e.target.closest("#trainer [data-trainer-action]");if(!btn||!latest)return;
  e.preventDefault();const k=key(latest.route),v=attempt(k);
  if(btn.dataset.trainerAction==="check")v.checked=true;
  else if(btn.dataset.trainerAction==="retry")v.answers={},v.checked=false;
  else return;
  if(!persist(k,v))window.alert("Unable to save this result on your device.");
  render(latest);
 });
 window.WordHopTrainer={render,stop(){latest=null;}};
})();
