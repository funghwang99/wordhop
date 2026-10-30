'use strict';
(() => {
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let player=null;
function stop(){
 if(!player)return;
 player.pause();player.removeAttribute('src');player.load();player=null;
}
function time(seconds){const value=Math.floor(seconds);return Math.floor(value/60)+':'+String(value%60).padStart(2,'0');}
function render({unit,header,partId,path}){
 stop();
 const tracks=unit.listening,index=Math.max(0,tracks.findIndex(part=>part.id===partId)),part=tracks[index];
 const testTitle=unit.title.replace(/^Reading /,'');
 const link=(track,label,css='btn')=>`<a class="${css}" href="${esc(path+'/listening/'+track.id)}" data-nav="${esc(path+'/listening/'+track.id)}">${esc(label)}</a>`;
 document.querySelector('#main').innerHTML=header+`<section class="listening-view" aria-labelledby="listening-title">
 <div class="listening-intro"><div><h2 id="listening-title">Listening</h2><p>Choose a part, then press Play. Pause, replay or change the speed as you practise.</p></div><span class="listening-count">${tracks.length} audio parts</span></div>
 <nav class="listening-parts" aria-label="Listening parts">${tracks.map((track,i)=>`<a class="listening-part ${i===index?'active':''}" href="${esc(path+'/listening/'+track.id)}" data-nav="${esc(path+'/listening/'+track.id)}" ${i===index?'aria-current="page"':''}><strong>${esc(track.title)}</strong><span>${time(track.duration)}</span></a>`).join('')}</nav>
 <div class="listening-player-card"><div class="listening-player-heading"><div><p class="section-label">${esc(testTitle)} · Listening</p><h3>${esc(part.title)}</h3></div><span class="listening-duration">${time(part.duration)}</span></div>
 ${part.sourceWarning?`<p class="notice listening-source-warning"><strong>Recording note:</strong> ${esc(part.sourceWarning)}</p>`:''}
 <audio id="listening-audio" controls preload="none" src="${esc(part.src)}" aria-label="${esc(testTitle+' '+part.title+' listening audio')}">Your browser does not support audio playback.</audio>
 <div class="listening-tools"><label for="listening-speed">Playback speed <select id="listening-speed" aria-label="Playback speed"><option value="0.75">0.75×</option><option value="1" selected>1× · Normal</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label><a class="text-button" href="${esc(part.src)}" target="_blank" rel="noopener">Open audio file ↗</a></div>
 <div id="listening-error" class="notice" role="alert" hidden>Audio could not be loaded. Check your connection, then <button class="text-button" id="listening-retry" type="button">try again</button> or open the audio file.</div>
 </div><div class="listening-navigation">${index?link(tracks[index-1],'← Previous part'):'<span></span>'}${index<tracks.length-1?link(tracks[index+1],'Next part →'):'<span></span>'}</div></section>`;
 player=document.querySelector('#listening-audio');
 const audio=player,error=document.querySelector('#listening-error');
 audio.addEventListener('error',()=>{if(player===audio)error.hidden=false;});
 audio.addEventListener('canplay',()=>{if(player===audio)error.hidden=true;});
 document.querySelector('#listening-speed').addEventListener('change',event=>{audio.playbackRate=Number(event.target.value);});
 document.querySelector('#listening-retry').addEventListener('click',()=>{error.hidden=true;audio.load();});
}
window.WordHopListening={render,stop};
window.addEventListener('pagehide',()=>player?.pause());
})();
