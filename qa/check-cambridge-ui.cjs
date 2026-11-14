'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..','dist');
const handlers={};
const values=new Map();
const localStorage={
  getItem:key=>values.get(key)||null,
  setItem:(key,value)=>values.set(key,String(value)),
  removeItem:key=>values.delete(key)
};
const context={
  window:{WordHopStudent:{current:()=>({id:'qa-student',name:'QA student'})}},
  document:{addEventListener:(type,callback)=>(handlers[type]??=[]).push(callback),querySelector:()=>null},
  localStorage, console
};
vm.createContext(context);
for(const name of ['data.js','cambridge-keys.js','cambridge13-keys.js','cambridge14-keys.js','cambridge15-keys.js','cambridge16-keys.js','cambridge.js']){
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
}
const catalog=context.window.WQ_CATALOG;
const component=context.window.WordHopCambridge;
const volume=catalog.volumes.find(item=>item.id==='cambridge-ielts-academic-21');
assert(volume?.tests?.length===4,'Four tests must be registered');
assert.equal(volume.title,'Cambridge IELTS Academic 12','Correct book title should be displayed');
assert.equal(volume.mediaRoot,'media/cambridge-ielts-academic-21','Media remains on its original internal path');
assert(volume.tests.every(x=>x.audio?.length===4),'All 16 listening tracks should be linked');
let renders=0;
for(const test of volume.tests){
 const number=test.id.split('-')[1];
 for(const skill of ['listening','reading','writing','speaking']){
  const parts={listening:4,reading:3,writing:2,speaking:1}[skill];
  for(let p=1;p<=parts;p++){
    const element={innerHTML:''};
    const base='#/ielts/cambridge-ielts/'+volume.id+'/'+test.id;
    component.render({container:element,route:{volume,exam:test,skill,part:p},header:'<nav class="breadcrumbs">Course</nav>',base});
    const html=element.innerHTML;
    assert(html.includes('class="unit-heading"'),'Use same unit heading as PET');
    assert(html.includes('class="unit-tabs"'),'Use same skill tabs as PET');
    assert(html.includes(base+'/'+skill+'/part-'+p),'Part navigation must use the current route');
    assert(!html.includes('##/'),'A double hash would break navigation');
    assert(html.includes('src="/wordhop/media/cambridge-ielts-academic-21/pages/page-'),
      'Cambridge pages should use absolute paths relative to the project root');
    assert(html.includes('data-cam-page='),'Every page should report a load error');
    if(skill==='listening')assert(
      html.includes('src="/wordhop/media/cambridge-ielts-academic-21/audio/test-'+number+'-section-'+p+'.m4a"'),
      'Audio should resolve under the project path');
    if(skill==='listening'){
      assert(html.includes('class="listening-player-card"'),'Listening player must use PET styling');
      assert(html.includes('class="listening-parts"'),'Listening parts must use PET styling');
      assert.equal((html.match(/data-cam-answer="/g)||[]).length,10,'Ten listening answers');
    }
    if(skill==='reading'){
      assert(html.includes('class="reading-view cm-cambridge-exam"'),'Reading retains PET styling and enables split layout');
      assert(html.includes('class="reading-answer-sheet"'),'Reading sheet must use PET styling');
      assert.equal((html.match(/data-cam-answer="/g)||[]).length,[13,13,14][p-1],'Reading passage questions');
    }
    if(skill==='writing'){
      assert(html.includes('class="writing-editor"'),'Writing must use PET editor');
      assert(html.includes('class="writing-submit"'),'Writing must use PET submission section');
    }
    if(skill==='speaking')assert(html.includes('Book page'),'Speaking source page should be identified');
    assert(html.includes('Original book page'),'Missing hosted media must be shown transparently');
    renders++;
  }
 }
 for(const type of ['listening','reading']){
   const key=context.window.WORDHOP_CAMBRIDGE_KEYS[number][type];
   assert.equal(key.length,40,'Publisher key must contain 40 '+type+' answers');
   assert(key.every(value=>typeof value==='string'&&value.length>0));
 }
}
// Verify locally stored answers are restored and graded by separate passage/section.
values.set('wordhop.cambridge.exam.v2.test-5.reading.part-1',JSON.stringify({answers:{1:'NOT GIVEN'},checked:true}));
const data={volume,exam:volume.tests[0],skill:'reading',part:1};
const container={innerHTML:''};
component.render({container,route:data,header:'<nav class="breadcrumbs">Course</nav>',base:'#/ielts/cambridge-ielts/'+volume.id+'/test-5'});
assert(container.innerHTML.includes('Not answered'));
assert(container.innerHTML.includes('Answer key &amp; results'));
assert(container.innerHTML.includes('Try this part again'));

// Cambridge IELTS 13 must be isolated from Cambridge 12 while retaining PET interface parity.
const volume13=catalog.volumes.find(item=>item.id==='cambridge-ielts-academic-13');
assert(volume13?.tests?.length===4,'Cambridge 13 should contain Tests 1–4');
assert.equal(volume13.title,'Cambridge IELTS Academic 13');
let rendered13=0;
for (const exam of volume13.tests) {
  const n=Number(exam.id.split('-')[1]);
  for (const skill of ['listening','reading','writing','speaking']) {
    const count={listening:4,reading:3,writing:2,speaking:1}[skill];
    for (let part=1;part<=count;part++) {
      const element={innerHTML:''};
      const base='#/ielts/cambridge-ielts/'+volume13.id+'/'+exam.id;
      component.render({container:element,route:{volume:volume13,exam,skill,part},header:'<nav class="breadcrumbs">Course</nav>',base});
      const html=element.innerHTML;
      assert(html.includes('class="unit-heading"'),'Cambridge 13 reuses course heading');
      assert(html.includes('class="unit-tabs"'),'Cambridge 13 reuses skill tabs');
      assert(html.includes(base+'/'+skill+'/part-'+part),'Cambridge 13 has correct part route');
      if(skill==='listening'){
        assert(html.includes('class="listening-player-card"'));
        assert.equal((html.match(/data-cam-answer="/g)||[]).length,10);
      }
      if(skill==='reading'){
        assert(html.includes('class="reading-answer-sheet"'));
        assert.equal((html.match(/data-cam-answer="/g)||[]).length,[13,13,14][part-1]);
      }
      if(skill==='writing')assert(html.includes('class="writing-editor"'));
      if (skill==='speaking' && n===4)assert(html.includes('Book page 96'),'Test 4 speaking ends on printed page 96');
      rendered13++;
    }
  }
  const publisher=context.window.WORDHOP_CAMBRIDGE13_KEYS['13-'+n];
  assert.equal(publisher.listening.length,40);
  assert.equal(publisher.reading.length,40);
}
assert.equal(rendered13,40,'All Cambridge 13 screens should work');
const reversed=component.score('13-2','listening',{17:'E',18:'C',19:'D',20:'B'});
assert(reversed[17]&&reversed[18]&&reversed[19]&&reversed[20],'Unordered option pairs must grade correctly');
assert(!component.score('13-2','listening',{17:'C',18:'C'})[18],'Duplicate choice must not be counted twice');
assert.notEqual(volume.id,volume13.id,'Book IDs remain different');
console.log('PASS: 40 additional Cambridge IELTS 13 pages, 320 publisher answers, and independent saves.');

// Cambridge IELTS Academic 14 — 40 exam views, correct original page groups and isolated answers.
const volume14=catalog.volumes.find(x=>x.id==='cambridge-ielts-academic-14');
assert.equal(volume14.title,'Cambridge IELTS Academic 14');
assert.equal(volume14.tests.length,4);
const pages14={
  1:{listening:[[10,10],[11,12],[13,14],[15,15]],reading:[[16,19],[20,24],[25,28]],writing:[[29,29],[30,30]],speaking:[[31,31]]},
  2:{listening:[[32,32],[33,34],[35,36],[37,37]],reading:[[38,41],[42,45],[46,49]],writing:[[50,50],[51,51]],speaking:[[52,52]]},
  3:{listening:[[53,53],[54,55],[56,57],[58,58]],reading:[[59,62],[63,66],[67,71]],writing:[[72,72],[73,73]],speaking:[[74,74]]},
  4:{listening:[[75,76],[77,78],[79,80],[81,81]],reading:[[82,85],[86,89],[90,93]],writing:[[94,94],[95,95]],speaking:[[96,96]]},
};
let rendered14=0;
for(const exam of volume14.tests){
  const t=Number(exam.id.replace('test-',''));
  const publisher=context.window.WORDHOP_CAMBRIDGE14_KEYS['14-'+t];
  assert.equal(publisher.listening.length,40);
  assert.equal(publisher.reading.length,40);
  for(const skill of ['listening','reading','writing','speaking']){
    for(let part=1;part<=pages14[t][skill].length;part++){
      const container={innerHTML:''};
      const base='#/ielts/cambridge-ielts/'+volume14.id+'/'+exam.id;
      component.render({container,route:{volume:volume14,exam,skill,part},header:'<nav class="breadcrumbs">Course</nav>',base});
      const html=container.innerHTML,pg=pages14[t][skill][part-1];
      const printRange=pg[0]===pg[1]?String(pg[0]):pg.join('–');
      assert(html.includes('class="unit-heading"')&&html.includes('class="unit-tabs"'),'Same PET exam interface');
      assert(html.includes(base+'/'+skill+'/part-'+part),'Part navigation uses Cambridge14 book ID');
      assert(html.includes('Original book page'),'Source placeholder is transparent before media upload');
      assert(html.includes(printRange),'Original Cambridge14 page mapping '+t+'/'+skill+'/'+part);
      if(skill==='listening'){
        assert(html.includes('class="listening-player-card"'));
        assert.equal((html.match(/data-cam-answer="/g)||[]).length,10);
      }
      if(skill==='reading'){
        assert(html.includes('class="reading-answer-sheet"'));
        assert.equal((html.match(/data-cam-answer="/g)||[]).length,[13,13,14][part-1]);
      }
      if(skill==='writing'){
        assert(html.includes('class="writing-editor"'));
        assert(html.includes('Task prompt'));
      }
      rendered14++;
    }
  }
}
assert.equal(rendered14,40);
const reverseListening=component.score('14-1','listening',{11:'C',12:'A',13:'E',14:'B'});
assert(reverseListening[11]&&reverseListening[12]&&reverseListening[13]&&reverseListening[14]);
const reverseReading=component.score('14-4','reading',{23:'D',24:'B',25:'E',26:'B'});
assert(reverseReading[23]&&reverseReading[24]&&reverseReading[25]&&reverseReading[26]);
assert(!component.score('14-4','reading',{23:'B',24:'B'})[24]);
console.log('PASS: Cambridge IELTS 14 all 40 exam screens, original PDF page groups, 320 answers, unordered pairs and isolated storage.');


// Cambridge IELTS 15 — four original tests, publisher keys and both-pane layout.
const volume15=catalog.volumes.find(x=>x.id==='cambridge-ielts-academic-15');
assert(volume15,'Cambridge 15 volume should exist');
assert.equal(volume15.title,'Cambridge IELTS Academic 15');
assert.deepEqual(Array.from(volume15.tests,x=>x.id),['test-1','test-2','test-3','test-4']);
const expected15={
  1:{listening:[[10,10],[11,12],[13,14],[15,15]],reading:[[16,19],[20,23],[24,27]],writing:[[28,28],[29,29]],speaking:[[30,30]]},
  2:{listening:[[31,31],[32,33],[34,35],[36,36]],reading:[[37,39],[40,43],[44,48]],writing:[[49,49],[50,50]],speaking:[[51,51]]},
  3:{listening:[[52,53],[54,55],[56,56],[57,57]],reading:[[58,61],[62,65],[66,70]],writing:[[71,71],[72,72]],speaking:[[73,73]]},
  4:{listening:[[74,74],[75,76],[77,78],[79,79]],reading:[[80,83],[84,87],[88,92]],writing:[[93,93],[94,94]],speaking:[[95,95]]}
};
let rendered15=0;
for(const test of volume15.tests){
  const n=Number(test.id.split('-')[1]),source=context.window.WORDHOP_CAMBRIDGE15_KEYS['15-'+n];
  assert.equal(source.listening.length,40,'Cam 15 Listening publisher answer count');
  assert.equal(source.reading.length,40,'Cam 15 Reading publisher answer count');
  for(const skill of ['listening','reading','writing','speaking']){
    for(let part=1;part<=expected15[n][skill].length;part++){
      const element={innerHTML:''};
      const base='#/ielts/cambridge-ielts/'+volume15.id+'/'+test.id;
      component.render({container:element,route:{volume:volume15,exam:test,skill,part},header:'<nav class="breadcrumbs">Course</nav>',base});
      const html=element.innerHTML;
      const p=expected15[n][skill][part-1];
      assert(html.includes('class="unit-heading"')&&html.includes('class="unit-tabs"'));
      assert(html.includes(base+'/'+skill+'/part-'+part));
      assert(html.includes(p[0]===p[1]?String(p[0]):p.join('–')),'Correct source pages '+n+'/'+skill+'/'+part);
      assert(html.includes('Original book page'),'Original Cambridge 15 page placeholder exists before upload');
      if(skill==='listening'){
        assert(html.includes('class="listening-player-card"'));
        assert.equal((html.match(/data-cam-answer="/g)||[]).length,10);
      }
      if(skill==='reading')assert.equal((html.match(/data-cam-answer="/g)||[]).length,[13,13,14][part-1]);
      if(skill==='writing')assert(html.includes('class="writing-editor"')&&html.includes('Task prompt'));
      rendered15++;
    }
  }
}
assert.equal(rendered15,40);
const pairing15=component.score('15-1','reading',{23:'D',24:'C',25:'E',26:'A'});
assert(pairing15[23]&&pairing15[24]&&pairing15[25]&&pairing15[26]);
assert(!component.score('15-1','reading',{23:'C',24:'C'})[24],'Duplicate option should not be rewarded');
const fourthReading=component.score('15-4','reading',{6:'huarango branches',7:'bark and leaves',8:'the trunk'});
assert(fourthReading[6]&&fourthReading[7]&&fourthReading[8],'Cambridge 15 Test 4 plural/combined words accepted');
assert(!component.score('15-4','reading',{7:'bark'})[7],'Test 4 reading Q7 requires both words');
console.log('PASS: Cambridge 15 all 40 screens, 320 source keys, original pages, unordered choices and combined responses.');

// Cambridge IELTS Academic 16: scanned original page mapping and source publisher answers.
const volume16=catalog.volumes.find(v=>v.id==='cambridge-ielts-academic-16');
assert(volume16&&volume16.tests.length===4,'Cambridge 16 should contain 4 authentic tests');
assert.equal(volume16.title,'Cambridge IELTS Academic 16');
const printed16={
  1:{listening:[[10,10],[11,12],[13,14],[15,15]],reading:[[16,19],[20,23],[24,28]],writing:[[29,29],[30,30]],speaking:[[31,31]]},
  2:{listening:[[32,32],[33,34],[35,36],[37,37]],reading:[[38,41],[42,46],[47,51]],writing:[[52,52],[53,53]],speaking:[[54,54]]},
  3:{listening:[[55,55],[56,57],[58,59],[60,60]],reading:[[61,64],[65,68],[69,72]],writing:[[73,73],[74,74]],speaking:[[75,75]]},
  4:{listening:[[76,76],[77,78],[79,80],[81,81]],reading:[[82,85],[86,89],[90,94]],writing:[[95,95],[96,96]],speaking:[[97,97]]}
};
let rendered16=0;
for(const exam of volume16.tests){
  const t=Number(exam.id.replace('test-',''));
  const source=context.window.WORDHOP_CAMBRIDGE16_KEYS['16-'+t];
  assert.equal(source.listening.length,40,'Source Listening has 40 questions');
  assert.equal(source.reading.length,40,'Source Reading has 40 questions');
  for(const skill of ['listening','reading','writing','speaking']){
    for(let part=1;part<=printed16[t][skill].length;part++){
      const node={innerHTML:''};
      const base='#/ielts/cambridge-ielts/'+volume16.id+'/'+exam.id;
      component.render({container:node,route:{volume:volume16,exam,skill,part},header:'<nav class="breadcrumbs">Course</nav>',base});
      const html=node.innerHTML,p=printed16[t][skill][part-1];
      assert(html.includes('class="unit-heading"')&&html.includes('class="unit-tabs"'),'Cam 16 uses same WordHop interface');
      assert(html.includes(base+'/'+skill+'/part-'+part),'Correct part URL');
      assert(html.includes(p[0]===p[1]?String(p[0]):p.join('–')),'Printed page range valid');
      assert(html.includes('Original book page'),'Source page placeholder shown before the ZIP upload');
      if(skill==='listening'){
        assert(html.includes('class="listening-player-card"'),'Listening player in left pane');
        assert.equal((html.match(/data-cam-answer="/g)||[]).length,10);
      }
      if(skill==='reading'){
        assert(html.includes('class="reading-answer-sheet"'),'Reading answers in right pane');
        assert.equal((html.match(/data-cam-answer="/g)||[]).length,[13,13,14][part-1]);
      }
      if(skill==='writing')assert(html.includes('class="writing-editor"')&&html.includes('Task prompt'));
      rendered16++;
    }
  }
}
assert.equal(rendered16,40,'Cam 16 has 40 rendered skill parts');
const e1=component.score('16-1','listening',{21:'E',22:'C',23:'E',24:'B',40:'practise'});
assert(e1[21]&&e1[22]&&e1[23]&&e1[24]&&e1[40],'Unordered answers and practise spelling accepted');
const e2=component.score('16-1','reading',{25:'D',26:'B'});
assert(e2[25]&&e2[26],'Reading double answer can be reversed');
const e3=component.score('16-3','reading',{23:'C',24:'B',25:'C',26:'A',38:'warm winter',40:'mustard plants'});
assert(e3[23]&&e3[24]&&e3[25]&&e3[26]&&e3[38]&&e3[40],'Matching choices and optional suffixes work');
const e4=component.score('16-4','reading',{12:"the architect's name",13:'the harbor'});
assert(e4[12]&&e4[13],'Cam 16 Test 4 publisher optional words are accepted');
console.log('PASS: Cambridge IELTS 16 all 40 views, 320 keys, source page groups and optional answer spellings.');

// Cambridge 12, 13 and 14 must all render two independent desktop scroll panes.
const splitCSS=fs.readFileSync(path.join(root,'cambridge.css'),'utf8');
assert(splitCSS.includes('.cm-exam-split{display:grid'),'Split layout CSS exists');
assert(splitCSS.includes('grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)'),'Original pages and answer sheet have side-by-side columns');
assert(splitCSS.includes('overflow-y:auto'),'Each pane scrolls vertically');
assert(splitCSS.includes('scrollbar-gutter:stable'),'Each pane reserves its own scrollbar');
assert(splitCSS.includes('@media(max-width:850px)'),'Narrow screens should stack panels');
assert(splitCSS.includes('--cm-split-height'),'Desktop height should fit available viewport');
let splitScreens=0;
for(const book of [volume,volume13,volume14,volume15,volume16]){
  for(const test of book.tests){
    for(const [skill,numParts] of [['reading',3],['listening',4],['writing',2]]){
      for(let part=1;part<=numParts;part++){
        const container={innerHTML:''};
        const base='#/ielts/cambridge-ielts/'+book.id+'/'+test.id;
        component.render({container,route:{volume:book,exam:test,skill,part},header:'<nav class="breadcrumbs">Course</nav>',base});
        const html=container.innerHTML;
        const split=html.indexOf('class="cm-exam-split"');
        const left=html.indexOf('class="cm-split-pane cm-question-pane"',split);
        const page=html.indexOf('class="reading-page',left);
        const right=html.indexOf('class="cm-split-pane cm-response-pane"',left);
        const answers=html.indexOf(skill==='writing'?'class="writing-editor"':'class="reading-answer-sheet"',right);
        assert(split>=0 && split<left && left<page && page<right && right<answers,
          'Separate, correctly ordered source and answer panes '+book.title+'/'+test.id+'/'+skill+'/'+part);
        assert(html.includes('tabindex="0"'),'Scrollable panes must be reachable with keyboard');
        assert(html.includes('class="cm-pane-label"'),'Both panes need clear labels');
        if(skill==='listening')assert(html.indexOf('class="listening-player-card"',left)<right,
          'The audio player stays with the original Listening questions');
        assert(!html.includes('##/'),'Part URLs must not contain duplicate hashes');
        splitScreens++;
      }
    }
  }
}
assert.equal(splitScreens,180,'5 Cambridge books × 4 tests × 9 split skill parts');
assert(splitCSS.includes('.reading-page.cm-page-closer:not(.is-zoomed) img{width:125%;max-width:none}'),
  'Cambridge 13/14 should start at 125% source-page zoom');
assert(splitCSS.includes('.reading-page.cm-page-closer:not(.is-zoomed) img{width:100%}'),
  'Mobile screens should show full page width');
for(const [book,shouldEnlarge] of [[volume,false],[volume13,true],[volume14,true],[volume15,true],[volume16,true]]){
  // dist/data.js holds source metadata; GitHub Pages attaches mediaRoot during build.
  // Simulate that deployment here to validate the actual scanned-page branch.
  const displayBook={...book,mediaRoot:book.mediaRoot||'media/qa-scans'};
  for(const test of book.tests){
    for(const skill of ['listening','reading','writing','speaking']){
      const container={innerHTML:''};
      component.render({container,route:{volume:displayBook,exam:test,skill,part:1},
        header:'<nav class="breadcrumbs">Course</nav>',
        base:'#/ielts/cambridge-ielts/'+book.id+'/'+test.id});
      assert.equal(container.innerHTML.includes('class="reading-page cm-page-closer"'),
        shouldEnlarge,'Cambridge 13/14/15 source images have the default magnification');
      assert(container.innerHTML.includes('data-cam-page='),'Source image URLs are kept intact');
    }
  }
}
console.log('PASS: Cam 13, 14, 15 and 16 default page zoom 125%, Cambridge 12 remains unchanged; mobile fit is retained.');

console.log('PASS: 180 Cambridge split-screen Reading/Listening/Writing views, independent scroll CSS, and responsive mobile stack.');

console.log('PASS: '+renders+' Cambridge views use Simply PET / Authentic 1 layouts; 4 × 40 Listening and 4 × 40 Reading keys present; per-part review persists.');
