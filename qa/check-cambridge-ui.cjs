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
for(const name of ['data.js','cambridge-keys.js','cambridge.js']){
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
}
const catalog=context.window.WQ_CATALOG;
const component=context.window.WordHopCambridge;
const volume=catalog.volumes.find(item=>item.id==='cambridge-ielts-academic-21');
assert(volume?.tests?.length===4,'Four tests must be registered');
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
    if(skill==='listening'){
      assert(html.includes('class="listening-player-card"'),'Listening player must use PET styling');
      assert(html.includes('class="listening-parts"'),'Listening parts must use PET styling');
      assert.equal((html.match(/data-cam-answer="/g)||[]).length,10,'Ten listening answers');
    }
    if(skill==='reading'){
      assert(html.includes('class="reading-view"'),'Reading must use PET styling');
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
console.log('PASS: '+renders+' Cambridge views use Simply PET / Authentic 1 layouts; 4 × 40 Listening and 4 × 40 Reading keys present; per-part review persists.');
