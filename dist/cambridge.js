'use strict';
(() => {
  const STORE='wordhop.cambridge.exam.v2', LEGACY='wordhop.cambridge-academic-21.v1';
  const skillNames={listening:'Listening',reading:'Reading',writing:'Writing',speaking:'Speaking'};
  const skills=Object.keys(skillNames);
  const keys={...(window.WORDHOP_CAMBRIDGE_KEYS||{}),...(window.WORDHOP_CAMBRIDGE13_KEYS||{}),...(window.WORDHOP_CAMBRIDGE14_KEYS||{})};
  const unordered={
    '5':{listening:[[15,16]],reading:[]},
    '6':{listening:[],reading:[[10,11],[12,13]]},
    '7':{listening:[[11,12],[13,14]],reading:[]},
    '8':{listening:[],reading:[]},
    '13-1':{listening:[],reading:[]},
    '13-2':{listening:[[17,18],[19,20]],reading:[]},
    '13-3':{listening:[[17,18],[19,20]],reading:[]},
    '13-4':{listening:[[27,28],[29,30]],reading:[]},
    '14-1':{listening:[[11,12],[13,14]],reading:[[4,5],[19,20],[21,22]]},
    '14-2':{listening:[],reading:[]},
    '14-3':{listening:[[11,12],[13,14]],reading:[[21,22]]},
    '14-4':{listening:[[17,18],[19,20]],reading:[[23,24],[25,26]]}
  };
  const essayTopics={
    5:{
      1:'The bar chart below shows the percentage of Australian men and women in different age groups who did regular physical activity in 2010.',
      2:'Some people believe that it is good to share as much information as possible in scientific research, business and the academic world. Others believe that some information is too important or too valuable to be shared freely. Discuss both these views and give your own opinion.'
    },
    6:{
      1:'The maps below show the centre of a small town called Islip as it is now, and plans for its development.',
      2:'At the present time, the population of some countries includes a relatively large number of young adults, compared with the number of older people. Do the advantages of this situation outweigh the disadvantages?'
    },
    7:{
      1:'The chart below shows how frequently people in the USA ate in fast food restaurants between 2003 and 2013.',
      2:'In a number of countries, some people think it is necessary to spend large sums of money on constructing new railway lines for very fast trains between cities. Others believe the money should be spent on improving existing public transport. Discuss both these views and give your own opinion.'
    },
    8:{
      1:'The diagram below shows how geothermal energy is used to produce electricity.',
      2:'Some people believe that allowing children to make their own choices on everyday matters (such as food, clothes and entertainment) is likely to result in a society of individuals who only think about their own wishes. Other people believe that it is important for children to make decisions about matters that affect them. Discuss both these views and give your own opinion.'
    },
    '13-1':{
      1:'The two maps below show road access to a city hospital in 2007 and in 2010.',
      2:'Living in a country where you have to speak a foreign language can cause serious social problems, as well as practical problems. To what extent do you agree or disagree with this statement?'
    },
    '13-2':{
      1:'The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011.',
      2:'Some people believe that nowadays we have too many choices. To what extent do you agree or disagree with this statement?'
    },
    '13-3':{
      1:'The bar chart below shows the top ten countries for the production and consumption of electricity in 2014.',
      2:'Some people say History is one of the most important school subjects. Other people think that, in today’s world, subjects like Science and Technology are more important than History. Discuss both these views and give your own opinion.'
    },
    '13-4':{
      1:'The plans below show the layout of a university’s sports centre now, and how it will look after redevelopment.',
      2:'In spite of the advances made in agriculture, many people around the world still go hungry. Why is this the case? What can be done about this problem?'
    },
    '14-1':{
      1:'The charts below show the average percentages in typical meals of three types of nutrients, all of which may be unhealthy if eaten too much.',
      2:'Some people believe that it is best to accept a bad situation, such as an unsatisfactory job or shortage of money. Others argue that it is better to try and improve such situations. Discuss both these views and give your own opinion.'
    },
    '14-2':{
      1:'The chart below shows the value of one country’s exports in various categories during 2015 and 2016. The table shows the percentage change in each category of exports in 2016 compared with 2015.',
      2:'Some people say that the main environmental problem of our time is the loss of particular species of plants and animals. Others say that there are more important environmental problems. Discuss both these views and give your own opinion.'
    },
    '14-3':{
      1:'The diagram below shows how electricity is generated in a hydroelectric power station.',
      2:'Some people say that music is a good way of bringing people of different cultures and ages together. To what extent do you agree or disagree with this opinion?'
    },
    '14-4':{
      1:'The plans below show a public park when it first opened in 1920 and the same park today.',
      2:'Nowadays many people choose to be self-employed, rather than to work for a company or organisation. Why might this be the case? What could be the disadvantages of being self-employed?'
    }
  };
  let active=null, saving=null, submitted=new Set();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normal=s=>String(s??'').normalize('NFKC').trim().toLowerCase().replace(/[‘’]/g,"'").replace(/[\s\-_]+/g,' ').replace(/\.$/,'').trim();
  const wordCount=s=>(String(s??'').trim().match(/\S+/g)||[]).length;
  // Resolve media from the deployed site's path, never from the in-app hash route.
  // This works for both root deployments and GitHub Pages project subfolders.
  function mediaURL(relative){
    const path=String(window.location?.pathname||'/wordhop/');
    const base=path.endsWith('/')?path:path.slice(0,path.lastIndexOf('/')+1);
    return base+String(relative||'').replace(/^\/+/, '');
  }
  const toKey=(test,skill,part)=>STORE+'.test-'+test+'.'+skill+'.part-'+part;
  const get=(k)=>{try{return localStorage.getItem(k)||'';}catch{return '';}};
  const set=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch{return false;}};
  const ranges={reading:[[1,13],[14,26],[27,40]],listening:[[1,10],[11,20],[21,30],[31,40]]};
  function range(skill,part){return ranges[skill]?.[part-1]||[1,10];}
  function variants(key){
    const out=new Set();
    for(const option of String(key??'').split('/')){
      const match=option.match(/\(([a-z]+)\)/i);
      out.add(normal(option.replace(/\(([a-z]+)\)/i,'')));
      if(match)out.add(normal(option.replace(/\(([a-z]+)\)/i,'$1')));
    }
    if(key==='travel/travel(l)ing')for(const x of ['travel','traveling','travelling'])out.add(x);
    if(key==='mosquito(e)s')for(const x of ['mosquito','mosquitoes','mosquitos'])out.add(x);
    return [...out];
  }
  function matches(key,value){return normal(value)!==''&&variants(key).includes(normal(value));}
  function score(test,skill,answers){
    const key=(keys[test]||{})[skill]||[];
    const checked=Array.from({length:41},(_,n)=>n>0&&matches(key[n-1],answers[n]));
    for(const group of unordered[test]?.[skill]||[]){
      let remaining=group.map(n=>key[n-1]);
      for(const n of group){
        const ix=remaining.findIndex(answer=>matches(answer,answers[n]));
        checked[n]=ix>=0;
        if(ix>=0)remaining.splice(ix,1);
      }
    }
    return checked;
  }
  function attempt(test,skill,part){
    const id=toKey(test,skill,part);
    try{const item=JSON.parse(get(id));if(item&&typeof item.answers==='object'&&!Array.isArray(item.answers))return {answers:item.answers,checked:Boolean(item.checked),submission:item.submission||null};}catch{}
    const item={answers:{},checked:false,submission:null};
    if(skill==='listening'||skill==='reading'){
      const [from,to]=range(skill,part);
      for(let n=from;n<=to;n++){const old=get(LEGACY+'.'+test+'-'+skill+'-'+n);if(old)item.answers[n]=old;}
    }else if(skill==='writing'){const old=get(LEGACY+'.'+test+'-writing-'+part);if(old)item.answers[part]=old;}
    return item;
  }
  function persist(test,skill,part,item){return set(toKey(test,skill,part),JSON.stringify(item));}
  function progressCount(test,skill){return ranges[skill].filter((_,i)=>attempt(test,skill,i+1).checked).length;}
  const baseOf=(route)=>'#/ielts/cambridge-ielts/'+route.volume.id+'/'+route.exam.id;
  const testCode=route=>route.volume.id==='cambridge-ielts-academic-14'?'14-'+route.exam.id.replace('test-',''):route.volume.id==='cambridge-ielts-academic-13'?'13-'+route.exam.id.replace('test-',''):route.exam.id.replace('test-','');
  const link=(base,skill,part)=>base+'/'+skill+'/part-'+part;
  const nav=(path,label,klass,selected)=>'<a href="'+esc(path)+'" data-nav="'+esc(path)+'" class="'+klass+(selected?' active':'')+'"'+(selected?' aria-current="page"':'')+'>'+label+'</a>';
  function header(route,crumbs,base,skill){
    return crumbs+'<div class="unit-heading"><div><h1>'+esc(route.exam.title)+'</h1><p>'+esc(route.volume.title)+' · IELTS Academic</p></div><div class="unit-heading-actions"><span class="unit-badge">40 Listening · 40 Reading</span><button type="button" class="text-button clear-results-button" data-cam-action="clear">Clear saved results</button></div></div>'+
      '<div class="unit-tabs" role="navigation" aria-label="Exam skills">'+skills.map((s,i)=>
        nav(link(base,s,1),'<span class="step-num">'+(i+1)+'</span>'+skillNames[s],'unit-tab',s===skill)).join('')+'</div>';
  }
  function partNav(base,test,skill,current){
    const title=skill==='reading'?'Passage':skill==='writing'?'Task':'Section';
    const n=skill==='reading'?3:skill==='writing'?2:4;
    const klass=skill==='listening'?'listening-parts':'reading-parts';
    return '<nav class="'+klass+'" aria-label="'+skillNames[skill]+' parts">'+Array.from({length:n},(_,i)=>{
      const p=i+1,yes=skill==='writing'?Boolean(get(toKey(test,skill,p))):attempt(test,skill,p).checked;
      const item=title+' '+p+(yes&&skill!=='writing'?' ✓':'');
      if(skill==='listening')return nav(link(base,skill,p),'<strong>'+item+'</strong><span>Questions '+(p*10-9)+'–'+(p*10)+'</span>','listening-part',p===current);
      return nav(link(base,skill,p),item,'reading-part-link',p===current);
    }).join('')+'</nav>';
  }
  function pageRange(route,skill,part){
    const p=route.exam.pages||{};
    if(route.volume.id==='cambridge-ielts-academic-14'){
      const n=Number(route.exam.id.replace('test-',''));
      const perTest={
        1:{listening:[[10,10],[11,12],[13,14],[15,15]],reading:[[16,19],[20,24],[25,28]]},
        2:{listening:[[32,32],[33,34],[35,36],[37,37]],reading:[[38,41],[42,45],[46,49]]},
        3:{listening:[[53,53],[54,55],[56,57],[58,58]],reading:[[59,62],[63,66],[67,71]]},
        4:{listening:[[75,76],[77,78],[79,80],[81,81]],reading:[[82,85],[86,89],[90,93]]}
      };
      if(skill==='listening'||skill==='reading')return perTest[n]?.[skill]?.[part-1]||p[skill];
      if(skill==='writing')return [p.writing[0]+part-1,p.writing[0]+part-1];
      if(skill==='speaking')return p.speaking;
    }
    if(route.volume.id==='cambridge-ielts-academic-13'){
      const n=Number(route.exam.id.replace('test-',''));
      const begin=10+(n-1)*22;
      if(skill==='listening')return [
        [[begin,begin],[begin+1,begin+2],[begin+3,begin+4],[begin+5,begin+5]][part-1]||[begin,begin]
      ][0];
      if(skill==='reading'){
        const start=begin+6;
        const paths=n===4?[[start,start+3],[start+4,start+6],[start+7,start+11]]:
          [[start,start+3],[start+4,start+7],[start+8,start+12]];
        return paths[part-1]||paths[0];
      }
      const writeFirst=n===4?94:begin+19;
      if(skill==='writing')return [writeFirst+part-1,writeFirst+part-1];
      if(skill==='speaking')return [writeFirst+2,writeFirst+2];
    }
    if(skill==='listening'){
      const ranges={
        5:[[10,11],[12,13],[14,14],[15,15]],
        6:[[30,30],[31,32],[33,34],[35,35]],
        7:[[53,53],[54,55],[56,57],[58,58]],
        8:[[74,74],[75,76],[77,78],[79,79]]
      };
      return ranges[route.exam.id.replace('test-','')]?.[part-1]||p.listening;
    }
    if(skill==='writing'){const x=p.writing||[1,1];return [x[0]+part-1,x[0]+part-1];}
    if(skill==='speaking')return p.speaking;
    const ranges={
      5:[[16,19],[20,22],[23,26]],
      6:[[36,41],[42,45],[46,49]],
      7:[[59,62],[63,65],[66,70]],
      8:[[80,82],[83,87],[88,91]]
    };
    return ranges[route.exam.id.replace('test-','')]?.[part-1]||p.reading;
  }
  function pageViewer(route,skill,part){
    const [from,to]=pageRange(route,skill,part),root=route.volume.mediaRoot;
    if(root){
      const pages=Array.from({length:to-from+1},(_,i)=>from+i);
      return '<div class="reading-page" tabindex="0" aria-label="Original book pages">'+pages.map((n,i)=>{
        const src=mediaURL(root.replace(/\/$/,'')+'/pages/page-'+String(n).padStart(3,'0')+'.webp');
        return '<img src="'+esc(src)+'" data-cam-page="'+n+'" alt="Cambridge IELTS original book page '+n+'" decoding="async" loading="'+(i?'lazy':'eager')+'">';
      }).join('')+'</div>';
    }
    return '<div class="reading-page cm-page-pending" tabindex="0"><div class="cm-missing-content"><svg class="icon" aria-hidden="true"><use href="#i-book"/></svg><h4>Original book page'+(to>from?'s':'')+' '+from+(to>from?'–'+to:'')+'</h4><p>The PDF pages have not been uploaded to WordHop yet. Use the '+esc(route.volume.title)+' PDF provided by your teacher to read the full passage, options and diagrams.</p></div></div>';
  }
  function mediaControls(route,skill,part){
    const root=route.volume.mediaRoot;
    if(!root)return '';
    const first=pageRange(route,skill,part)[0],src=mediaURL(root.replace(/\/$/,'')+'/pages/page-'+String(first).padStart(3,'0')+'.webp');
    return '<div class="reading-page-actions"><button class="btn" type="button" data-cam-action="zoom" aria-pressed="false">Zoom page</button><a class="text-button" href="'+esc(src)+'" target="_blank" rel="noopener">Open full-size page ↗</a></div>';
  }
  function keyFor(test,skill,n){return String((keys[test]||{})[skill]?.[n-1]||'');}
  function answerOptions(test,skill,n){
    const k=keyFor(test,skill,n).toUpperCase();
    if(['TRUE','FALSE','NOT GIVEN'].includes(k))return ['TRUE','FALSE','NOT GIVEN'];
    if(['YES','NO','NOT GIVEN'].includes(k))return ['YES','NO','NOT GIVEN'];
    if(/^(?:VIII|VII|VI|IV|III|II|IX|V|I|X)$/.test(k))return ['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
    if(/^[A-H]$/.test(k))return 'ABCDEFGH'.split('');
    return null;
  }
  function answerInput(test,skill,n,item){
    const id='cambridge-'+skill+'-'+n,v=item.answers[n]||'',isChecked=item.checked;
    const good=isChecked?score(test,skill,item.answers)[n]:false;
    const opts=answerOptions(test,skill,n);
    const control=opts?'<select id="'+id+'" name="'+n+'" data-cam-answer="'+n+'"'+(isChecked?' disabled':'')+'><option value="">Choose</option>'+opts.map(x=>'<option value="'+esc(x)+'"'+(normal(x)===normal(v)?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select>':
      '<input id="'+id+'" name="'+n+'" data-cam-answer="'+n+'" value="'+esc(v)+'" maxlength="90" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Your answer"'+(isChecked?' disabled':'')+'>';
    return '<div class="reading-answer-row'+(isChecked?(good?' reading-correct':' reading-incorrect'):'')+'"><label for="'+id+'">Question '+n+'</label>'+control+(isChecked?'<span class="reading-answer-state">'+(good?'Correct':String(v).trim()?'Review':'Not answered')+'</span>':'')+'</div>';
  }
  function solution(test,skill,n,item,graded){
    const value=item.answers[n]||'';
    const k=keyFor(test,skill,n);
    return '<article class="reading-solution '+(graded[n]?'reading-correct':'reading-incorrect')+'"><div class="reading-solution-top"><h4>Question '+n+' · '+esc(k)+'</h4><span>'+(graded[n]?'Correct':'Review')+'</span></div><p class="reading-your-answer">Your answer: <strong>'+esc(String(value).trim()||'Not answered')+'</strong></p><p>Publisher answer key: '+esc(k)+'.</p></article>';
  }
  function answerSheet(test,skill,part){
    const [from,to]=range(skill,part),item=attempt(test,skill,part),graded=score(test,skill,item.answers);
    const total=to-from+1,correct=Array.from({length:total},(_,i)=>from+i).filter(n=>graded[n]).length;
    return '<form class="reading-answer-sheet" data-cam-form="'+skill+'"><div class="reading-sheet-heading"><div><h3>Answer sheet</h3><p>Follow the original book instructions and word limits for Questions '+from+'–'+to+'. Answers are saved on this device.</p></div>'+(item.checked?'<strong class="reading-score" role="status" tabindex="-1">'+correct+'/'+total+' correct</strong>':'')+'</div><div class="reading-answer-inputs">'+Array.from({length:total},(_,i)=>answerInput(test,skill,from+i,item)).join('')+'</div><div class="reading-submit-row">'+(item.checked?'<button type="button" class="btn" data-cam-action="retry">Try this part again</button>':'<button type="submit" class="btn btn-primary">Check answers</button>')+'<button class="text-button" type="button" data-cam-action="back-to-page">Back to book page ↑</button></div></form>'+
      (item.checked?'<section class="reading-solutions"><h3>Answer key &amp; results</h3><p class="reading-solution-note">Checked against the publisher answer key in the supplied Cambridge IELTS PDF. Detailed explanations and timestamped audio replays are not available yet.</p>'+Array.from({length:total},(_,i)=>solution(test,skill,from+i,item,graded)).join('')+'</section>':'<p class="reading-key-note">Check your answers to see the answer key for every question. Unanswered questions receive no mark.</p>');
  }
  function reading(route,base){
    const test=testCode(route),part=Math.min(Math.max(route.part,1),3),pg=pageRange(route,'reading',part);
    const complete=progressCount(test,'reading');
    return '<section class="reading-view cm-cambridge-exam" aria-label="Book reading test"><div class="reading-intro"><div><h2>Reading</h2><p>Read the passage on the left and answer the questions on the right. Both panels scroll independently.</p></div><span class="reading-completion">'+complete+'/3 passages checked</span></div>'+
      partNav(base,test,'reading',part)+
      '<div class="cm-exam-split" role="group" aria-label="Reading passage and answer sheet">'+
      '<section class="cm-split-pane cm-question-pane" aria-label="Reading passage" tabindex="0"><div class="cm-pane-label"><strong>Reading passage '+part+'</strong><span>Scroll to read the original pages</span></div>'+
      '<div class="reading-part-heading"><div><h3>Reading Passage '+part+'</h3><p>Questions '+range('reading',part).join('–')+' · Book '+(pg[0]===pg[1]?'page':'pages')+' '+pg.join('–')+'</p></div>'+mediaControls(route,'reading',part)+'</div>'+
      pageViewer(route,'reading',part)+
      '<p class="reading-source-note">Original passages, questions and answer key: '+esc(route.volume.sourceTitle||route.volume.title)+'. Cambridge University Press.</p></section>'+
      '<section class="cm-split-pane cm-response-pane" aria-label="Reading answer sheet" tabindex="0"><div class="cm-pane-label"><strong>Answer sheet</strong><span>Scroll to answer all questions</span></div>'+
      answerSheet(test,'reading',part)+'</section></div></section>';
  }
  function listening(route,base){
    const test=testCode(route),part=Math.min(Math.max(route.part,1),4),p=pageRange(route,'listening',part);
    const audio=route.exam.audio?.[part-1]?mediaURL(route.exam.audio[part-1]):null,complete=progressCount(test,'listening');
    return '<section class="listening-view cm-cambridge-exam" aria-label="Book listening test"><div class="listening-intro"><div><h2>Listening</h2><p>Play the recording and read the questions on the left while filling the answer sheet on the right.</p></div><span class="listening-count">'+complete+'/4 sections checked</span></div>'+
      partNav(base,test,'listening',part)+
      '<div class="cm-exam-split" role="group" aria-label="Listening questions and answer sheet">'+
      '<section class="cm-split-pane cm-question-pane" aria-label="Listening audio and original questions" tabindex="0"><div class="cm-pane-label"><strong>Listening · Section '+part+'</strong><span>Audio and original questions</span></div>'+
      '<div class="listening-player-card"><div class="listening-player-heading"><div><p class="section-label">'+esc(route.exam.title)+' · Listening</p><h3>Section '+part+'</h3></div><span class="listening-duration">Questions '+range('listening',part).join('–')+'</span></div>'+
      (audio?'<audio id="listening-audio" controls preload="none" src="'+esc(audio)+'" aria-label="Cambridge '+esc(route.exam.title)+' Section '+part+' audio">Audio not supported.</audio><div class="listening-tools"><label for="listening-speed">Playback speed <select id="listening-speed" data-cam-speed><option value="0.75">0.75×</option><option value="1" selected>1× · Normal</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label><a class="text-button" href="'+esc(audio)+'" target="_blank" rel="noopener">Open audio file ↗</a></div>':'<p class="notice" role="status">Section '+part+' audio has been provided by the teacher but is not hosted online yet. Audio playback is not available on WordHop for this test.</p>')+'</div>'+
      '<div class="reading-part-heading listening-book-heading"><div><h3>Book questions</h3><p>Questions '+range('listening',part).join('–')+' · Book '+(p[0]===p[1]?'page':'pages')+' '+p.join('–')+'</p></div>'+mediaControls(route,'listening',part)+'</div>'+
      pageViewer(route,'listening',part)+
      '<p class="reading-source-note">Original listening questions and answers: '+esc(route.volume.sourceTitle||route.volume.title)+'. Cambridge University Press.</p></section>'+
      '<section class="cm-split-pane cm-response-pane" aria-label="Listening answer sheet" tabindex="0"><div class="cm-pane-label"><strong>Answer sheet</strong><span>Questions '+range('listening',part).join('–')+'</span></div>'+
      answerSheet(test,'listening',part)+
      '<div class="listening-navigation">'+(part>1?nav(link(base,'listening',part-1),'← Previous section','btn',false):'<span></span>')+(part<4?nav(link(base,'listening',part+1),'Next section →','btn',false):'<span></span>')+'</div></section></div></section>';
  }
  function writing(route,base){
    const test=testCode(route),part=Math.min(Math.max(route.part,1),2);
    const item=attempt(test,'writing',part),draft=String(item.answers[part]||'');
    const student=window.WordHopStudent?.current();
    const q=essayTopics[test]?.[part]||'Refer to the original task in the book.';
    const title='Task '+part+' · '+(part===1?'Academic Task 1':'Essay');
    const p=pageRange(route,'writing',part);
    return '<section class="writing-view reading-view cm-cambridge-exam" aria-label="Book writing test"><div class="reading-intro"><div><h2>Writing</h2><p>Keep the original Writing task visible on the left while drafting your answer on the right.</p></div></div>'+
      partNav(base,test,'writing',part)+
      '<div class="cm-exam-split" role="group" aria-label="Writing prompt and editor">'+
      '<section class="cm-split-pane cm-question-pane" aria-label="Original Writing task" tabindex="0"><div class="cm-pane-label"><strong>Writing · Task '+part+'</strong><span>Original task and visual</span></div>'+
      '<div class="reading-part-heading"><div><h3>'+esc(title)+'</h3><p>Write at least '+(part===1?'150':'250')+' words · Book page '+p[0]+'</p></div><div class="reading-page-actions"><button class="btn" data-cam-action="focus-writing" type="button">Start writing →</button></div></div>'+
      pageViewer(route,'writing',part)+
      '<div class="cm-writing-instructions"><strong>Task prompt</strong><p>'+esc(q)+'</p>'+(part===1?'<p class="reading-key-note">Check the original chart, map or diagram before writing. This text does not replace the visual.</p>':'')+'</div>'+
      '<p class="reading-source-note">Original Writing tasks: '+esc(route.volume.sourceTitle||route.volume.title)+'. Cambridge University Press.</p></section>'+
      '<section class="cm-split-pane cm-response-pane" aria-label="Your Writing response" tabindex="0"><div class="cm-pane-label"><strong>Your answer</strong><span>Saved automatically on this device</span></div>'+
      '<section class="writing-editor" aria-label="Writing draft"><div class="writing-editor-heading"><label for="cambridge-writing-draft">Your answer · Writing Task '+part+'</label><span id="writing-word-count">'+wordCount(draft)+' words · Minimum '+(part===1?'150':'250')+'</span></div>'+
      '<textarea id="cambridge-writing-draft" data-cam-draft rows="12" maxlength="25000" spellcheck="true" placeholder="Write your '+(part===1?'Task 1 response':'Task 2 essay')+' here...">'+esc(draft)+'</textarea>'+
      '<div class="writing-editor-footer"><p id="writing-save-state" role="status" aria-live="polite">Draft saves automatically on this device.</p><button class="text-button" type="button" data-cam-action="prompt">Show original task ←</button></div>'+
      '<div class="writing-submit"><h3>Send to your teacher</h3><p>'+(student?'Submitting as <strong>'+esc(student.name)+'</strong>.':'Sign in with your WordHop student account to submit your writing.')+'</p><div class="writing-submit-footer">'+(student?'<button class="btn btn-primary" type="button" data-cam-action="submit-writing"'+(item.submission?.answer===draft.trim()&&item.submission?.submittedAt?' disabled':'')+'>'+(item.submission?.answer===draft.trim()&&item.submission?.submittedAt?'Submitted':'Submit writing')+'</button>':'<a href="#/student" class="btn btn-primary" data-nav="#/student">Student sign in</a>')+'<p id="writing-submit-status" role="status">'+(item.submission?.answer===draft.trim()&&item.submission?.submittedAt?'Your teacher has received this answer.':'')+'</p></div></div></section></section></div></section>';
  }
  function speaking(route){
    const pages=route.exam.pages?.speaking;
    return '<section class="reading-view"><div class="reading-intro"><div><h2>Speaking</h2><p>Practise with a partner or examiner using the original questions from the book.</p></div></div><div class="reading-part-heading"><div><h3>Speaking test</h3><p>Part 1 · Part 2 · Part 3 · Book page '+pages?.[0]+'</p></div></div>'+pageViewer(route,'speaking',1)+'<p class="reading-key-note">The Speaking prompts are in the original PDF. WordHop does not automatically score spoken answers.</p></section>';
  }
  function sizeSplit(container){
    const layout=container.querySelector?.('.cm-exam-split');
    if(!layout)return;
    if(window.matchMedia?.('(max-width:850px)').matches){
      layout.style?.removeProperty('--cm-split-height');
      return;
    }
    const top=layout.getBoundingClientRect?.().top;
    if(!Number.isFinite(top))return;
    const height=Math.max(400,Math.min(1000,window.innerHeight-Math.max(top,64)-18));
    layout.style?.setProperty('--cm-split-height',height+'px');
  }
  function restoreBookAfterUpdate(a,scoreFocus){
    const oldLeft=a.container.querySelector?.('.cm-question-pane');
    const scrollY=oldLeft?.scrollTop||0;
    const scrollX=oldLeft?.querySelector?.('.reading-page')?.scrollLeft||0;
    const leftZoomed=Boolean(oldLeft?.querySelector?.('.reading-page.is-zoomed'));
    render({container:a.container,route:a.route,header:a.container.querySelector?.('.breadcrumbs')?.outerHTML||'',base:a.base});
    const newLeft=a.container.querySelector?.('.cm-question-pane');
    if(newLeft)newLeft.scrollTop=scrollY;
    const page=newLeft?.querySelector?.('.reading-page');
    if(page){
      page.scrollLeft=scrollX;
      if(leftZoomed)page.classList.add('is-zoomed');
    }
    if(scoreFocus){
      const score=a.container.querySelector?.('.reading-score');
      score?.focus?.({preventScroll:true});
      const right=a.container.querySelector?.('.cm-response-pane');
      if(right)right.scrollTop=0;
    }
  }
  function render({container,route,header:crumbs,base}){
    const skill=skills.includes(route.skill)?route.skill:'listening',part=Number.isInteger(route.part)?route.part:1;
    active={container,route,base,skill,part,test:testCode(route)};
    const page={...route,part};
    const body=skill==='listening'?listening(page,base):skill==='reading'?reading(page,base):skill==='writing'?writing(page,base):speaking(page);
    container.innerHTML=header(route,crumbs,base,skill)+body;
    if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(()=>sizeSplit(container));
  }
  function stop(){const audio=document.querySelector('#listening-audio');if(audio)audio.pause();}
  function context(){const a=active;if(!a)return null;const hash=location.hash||'';return hash.startsWith(a.base)&&hash.includes('/'+a.skill+'/')?a:null;}
  function updateField(event){
    const a=context();if(!a)return;
    const input=event.target;
    if(input.matches('[data-cam-answer]')){
      const n=Number(input.dataset.camAnswer),item=attempt(a.test,a.skill,a.part);
      if(item.checked)return;
      item.answers[n]=input.value;
      persist(a.test,a.skill,a.part,item);
    }else if(input.matches('[data-cam-draft]')){
      const item=attempt(a.test,'writing',a.part);
      item.answers[a.part]=input.value;
      const wc=document.querySelector('#writing-word-count');
      if(wc)wc.textContent=wordCount(input.value)+' words · Minimum '+(a.part===1?'150':'250');
      const msg=document.querySelector('#writing-save-state');
      if(msg)msg.textContent=persist(a.test,'writing',a.part,item)?'Draft saved on this device.':'Could not save this draft. Copy it before leaving.';
    }else if(input.matches('[data-cam-speed]')){
      const audio=document.querySelector('#listening-audio');if(audio)audio.playbackRate=Number(input.value);
    }
  }
  function toast(message){const status=document.querySelector('#writing-submit-status');if(status)status.textContent=message;}
  async function sendWriting(a){
    const student=window.WordHopStudent?.current();
    if(!student)return;
    const item=attempt(a.test,'writing',a.part),answer=String(item.answers[a.part]||'').trim();
    if(!answer){toast('Write an answer before submitting.');return;}
    const key=a.test+'-'+a.part;
    if(submitted.has(key)||item.submission?.answer===answer&&item.submission?.submittedAt)return;
    const id=(window.crypto?.randomUUID?.()||Array.from(window.crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')).replace(/-/g,'');
    const record={id,answer};
    item.submission=record;persist(a.test,'writing',a.part,item);
    submitted.add(key);
    const button=document.querySelector('[data-cam-action="submit-writing"]');if(button){button.disabled=true;button.textContent='Submitting…';}
    toast('Sending your answer…');
    try{
      const response=await window.WordHopStudent.request('writing-submissions',{id,studentId:student.id,unitId:a.route.volume.id+'-'+a.route.exam.id,partId:'part-'+a.part,questionId:'task-'+a.part,answer});
      const result=await response.json();
      if(!response.ok||!result.ok||result.id!==id||!result.submittedAt)throw new Error(result.error||'Submission not accepted by the server.');
      const latest=attempt(a.test,'writing',a.part);
      if(latest.submission?.id===id){latest.submission.submittedAt=result.submittedAt;persist(a.test,'writing',a.part,latest);}
      if(context()===a)toast('Your teacher has received your answer.');
    }catch(err){
      const latest=attempt(a.test,'writing',a.part);
      if(latest.submission?.id===id)latest.submission=null,persist(a.test,'writing',a.part,latest);
      if(context()===a)toast(String(err?.message||'Could not submit this answer. Please try again.'));
    }finally{
      submitted.delete(key);if(context()===a){const btn=document.querySelector('[data-cam-action="submit-writing"]');if(btn){btn.disabled=false;btn.textContent='Submit writing';}}
    }
  }
  document.addEventListener('input',updateField);
  document.addEventListener('change',updateField);
  document.addEventListener('submit',event=>{
    const form=event.target.closest('[data-cam-form]');
    if(!form)return;
    const a=context();if(!a)return;
    event.preventDefault();
    const item=attempt(a.test,a.skill,a.part);
    for(const field of form.querySelectorAll('[data-cam-answer]'))item.answers[field.dataset.camAnswer]=field.value;
    item.checked=true;
    persist(a.test,a.skill,a.part,item);
    restoreBookAfterUpdate(a,true);
  });
  // Retry missing images once without relying on a stale cached 404.
  // If an image still fails, show its direct link instead of a broken image icon.
  document.addEventListener('error',event=>{
    const img=event.target;
    if(!img?.matches?.('[data-cam-page]'))return;
    if(!img.dataset.camRetry){
      img.dataset.camRetry='1';
      img.src=img.src+(img.src.includes('?')?'&':'?')+'retry=1';
      return;
    }
    const holder=document.createElement('div');
    holder.className='cm-image-fallback';
    const text=document.createElement('p');
    text.textContent='Could not display book page '+img.dataset.camPage+'.';
    const link=document.createElement('a');
    link.href=img.src;
    link.target='_blank';link.rel='noopener';
    link.textContent='Open original page in a new tab';
    holder.append(text,link);
    img.replaceWith(holder);
  },true);
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-cam-action]');if(!button)return;
    const a=context();if(!a)return;
    const act=button.dataset.camAction;
    if(act==='zoom'){
      const page=a.container.querySelector?.('.cm-question-pane .reading-page');
      if(page){const zoomed=page.classList.toggle('is-zoomed');button.setAttribute('aria-pressed',String(zoomed));button.textContent=zoomed?'Fit page':'Zoom page';}
    }else if(act==='retry'){
      const item=attempt(a.test,a.skill,a.part);item.checked=false;persist(a.test,a.skill,a.part,item);
      restoreBookAfterUpdate(a,false);
    }else if(act==='back-to-page'||act==='prompt'){
      const pane=a.container.querySelector?.('.cm-question-pane');
      if(pane&&window.matchMedia?.('(min-width:851px)').matches){
        pane.scrollTo?.({top:0,behavior:'smooth'});
        pane.focus?.({preventScroll:true});
      }else pane?.querySelector?.('.reading-page')?.scrollIntoView?.({behavior:'smooth',block:'start'});
    }
    else if(act==='focus-writing'){
      const draft=a.container.querySelector?.('#cambridge-writing-draft');
      if(window.matchMedia?.('(min-width:851px)').matches)draft?.closest?.('.cm-response-pane')?.scrollTo?.({top:0,behavior:'smooth'});
      else draft?.scrollIntoView?.({behavior:'smooth',block:'center'});
      draft?.focus?.({preventScroll:true});
    }
    else if(act==='clear'){
      if(!confirm('Clear all saved Cambridge IELTS answers and drafts for '+a.route.exam.title+' on this device?'))return;
      for(const skill of ['reading','listening','writing'])for(let i=1;i<=(skill==='listening'?4:skill==='reading'?3:2);i++)try{localStorage.removeItem(toKey(a.test,skill,i));}catch{}
      restoreBookAfterUpdate(a,false);
    }
    else if(act==='submit-writing'){void sendWriting(a);}
  });
  window.addEventListener?.('resize',()=>{if(active?.container)sizeSplit(active.container);});
  window.WordHopCambridge={render,stop,score,variants};
})();
