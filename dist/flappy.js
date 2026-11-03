/* WordHop Flappy Vocab v2 — self-contained original pixel-art canvas game. */
'use strict';
(() => {
 const W=900,H=480,GROUND=442,BIRD_HALF_W=38,BIRD_HALF_H=27,PIPE_W=88,PIPE_CAP=8,PIPE_SPEED=160,APPROACH_MARGIN=20;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const shuffle=xs=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const q4=n=>Math.round(n/4)*4;
 // Bird hitbox follows the pixel sprite; the cap extends beyond the pipe body.
 // Use the same opening geometry for collisions and question triggers.
 const insideGap=(bird,pipe)=>{
  const top=pipe.gapY-pipe.gap/2+2,bottom=pipe.gapY+pipe.gap/2;
  return bird.y-BIRD_HALF_H>=top&&bird.y+BIRD_HALF_H<=bottom;
 };
 const overlapsPipe=(bird,pipe)=>
  pipe.x-PIPE_CAP<bird.x+BIRD_HALF_W&&pipe.x+PIPE_W+PIPE_CAP>bird.x-BIRD_HALF_W;

 let active=null;
 class FlappyVocab {
  constructor(container,config){
   this.root=container;this.opts=config;this.words=config.words||[];this.pool=config.pool||this.words;
   this.lives=3;this.correct=0;this.attempted=0;this.score=0;this.passed=0;
   this.bird={x:192,y:218,vy:0};this.pipes=[];this.next=0;this.state='ready';this.last=0;this.raf=0;
   this.tick=0;this.current=null;this.choices=[];this.selectedIndex=-1;
   this.approachRemaining=0;this.wasApproaching=false;this.answerReady=false;this.answerUnlockAt=0;
   this.answerTimer=0;this.lastFlapPointerTime=-1e9;this.flightPointerActive=false;
   this.onKey=this.onKey.bind(this);this.onVisibility=this.onVisibility.bind(this);this.onClick=this.onClick.bind(this);
   this.onPointerRelease=this.onPointerRelease.bind(this);
   this.root.innerHTML=`<section class="fv-shell" aria-label="Flappy Vocab game">
    <div class="fv-hud"><div class="fv-stat"><span class="fv-label">SCORE</span><strong id="fv-score">0</strong></div><div class="fv-stat"><span class="fv-label">PIPES</span><strong id="fv-progress">0/${this.words.length}</strong></div><div class="fv-hearts" id="fv-hearts" aria-label="3 lives remaining">♥ ♥ ♥</div></div>
    <div class="fv-stage"><canvas id="fv-canvas" width="${W}" height="${H}" tabindex="0" role="img" aria-label="Pixel-art bird game. Press Space or Up, click or tap to flap."></canvas><div id="fv-overlay" class="fv-overlay" hidden></div></div>
    <div class="fv-below"><span><b>SPACE</b> / <b>↑</b> / tap to flap</span><button class="fv-small" type="button" data-fv="pause">Pause</button></div>
    <div class="fv-sr" id="fv-announcer" role="status" aria-live="polite"></div></section>`;
   this.canvas=this.root.querySelector('#fv-canvas');this.ctx=this.canvas.getContext('2d',{alpha:false});
   // Dedicated lightweight pixel sprite cut from the user's approved illustration.
   // An image asset keeps the eye, yellow body and striped orange beak crisp.
   this.birdSprite=new Image();
   this.birdSprite.decoding='async';
   this.birdSprite.src='assets/flappy-bird-yellow-v3.png';
   this.ctx.imageSmoothingEnabled=false;this.overlay=this.root.querySelector('#fv-overlay');
   this.root.addEventListener('click',this.onClick);window.addEventListener('keydown',this.onKey);
   document.addEventListener('visibilitychange',this.onVisibility);window.addEventListener('pointerup',this.onPointerRelease);
   window.addEventListener('pointercancel',this.onPointerRelease);
   this.canvas.addEventListener('pointerdown',this.onPointer=e=>{
    if(this.state!=='playing')return;
    e.preventDefault();this.flightPointerActive=true;this.lastFlapPointerTime=performance.now();this.flap();
   });
   this.showReady();this.refreshHUD();this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  destroy(){cancelAnimationFrame(this.raf);clearTimeout(this.answerTimer);this.root.removeEventListener('click',this.onClick);window.removeEventListener('keydown',this.onKey);document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('pointerup',this.onPointerRelease);window.removeEventListener('pointercancel',this.onPointerRelease);this.canvas?.removeEventListener('pointerdown',this.onPointer);this.state='destroyed';}
  onPointerRelease(){this.flightPointerActive=false;}
  show(html){this.root.classList.add('fv-has-overlay');this.overlay.hidden=false;this.overlay.innerHTML=html;this.root.querySelector('[data-fv="pause"]').hidden=true;}
  hide(){this.root.classList.remove('fv-has-overlay');this.overlay.innerHTML='';this.overlay.hidden=true;this.root.querySelector('[data-fv="pause"]').hidden=this.state!=='playing';}
  showReady(){this.show(`<div class="fv-panel fv-ready"><span class="fv-kicker">PIXEL ADVENTURE · WORDHOP</span><img class="fv-title-sprite" src="assets/flappy-bird-yellow-v3.png" alt="" aria-hidden="true"><h2>Flappy Vocab</h2><p>Fly through the gap to unlock a vocabulary question. Hit a pipe, the ground or the ceiling and it is Game Over. Wrong answers cost one heart.</p><div class="fv-rule"><span>♥ ♥ ♥</span> 3 hearts · ${this.words.length} vocabulary gates</div><button class="fv-button" type="button" data-fv="start">Start flying →</button></div>`);}
  start(){if(!this.words.length){this.show('<div class="fv-panel"><h2>No vocabulary yet</h2></div>');return;}this.state='playing';this.hide();this.bird.y=H/2;this.bird.vy=-135;this.spawn();this.canvas.focus({preventScroll:true});}
  spawn(){if(this.next>=this.words.length)return;const word=this.words[this.next++];this.pipes.push({x:W+42,word,gapY:193+Math.random()*80,gap:190,asked:false,unlocked:false,passed:false,hit:false});}
  flap(){this.bird.vy=-245;}
  onKey(e){if(this.state!=='playing')return;if((e.code==='Space'||e.code==='ArrowUp')&&!e.repeat&&!e.altKey&&!e.metaKey&&!e.ctrlKey){if(e.target?.closest?.('button,input,textarea,select'))return;e.preventDefault();this.flap();}}
  onVisibility(){if(document.hidden&&(this.state==='playing'||this.state==='approach'))this.pause();}
  onClick(e){const btn=e.target.closest('[data-fv]');if(!btn||!this.root.contains(btn)||btn.disabled)return;
   const op=btn.dataset.fv;
   if(op==='start')this.start();else if(op==='pause')this.pause();else if(op==='resume')this.resume();
   else if(op==='choose')this.selectAnswer(Number(btn.dataset.index));else if(op==='confirm')this.confirmAnswer();
   else if(op==='continue')this.continueAfterAnswer();
  }
  pause(){if(!['playing','approach'].includes(this.state))return;this.wasApproaching=this.state==='approach';this.state='paused';this.show('<div class="fv-panel"><span class="fv-kicker">GAME PAUSED</span><h2>Take a break</h2><p>Your bird and the pipes are frozen.</p><button class="fv-button" type="button" data-fv="resume">Resume flight →</button></div>');}
  resume(){if(this.state!=='paused')return;this.state=this.wasApproaching?'approach':'playing';this.hide();this.last=0;this.canvas.focus({preventScroll:true});}
  refreshHUD(){const q=s=>this.root.querySelector(s);q('#fv-score').textContent=this.score;q('#fv-progress').textContent=`${this.passed}/${this.words.length}`;q('#fv-hearts').textContent='♥ '.repeat(this.lives)+'♡ '.repeat(3-this.lives);q('#fv-hearts').setAttribute('aria-label',`${this.lives} lives remaining`);}
  frame(time){if(this.state==='destroyed')return;const dt=this.last?Math.min(.035,(time-this.last)/1000):0;this.last=time;
   if(this.state==='playing')this.update(dt);
   else if(this.state==='approach'){this.tick+=dt;this.approachRemaining-=dt;if(this.approachRemaining<=0)this.ask(this.current);}
   this.render();if(this.state!=='destroyed')this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  update(dt){this.tick+=dt;
   this.bird.vy+=800*dt;this.bird.y+=this.bird.vy*dt;
   if(this.bird.y-BIRD_HALF_H<=0){this.crash('You hit the ceiling!');return;}
   if(this.bird.y+BIRD_HALF_H>=GROUND){this.crash('You hit the ground!');return;}
   for(const pipe of this.pipes)pipe.x-=PIPE_SPEED*dt;
   // Physical impacts always take priority over vocabulary questions.
   for(const pipe of this.pipes){
    if(overlapsPipe(this.bird,pipe)&&!insideGap(this.bird,pipe)){
     this.crash('You hit a pipe!');return;
    }
   }
   for(const pipe of this.pipes){
    // Only a bird entirely inside the opening can unlock the gate.
    if(!pipe.asked&&insideGap(this.bird,pipe)
     &&pipe.x-PIPE_CAP<=this.bird.x+BIRD_HALF_W+APPROACH_MARGIN){
     pipe.x=this.bird.x+BIRD_HALF_W+PIPE_CAP+APPROACH_MARGIN;
     pipe.asked=true;this.current=pipe;this.state='approach';
     this.approachRemaining=.34;this.bird.vy=0;
     this.root.querySelector('#fv-announcer').textContent='Safe flight through the gap. Vocabulary challenge approaching.';
     return;
    }
    if(!pipe.passed&&pipe.x+PIPE_W+PIPE_CAP<this.bird.x-BIRD_HALF_W){
     pipe.passed=true;this.passed++;this.score+=5;this.refreshHUD();
    }
   }
   this.pipes=this.pipes.filter(p=>p.x+PIPE_W+PIPE_CAP>-40);
   if(this.next<this.words.length&&(!this.pipes.length||this.pipes[this.pipes.length-1].x<W-350))this.spawn();
   if(this.passed===this.words.length)this.complete(false);
  }
  crash(message){
   if(this.state!=='playing')return;
   this.lives=0;this.refreshHUD();this.opts.onCollision?.();
   this.root.querySelector('#fv-announcer').textContent=message+' Game over.';
   this.complete(true,message);
  }
  makeOptions(correct){const distinct=new Set([String(correct.term).toLowerCase().trim()]);const alternatives=shuffle(this.pool).filter(w=>{const k=String(w.term).toLowerCase().trim();if(distinct.has(k))return false;distinct.add(k);return true;}).slice(0,3);return shuffle([correct,...alternatives]).map(w=>({id:w.id,label:w.term}));}
  ask(pipe){if(this.state!=='approach'||!pipe)return;this.state='question';this.choices=this.makeOptions(pipe.word);this.selectedIndex=-1;this.answerReady=false;
   this.answerUnlockAt=performance.now()+620;
   this.show(`<div class="fv-panel fv-question" role="dialog" aria-modal="true" aria-labelledby="fv-question-title"><div class="fv-quiz-top"><span class="fv-kicker">PIPE ${this.attempted+1} / ${this.words.length}</span><span class="fv-timer">✦ Flight frozen</span></div><h2 id="fv-question-title">Choose the correct word</h2><p class="fv-definition">${safe(pipe.word.definition)}</p><div class="fv-answers" role="group" aria-label="Answer choices">${this.choices.map((c,i)=>`<button type="button" class="fv-choice" data-fv="choose" data-index="${i}" aria-pressed="false" disabled><span class="fv-key">${i+1}</span><span>${safe(c.label)}</span></button>`).join('')}</div><div class="fv-submit-row"><p class="fv-subtext" id="fv-answer-note">Get ready… answers unlock after the last flap.</p><button type="button" class="fv-button fv-confirm" data-fv="confirm" disabled>Confirm answer ✓</button></div></div>`);
   clearTimeout(this.answerTimer);this.armAnswers();
   this.root.querySelector('#fv-announcer').textContent='Flight paused. Wait for the answer choices to unlock.';
  }
  armAnswers(){if(this.state!=='question')return;const remaining=Math.max(this.answerUnlockAt-performance.now(),this.lastFlapPointerTime+620-performance.now());
   if(this.flightPointerActive||remaining>0){this.answerTimer=setTimeout(()=>this.armAnswers(),Math.max(60,Math.min(150,remaining||60)));return;}
   this.answerReady=true;this.root.querySelectorAll('.fv-choice').forEach(b=>{b.disabled=false;});
   const note=this.root.querySelector('#fv-answer-note');if(note)note.textContent='Tap to select an answer, then press Confirm.';
   this.root.querySelector('#fv-announcer').textContent='Answer choices are ready.';
  }
  selectAnswer(index){if(this.state!=='question'||!this.answerReady||!this.choices[index]||performance.now()<this.answerUnlockAt)return;
   this.selectedIndex=index;this.root.querySelectorAll('.fv-choice').forEach((b,i)=>{b.classList.toggle('fv-selected',i===index);b.setAttribute('aria-pressed',String(i===index));});
   this.root.querySelector('[data-fv="confirm"]').disabled=false;
   this.root.querySelector('#fv-answer-note').textContent='Answer selected. Confirm when you are ready.';
  }
  confirmAnswer(){if(this.state!=='question'||!this.answerReady||this.selectedIndex<0||performance.now()<this.answerUnlockAt)return;this.choose(this.selectedIndex);}
  choose(index){if(this.state!=='question'||!this.answerReady||!this.current||!this.choices[index]||index!==this.selectedIndex)return;
   clearTimeout(this.answerTimer);this.answerReady=false;
   const pipe=this.current,w=pipe.word,ok=this.choices[index].id===w.id;
   this.attempted++;if(ok){this.correct++;this.score+=10;}else{this.lives=Math.max(0,this.lives-1);}
   pipe.gap=234;pipe.gapY=clamp(this.bird.y,pipe.gap/2+24,GROUND-pipe.gap/2-24);pipe.unlocked=true;
   this.opts.onAnswer?.(ok,w);this.refreshHUD();
   const image=w.image?`<img src="${safe(w.image)}" alt="${safe(w.imageAlt||w.term)}" loading="lazy">`:w.illustration?`<span class="fv-emoji" role="img" aria-label="Vocabulary illustration">${safe(w.illustration)}</span>`:'';
   this.state='feedback';this.show(`<div class="fv-panel fv-feedback" role="dialog" aria-modal="true"><span class="fv-kicker">${ok?'GATE UNLOCKED':'LEARN & TRY AGAIN'}</span><h2 class="${ok?'fv-ok':'fv-bad'}">${ok?'Correct! +10 points':'Not quite. −1 heart'}</h2><div class="fv-answer-reveal"><div class="fv-answer-copy"><strong>${safe(w.term)}</strong><p>${safe(w.definition)}</p>${w.example?`<em>${safe(w.example)}</em>`:''}</div>${image?`<div class="fv-answer-image">${image}</div>`:''}</div><div class="fv-feedback-foot"><span>${'♥ '.repeat(this.lives)}${'♡ '.repeat(3-this.lives)}</span><button type="button" class="fv-button" data-fv="continue">${this.lives?'Keep flying →':'See results →'}</button></div></div>`);
   this.root.querySelector('#fv-announcer').textContent=ok?'Correct answer. Ten points.':'Incorrect answer. One heart lost.';
  }
  continueAfterAnswer(){if(this.state!=='feedback')return;if(!this.lives){this.complete(true);return;}
   this.state='playing';this.current=null;this.hide();this.bird.vy=-95;this.last=0;this.canvas.focus({preventScroll:true});
  }
  complete(early,crashReason=''){if(['finished','destroyed'].includes(this.state))return;this.state='finished';clearTimeout(this.answerTimer);this.hide();this.opts.onFinish?.({score:this.score,passed:this.passed,endedEarly:!!early,correct:this.correct,attempted:this.attempted,crashReason});}
  render(){const c=this.ctx;if(!c)return;c.imageSmoothingEnabled=false;
   c.fillStyle='#4bc0c7';c.fillRect(0,0,W,H);
   this.paintClouds(c);this.paintCity(c);
   for(const p of this.pipes)this.paintPipe(c,p);
   this.paintGround(c);this.paintBird(c);
   if(this.state==='approach')this.paintGateFlash(c);
  }
  paintClouds(c){
   c.fillStyle='#effbd8';const drift=this.tick*9;
   for(let n=-1;n<7;n++){
    const x=q4(n*196-(drift%196)),top=210+((n+8)%3)*13;
    // Layered rectangle silhouettes replicate the playful 8-bit reference style.
    for(const [ox,oy,w,h] of [[-30,48,199,92],[-10,30,153,105],[6,14,118,120],[26,0,69,132],[-44,64,230,63]]){
     c.fillRect(q4(x+ox),q4(top+oy),q4(w),q4(h));
    }
    c.fillStyle='#e2f7d3';c.fillRect(q4(x+26),q4(top-4),q4(65),4);c.fillStyle='#effbd8';
   }
   c.fillStyle='#ddf2d5';c.fillRect(0,341,W,GROUND-341);
  }
  paintCity(c){
   const drift=(this.tick*20)%96;
   for(let i=-2;i<15;i++){
    const x=q4(i*82-drift),h=82+(i*17+118)%56,y=GROUND-h;
    c.fillStyle='#77d9d5';c.fillRect(x-7,y-17,38,17);c.fillRect(x-18,y-9,72,9);
    c.fillStyle='#f3f4c5';c.fillRect(x-9,y,62,h);
    c.fillStyle='#36b7bf';c.fillRect(x-9,y,62,4);c.fillRect(x-9,y,4,h);c.fillRect(x+49,y,4,h);
    c.fillStyle='#a8e8d5';for(let wx=0;wx<4;wx++)for(let wy=0;wy<5;wy++)c.fillRect(x+wx*13,y+16+wy*17,7,12);
   }
  }
  paintGround(c){c.fillStyle='#23d65b';c.fillRect(0,GROUND,W,H-GROUND);c.fillStyle='#176c41';c.fillRect(0,GROUND,W,4);
   c.fillStyle='#44f875';for(let i=0;i<45;i++){const x=q4(i*27-(this.tick*PIPE_SPEED%27));c.fillRect(x,GROUND+7,18,8);}c.fillStyle='#2e9744';for(let x=0;x<W;x+=22)c.fillRect(x,GROUND+25,12,5);
  }
  paintPipe(c,p){
   const x=q4(p.x),top=q4(p.gapY-p.gap/2),bottom=q4(p.gapY+p.gap/2),width=PIPE_W;
   c.save();if(p.hit)c.globalAlpha=.58;
   const stem=(y,h)=>{if(h<=0)return;c.fillStyle='#312432';c.fillRect(x,y,width,h);c.fillStyle='#139539';c.fillRect(x+4,y+4,width-8,Math.max(0,h-8));c.fillStyle='#46ef57';c.fillRect(x+12,y+4,width-25,Math.max(0,h-8));c.fillStyle='#a9ff96';c.fillRect(x+15,y+4,8,Math.max(0,h-8));c.fillStyle='#27c83b';c.fillRect(x+58,y+4,9,Math.max(0,h-8));c.fillStyle='#078d2b';c.fillRect(x+76,y+4,7,Math.max(0,h-8));};
   stem(0,top);stem(bottom,GROUND-bottom);
   const cap=(y)=>{c.fillStyle='#302331';c.fillRect(x-8,y,width+16,49);c.fillStyle='#159b39';c.fillRect(x-4,y+4,width+8,41);c.fillStyle='#40ed4a';c.fillRect(x+5,y+5,width-7,33);c.fillStyle='#a2ff92';c.fillRect(x+10,y+7,8,30);c.fillStyle='#2ac531';c.fillRect(x+52,y+5,8,33);c.fillStyle='#1b963b';c.fillRect(x+78,y+5,5,33);c.fillStyle='#302331';c.fillRect(x-8,y+43,width+16,5);};
   cap(top-47);cap(bottom);
   c.restore();
   if(!p.asked){c.fillStyle='#fff8cb';c.fillRect(x+28,Math.max(20,top-77),36,29);c.fillStyle='#352b35';c.font='bold 28px monospace';c.textAlign='center';c.fillText('?',x+46,Math.max(41,top-54));}
   else if(p.unlocked){c.fillStyle='#edffad';c.fillRect(x+28,Math.max(20,top-77),36,29);c.fillStyle='#137c34';c.font='bold 25px monospace';c.textAlign='center';c.fillText('✓',x+46,Math.max(41,top-54));}
  }
  paintBird(c){
   c.save();c.translate(q4(this.bird.x),q4(this.bird.y));
   if(this.birdSprite?.complete&&this.birdSprite.naturalWidth){
    // True pixel-art image, sized to the physical hitbox used by pipe collisions.
    c.imageSmoothingEnabled=false;
    c.drawImage(this.birdSprite,-BIRD_HALF_W,-BIRD_HALF_H,BIRD_HALF_W*2,BIRD_HALF_H*2);
   }else{
    // Initial frames while the image downloads: a compact yellow bird fallback.
    c.fillStyle='#382735';c.fillRect(-29,-22,53,44);
    c.fillStyle='#fff33e';c.fillRect(-25,-18,42,36);
    c.fillStyle='#ffffff';c.fillRect(3,-19,21,22);
    c.fillStyle='#352233';c.fillRect(14,-14,6,12);
    c.fillStyle='#ff7054';c.fillRect(14,6,21,6);c.fillRect(14,16,19,6);
    c.fillStyle='#ffffff';c.fillRect(-27,-2,19,14);
   }
   c.restore();
  }
  paintGateFlash(c){const p=this.current;if(!p)return;const opacity=.25+.4*Math.abs(Math.sin(this.tick*20));
   c.save();c.globalAlpha=opacity;c.fillStyle='#fff6a5';const x=q4(p.x-28),y=q4(p.gapY-20);c.fillRect(x,y,14,32);c.fillRect(x-8,y+8,30,16);c.restore();
   c.save();c.fillStyle='#ffffff';c.strokeStyle='#38272e';c.lineWidth=3;c.font='bold 26px monospace';c.textAlign='center';c.strokeText('WORD GATE!',W/2,60);c.fillText('WORD GATE!',W/2,60);c.restore();
  }
 }
 window.WordHopFlappy={geometry:{insideGap,overlapsPipe,BIRD_HALF_W,BIRD_HALF_H,PIPE_CAP},mount(element,config){if(active)active.destroy();active=new FlappyVocab(element,config);return active;},stop(){if(active){active.destroy();active=null;}},getActive(){return active;}};
})();
