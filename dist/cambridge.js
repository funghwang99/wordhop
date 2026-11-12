'use strict';
(() => {
  const KEY_ROOT = 'wordhop.cambridge-academic-21.v1';
  const keys = window.WORDHOP_CAMBRIDGE_KEYS || {};
  const skillNames = {listening:'Listening',reading:'Reading',writing:'Writing',speaking:'Speaking'};
  const skills = ['listening','reading','writing','speaking'];
  const unordered = {
    '5': {listening:[[15,16]],reading:[]},
    '6': {listening:[],reading:[[10,11],[12,13]]},
    '7': {listening:[[11,12],[13,14]],reading:[]},
    '8': {listening:[],reading:[]}
  };
  const task2 = {
    5:'Some people believe that it is good to share as much information as possible in scientific research, business and the academic world. Others believe that some information is too important or too valuable to be shared freely. Discuss both these views and give your own opinion.',
    6:'At the present time, the population of some countries includes a relatively large number of young adults, compared with the number of older people. Do the advantages of this situation outweigh the disadvantages?',
    7:'In a number of countries, some people think it is necessary to spend large sums of money on constructing new railway lines for very fast trains between cities. Others believe the money should be spent on improving existing public transport. Discuss both these views and give your own opinion.',
    8:'Some people believe that allowing children to make their own choices on everyday matters (such as food, clothes and entertainment) is likely to result in a society of individuals who only think about their own wishes. Other people believe that it is important for children to make decisions about matters that affect them. Discuss both these views and give your own opinion.'
  };
  const task1 = {
    5:'The bar chart shows the percentage of Australian men and women in different age groups who did regular physical activity in 2010.',
    6:'The maps show the centre of a small town called Islip as it is now, and plans for its development.',
    7:'The chart shows how frequently people in the USA ate in fast food restaurants between 2003 and 2013.',
    8:'The diagram shows how geothermal energy is used to produce electricity.'
  };
  const dataTables = {
    5:'<table class="cm-source-table"><thead><tr><th>Age group</th><th>Men</th><th>Women</th></tr></thead><tbody><tr><td>15–24</td><td>52.8%</td><td>47.7%</td></tr><tr><td>25–34</td><td>42.2%</td><td>48.9%</td></tr><tr><td>35–44</td><td>39.5%</td><td>52.5%</td></tr><tr><td>45–54</td><td>43.1%</td><td>53.3%</td></tr><tr><td>55–64</td><td>45.1%</td><td>53%</td></tr><tr><td>65+</td><td>46.7%</td><td>47.1%</td></tr></tbody></table>',
    7:'<table class="cm-source-table"><thead><tr><th>Frequency</th><th>2003</th><th>2006</th><th>2013</th></tr></thead><tbody><tr><td>Every day</td><td>4%</td><td>3%</td><td>3%</td></tr><tr><td>Several times a week</td><td>17%</td><td>20%</td><td>16%</td></tr><tr><td>Once a week</td><td>31%</td><td>33%</td><td>28%</td></tr><tr><td>Once or twice a month</td><td>30%</td><td>25%</td><td>33%</td></tr><tr><td>A few times a year</td><td>13%</td><td>15%</td><td>15%</td></tr><tr><td>Never</td><td>5%</td><td>4%</td><td>4%</td></tr></tbody></table>'
  };
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function storeGet(id){try{return localStorage.getItem(KEY_ROOT+'.'+id)||'';}catch{return '';}}
  function storeSet(id,value){try{localStorage.setItem(KEY_ROOT+'.'+id,value);}catch{}}
  function nameId(test,skill,n){return test+'-'+skill+'-'+n;}
  function normal(s){return String(s??'').normalize('NFKC').trim().toLowerCase().replace(/[‘’]/g,"'").replace(/[\s\-_]+/g,' ').replace(/\.(?!\d)/g,'').replace(/\s+/g,' ').trim();}
  function variants(key){
    let parts=String(key).split('/');
    const out=[];
    for(const part of parts){
      const m=part.match(/\(([a-z]+)\)/i);
      if(m){out.push(normal(part.replace(/\([a-z]+\)/i,'')));out.push(normal(part.replace(/\(([a-z]+)\)/i,'$1')));}
      else out.push(normal(part));
    }
    if(key==='travel/travel(l)ing')out.push('travel','traveling','travelling');
    return [...new Set(out)];
  }
  function correctFor(test,skill,allAnswers) {
    const base = (keys[test]||{})[skill]||[];
    const result = [];
    for(let n=1;n<=40;n++)result[n] = variants(base[n-1]).includes(normal(allAnswers[n]||''));
    const groups = ((unordered[test]||{})[skill]||[]);
    for(const g of groups){
      const remaining=g.map(n=>base[n-1]);
      for(const n of g){
        const val=normal(allAnswers[n]||'');
        const idx=remaining.findIndex(k=>val.length>0&&variants(k).includes(val));
        result[n]=idx!==-1;
        if(idx!==-1)remaining.splice(idx,1);
      }
    }
    return result;
  }
  function rangeFor(skill,index){if(skill==='listening')return [1+(index-1)*10,index*10];return [[1,13],[14,26],[27,40]][index-1]||[1,13];}
  function pageNumbers(p){const list=[];for(let n=p[0];n<=p[1];n++)list.push(n);return list;}
  function answerBox(test,skill,start,end){
    let out='<div class="cm-answer-grid">';
    for(let n=start;n<=end;n++){
      out+='<label class="cm-answer"><span>'+n+'</span><input data-cm-answer="'+esc(nameId(test,skill,n))+'" data-cm-number="'+n+'" autocomplete="off" value="'+esc(storeGet(nameId(test,skill,n)))+'" placeholder="Answer '+n+'" aria-label="Question '+n+'"><small class="cm-answer-feedback" data-cm-result="'+n+'"></small></label>';
    }
    return out+'</div>';
  }
  function mediaPanel(test,skill,index,exam,volume){
    const pieces=[];
    const section=skill==='listening'?'Section '+index:skill==='reading'?'Passage '+index:'Task '+index;
    const path=skill==='speaking'?exam.pages.speaking:exam.pages[skill][index-1];
    const pages=pageNumbers(path);
    pieces.push('<h2>'+esc(section)+'</h2>');
    pieces.push('<p class="cm-small">Original book pages '+esc(path[0]===path[1]?path[0]:path.join('–'))+'</p>');
    const mediaRoot = volume.mediaRoot||null;
    if(skill==='listening'){
      const audio = (exam.audio||[])[index-1];
      if(audio) pieces.push('<audio controls preload="none" src="'+esc(audio)+'" class="cm-audio">Audio section '+index+'</audio>');
      else pieces.push('<div class="cm-media-missing"><strong>Audio unavailable online</strong><p>The section recording has been supplied, but its media file is not hosted on WordHop yet.</p></div>');
    }
    if(mediaRoot){
      pieces.push('<div class="cm-scanned-pages">'+pages.map(n=>'<figure><img loading="lazy" src="'+esc(mediaRoot+'/pages/page-'+String(n).padStart(3,'0')+'.webp')+'" alt="Original source page '+n+'"><figcaption>Original page '+n+'</figcaption></figure>').join('')+'</div>');
    }else{
      pieces.push('<div class="cm-media-missing"><strong>Scanned question pages not yet hosted</strong><p>Use the supplied Cambridge 12 Academic PDF alongside this answer sheet. Book page'+(pages.length>1?'s ':' ')+pages.join(', ')+'.</p></div>');
    }
    return pieces.join('');
  }
  function wordCount(value){return (String(value).trim().match(/\S+/g)||[]).length;}
  function tabHref(base,skill){return base+'/'+skill+'/1';}
  function buildTabs(base,skill){
    return '<div class="unit-tabs cm-tabs" role="navigation" aria-label="Exam skills">'+skills.map((s,i)=>'<a class="unit-tab '+(s===skill?'active':'')+'" href="'+esc(tabHref(base,s))+'" data-nav="'+esc(tabHref(base,s))+'"><span class="step-num">'+(i+1)+'</span>'+skillNames[s]+'</a>').join('')+'</div>';
  }
  function partTabs(base,skill,index){
    if(skill==='speaking')return '';
    const count=skill==='listening'?4:skill==='reading'?3:2;
    const prefix=skill==='listening'?'Section ':skill==='reading'?'Passage ':'Task ';
    return '<div class="cm-part-tabs">'+Array.from({length:count},(_,i)=>'<a class="cm-part-tab '+(i+1===index?'active':'')+'" href="'+esc(base+'/'+skill+'/'+(i+1))+'" data-nav="'+esc(base+'/'+skill+'/'+(i+1))+'">'+prefix+(i+1)+'</a>').join('')+'</div>';
  }
  function answerPage(test,skill,index,exam,volume){
    const [start,end]=rangeFor(skill,index);
    const intro=skill==='listening'?'Listen to the recording and answer the 10 questions for this section.':'Read the corresponding passage in the source PDF and complete the questions.';
    return '<p class="cm-intro">'+intro+'</p><div class="cm-layout"><section class="cm-source">'+mediaPanel(test,skill,index,exam,volume)+'</section><aside class="cm-panel cm-sheet"><div class="cm-panel-head"><h2>Answer sheet</h2><span>Questions '+start+'–'+end+'</span></div>'+answerBox(test,skill,start,end)+'<p class="cm-small">Your answers are saved in this browser as you type.</p><div class="cm-actions"><button type="button" class="btn btn-primary" data-cm-check="'+skill+'">Check all 40 answers</button><button type="button" class="btn" data-cm-copy="'+skill+'">Copy answers</button></div><p class="cm-feedback-line" data-cm-feedback aria-live="polite"></p></aside></div>';
  }
  function writingPage(test,index,exam,volume){
    const prompt=index===1?task1[test]:task2[test];
    const id=nameId(test,'writing',index);
    const value=storeGet(id);
    let doc='<div class="cm-prompt"><p class="cm-small">Original writing page '+exam.pages.writing[index-1][0]+'</p><h2>Writing Task '+index+'</h2><p class="cm-prompt-text">'+esc(prompt)+'</p>';
    if(index===1&&dataTables[test])doc+='<p class="cm-small">Text alternative for the chart (use your original PDF to confirm layout):</p>'+dataTables[test];
    if(index===1&&!dataTables[test])doc+='<p class="cm-media-missing">The original map or process diagram is not yet available on the website. Consult the supplied PDF for the visual information before writing.</p>';
    doc+='</div>';
    return '<div class="cm-layout"><section class="cm-source">'+doc+'</section><aside class="cm-panel"><h2>Your answer</h2><p class="cm-small">Write at least '+(index===1?150:250)+' words. Saved automatically.</p><textarea class="cm-writing" data-cm-writing="'+esc(id)+'" aria-label="Writing Task '+index+'" placeholder="Type your essay here...">'+esc(value)+'</textarea><p class="cm-counter">Word count: <strong data-cm-wordcount>'+wordCount(value)+'</strong></p><button type="button" class="btn" data-cm-copy-writing="'+esc(id)+'">Copy essay</button><p class="cm-feedback-line" data-cm-feedback aria-live="polite"></p></aside></div>';
  }
  function overview(base,exam){
    return '<div class="cards cm-overview">'+skills.map((s,i)=>{
      const label=['4 sections · 40 questions','3 passages · 40 questions','2 tasks','3 speaking parts'][i];
      const info=['Answer sheet and marking','Answer sheet and marking','Essay editor with word count','Examiner prompts in source PDF'][i];
      return '<a class="nav-card compact" href="'+esc(tabHref(base,s))+'" data-nav="'+esc(tabHref(base,s))+'"><span class="card-label">'+label+'</span><h2>'+skillNames[s]+'</h2><p>'+info+'</p><span class="card-meta">Open '+skillNames[s]+'</span></a>';
    }).join('')+'</div><p class="notice">The exam answer sheets and publisher answer keys are available online. The original scanned pages and Listening audio are still awaiting media upload.</p>';
  }
  function render(args){
    const {container,route,header,base} = args;
    const volume=route.volume,exam=route.exam,test=String(exam.id.replace('test-',''));
    const skill=skills.includes(route.skill)?route.skill:null;
    const index=route.part&&Number.isInteger(route.part)?route.part:1;
    const n=skill==='listening'?Math.min(index,4):skill==='reading'?Math.min(index,3):skill==='writing'?Math.min(index,2):1;
    let output=header;
    if(!skill){output+=overview(base,exam);container.innerHTML=output;return;}
    output+=buildTabs(base,skill)+partTabs(base,skill,n);
    if(skill==='listening'||skill==='reading')output+=answerPage(test,skill,n,exam,volume);
    else if(skill==='writing')output+=writingPage(test,n,exam,volume);
    else output+='<div class="cm-panel"><h2>Speaking</h2><p>Original examiner prompts are on page '+exam.pages.speaking[0]+' of the supplied Cambridge IELTS 12 Academic PDF. The scanned page is not yet hosted online.</p><p class="cm-small">Complete Part 1, Part 2 (long turn), and Part 3 with a partner or examiner.</p></div>';
    container.innerHTML=output;
  }
  function collect(test,skill){
    const answers={};
    for(let n=1;n<=40;n++)answers[n]=storeGet(nameId(test,skill,n));
    return answers;
  }
  function currentExam(el){
    const match=(location.hash||'').match(/\/test-(5|6|7|8)\/(listening|reading|writing|speaking)/);
    if(!match)return null;
    return {test:match[1],skill:match[2]};
  }
  function mark(root,skill){
    const state=currentExam(root);if(!state||state.skill!==skill)return;
    const {test}=state,all=collect(test,skill),verified=correctFor(test,skill,all);
    const correct=verified.slice(1).filter(Boolean).length;
    const completed=Object.values(all).filter(v=>normal(v)!=='').length;
    for(const input of root.querySelectorAll('[data-cm-answer]')){
      const n=Number(input.dataset.cmNumber),mark=root.querySelector('[data-cm-result="'+n+'"]');
      input.classList.toggle('cm-correct',!!verified[n]);
      input.classList.toggle('cm-incorrect',!verified[n]);
      if(mark)mark.textContent=verified[n]?'Correct':'Key: '+((keys[test]||{})[skill]||[])[n-1];
    }
    const feedback=root.querySelector('[data-cm-feedback]');
    if(feedback)feedback.textContent='Score: '+correct+'/40 · Answered: '+completed+'/40. This is a raw practice score, not an official IELTS band.';
  }
  function copyText(text){
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);
    const temp=document.createElement('textarea');temp.value=text;document.body.append(temp);temp.select();document.execCommand('copy');temp.remove();return Promise.resolve();
  }
  document.addEventListener('input',event=>{
    const t=event.target;
    if(t.matches('[data-cm-answer]')){
      storeSet(t.dataset.cmAnswer,t.value);
      t.classList.remove('cm-correct','cm-incorrect');
      const mark=t.closest('.cm-answer')?.querySelector('.cm-answer-feedback');
      if(mark)mark.textContent='';
    }else if(t.matches('[data-cm-writing]')){
      storeSet(t.dataset.cmWriting,t.value);
      const target=t.closest('.cm-panel')?.querySelector('[data-cm-wordcount]');
      if(target)target.textContent=wordCount(t.value);
    }
  });
  document.addEventListener('click',event=>{
    const btn=event.target.closest('[data-cm-check],[data-cm-copy],[data-cm-copy-writing]');
    if(!btn)return;
    const root=btn.closest('#main');if(!root)return;
    if(btn.dataset.cmCheck){mark(root,btn.dataset.cmCheck);return;}
    if(btn.dataset.cmCopy){
      const state=currentExam(root);if(!state)return;
      const all=collect(state.test,btn.dataset.cmCopy);
      const lines=Object.entries(all).map(([n,v])=>n+'. '+(v||'—')).join('\n');
      copyText('Cambridge IELTS Academic 21 · Test '+state.test+' · '+btn.dataset.cmCopy+'\n'+lines).then(()=>{
        const p=root.querySelector('[data-cm-feedback]');if(p)p.textContent='Answer sheet copied.';
      }).catch(()=>{});
    }
    if(btn.dataset.cmCopyWriting){
      copyText(storeGet(btn.dataset.cmCopyWriting)).then(()=>{
        const p=root.querySelector('[data-cm-feedback]');if(p)p.textContent='Essay copied.';
      }).catch(()=>{});
    }
  });
  window.WordHopCambridge={render,correctFor,variants};
})();
