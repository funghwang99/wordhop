'use strict';
(() => {
  const storageKey = 'wordhop.reading.v1';
  const cache = new Map();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normal = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
  let progress = {}, active = null, saveTimer = null, saveWarning = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && saved.version === 1 && saved.tests && typeof saved.tests === 'object' && !Array.isArray(saved.tests)) progress = saved.tests;
  } catch {}

  function persist() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(storageKey, JSON.stringify({version:1, tests:progress})); }
    catch { if (!saveWarning) { active?.toast('Your browser could not save your reading answers. You can still read and check this part.'); saveWarning = true; } }
  }
  function attempt(unitId, partId) {
    const test = progress[unitId] ||= {};
    const part = test[partId];
    if (!part || typeof part !== 'object' || !part.answers || typeof part.answers !== 'object' || Array.isArray(part.answers)) test[partId] = {answers:{}, checked:false};
    return test[partId];
  }
  function clearResults(unitId) {
    const next = {...progress};
    delete next[unitId];
    try { localStorage.setItem(storageKey,JSON.stringify({version:1,tests:next})); }
    catch { return false; }
    clearTimeout(saveTimer); saveTimer = null;
    progress = next;
    if (active?.unit.id === unitId) active = null;
    return true;
  }
  function selections(value) { return (Array.isArray(value)?value:String(value??'').split(/[\s,;]+/)).map(normal).filter(Boolean); }
  function grade(question, value) {
    if (question.unscored) return null;
    if(question.multiple){const chosen=selections(value),expected=selections(question.answer);return chosen.length===question.multiple&&new Set(chosen).size===chosen.length&&chosen.slice().sort().join(',')===expected.slice().sort().join(',');}
    return (question.accepted || [question.answer]).some(answer => normal(answer) === normal(value));
  }
  function validate(data, unitId) {
    if (data?.id !== unitId || !Array.isArray(data.parts) || !data.parts.length) throw new Error('Reading data mismatch');
    const numbers = [];
    for (const [index, part] of data.parts.entries()) {
      if (part.id !== 'part-' + (index + 1) || !Array.isArray(part.questions) || !part.questions.length) throw new Error('Invalid reading part');
      if(part.pages && (!Array.isArray(part.pages)||!part.pages.length)) throw new Error('Invalid reading pages');
      for(const page of part.pages || [part]) if(!/^assets\/reading\/[\w.-]+\.webp$/.test(page.image) || !(page.width>0) || !(page.height>0)) throw new Error('Invalid reading page');
      if(new Set(part.questions.map(q=>q.number)).size!==part.questions.length) throw new Error('Reading questions are incomplete');
      for (const q of part.questions) {
        if (q.unscored && (q.unscored !== true || typeof q.reviewNote !== 'string' || !q.reviewNote.trim())) throw new Error('Missing source question review');
        if (!Number.isInteger(q.number) || typeof q.answer !== 'string' || !q.answer || typeof q.explanation !== 'string' || !q.explanation.trim() || typeof q.evidence !== 'string' || !q.evidence.trim()) throw new Error('Incomplete reading answer');
        if (q.options && (!Array.isArray(q.options) || (!q.multiple&&!q.options.includes(q.answer)) || (q.multiple&&(!Number.isInteger(q.multiple)||q.multiple<2||selections(q.answer).length!==q.multiple||selections(q.answer).some(a=>!q.options.map(normal).includes(a)))))) throw new Error('Invalid answer option');
        if(q.multiple && (!q.options || q.multiple>q.options.length || new Set(selections(q.answer)).size!==q.multiple)) throw new Error('Invalid multiple answer');
        if (q.accepted && (!Array.isArray(q.accepted) || !q.accepted.includes(q.answer) || q.accepted.some(a => typeof a !== 'string' || !a.trim()))) throw new Error('Invalid accepted answers');
        numbers.push(q.number);
      }
    }
    if (!numbers.length) throw new Error('Reading questions are incomplete');
    return data;
  }
  function load(unit) {
    if (!cache.has(unit.id)) cache.set(unit.id, fetch(unit.readingFile).then(r => {
      if (!r.ok) throw new Error('Reading unavailable');
      return r.json();
    }).then(data => validate(data, unit.id)).catch(error => { cache.delete(unit.id); throw error; }));
    return cache.get(unit.id);
  }
  function inputMarkup(question, saved) {
    const id = 'reading-q-' + question.number;
    const value = String(saved.answers[question.number] ?? '');
    const disabled = saved.checked ? 'disabled' : '';
    const review = question.unscored;
    if(question.multiple){
      const selected=selections(saved.answers[question.number]);
      return `<fieldset class="reading-answer-row reading-multiple${saved.checked?(grade(question,saved.answers[question.number])?' reading-correct':' reading-incorrect'):''}"><legend>Question ${question.number} · Choose ${question.multiple}</legend><div class="reading-multiple-options">${question.options.map(option=>`<label><input type="checkbox" name="q-${question.number}" data-reading-number="${question.number}" data-reading-multiple="true" value="${esc(option)}" ${selected.includes(normal(option))?'checked':''} ${disabled}>${esc(option)}</label>`).join('')}</div>${saved.checked?`<span class="reading-answer-state">${grade(question,saved.answers[question.number])?'Correct':'Review'}</span>`:''}</fieldset>`;
    }
    const control = question.options
      ? `<select id="${id}" name="q-${question.number}" data-reading-number="${question.number}" ${disabled}><option value="">Choose</option>${question.options.map(option => `<option value="${esc(option)}" ${normal(option) === normal(value) ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>`
      : `<input id="${id}" name="q-${question.number}" data-reading-number="${question.number}" value="${esc(value)}" maxlength="60" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${esc(question.placeholder || 'Your answer')}" ${disabled}>`;
    return `<div class="reading-answer-row${saved.checked ? (review ? ' reading-review' : grade(question,value) ? ' reading-correct' : ' reading-incorrect') : ''}"><label for="${id}">Question ${question.number}</label>${control}${saved.checked ? `<span class="reading-answer-state">${review ? 'Not scored' : grade(question,value) ? 'Correct' : value.trim() ? 'Review' : 'Not answered'}</span>` : ''}</div>`;
  }
  function draw(context, data) {
    if (active !== context || !context.isCurrent()) return;
    const part = data.parts.find(p => p.id === context.partId) || data.parts[0];
    context.part = part;
    const pages=part.pages || [part], label=data.partLabel || 'Part';
    const saved = attempt(context.unit.id, part.id);
    const scored = part.questions.filter(q => !q.unscored).length;
    const unscored = part.questions.filter(q => q.unscored).map(q => q.number);
    const correct = part.questions.filter(q => grade(q,saved.answers[q.number])).length;
    const complete = data.parts.filter(p => attempt(context.unit.id,p.id).checked).length;
    const main = document.querySelector('#main');
    main.innerHTML = context.header + `<section class="reading-view" aria-label="Book reading test">
      <div class="reading-intro"><div><h2>Reading</h2><p>Read the original book passage, then answer the questions. Your answers are saved on this device.</p></div><span class="reading-completion">${complete}/${data.parts.length} ${label==='Passage'?'passages':'parts'} checked</span></div>
      <nav class="reading-parts" aria-label="Reading parts">${data.parts.map(p => `<a class="reading-part-link${p.id === part.id ? ' active' : ''}" href="${esc(context.path)}/reading/${p.id}" data-nav="${esc(context.path)}/reading/${p.id}" ${p.id === part.id ? 'aria-current="page"' : ''}>${esc(label)} ${esc(p.id.split('-')[1])}${attempt(context.unit.id,p.id).checked ? '<span class="visually-hidden">, checked</span><span aria-hidden="true"> ✓</span>' : ''}</a>`).join('')}</nav>
      <div class="reading-part-heading"><div><h3>${esc(part.title)}</h3><p>Questions ${part.questions[0].number}–${part.questions.at(-1).number} · Book ${pages.length===1?'page':'pages'} ${pages[0].printedPage}${pages.length>1?'–'+pages.at(-1).printedPage:''}</p></div><div class="reading-page-actions"><button class="btn" type="button" data-reading-action="zoom" aria-pressed="false">Zoom page</button><a class="text-button" href="${esc(pages[0].image)}" target="_blank" rel="noopener">Open full-size page ↗</a></div></div>
      ${context.unit.id==='simply-pet-test-8'&&data.parts.some(other=>other.id!==part.id&&other.image===part.image) ? `<p class="reading-key-note">Parts 5 and 6 share this book page.${part.id==='part-6' ? ' Part 6 is in the lower half of the page.' : ''}</p>` : ''}      ${unscored.length ? `<p class="notice">Question ${unscored.join(", ")} is not included in the score because the source question or answer key needs review. A note is provided with the explanations.</p>` : ''}<div class="reading-page" tabindex="0" aria-label="Original reading passage and questions">${pages.map((page,index)=>`<img src="${esc(page.image)}" width="${page.width}" height="${page.height}" alt="${esc(context.unit.title)}, ${esc(part.title)}, book page ${page.printedPage}. Original passage, instructions and questions." decoding="async" ${index>0?'loading="lazy"':''}>`).join('')}</div>
      <form class="reading-answer-sheet" data-reading-form="true"><div class="reading-sheet-heading"><div><h3>Answer sheet</h3><p>${esc(part.instructions || (part.questions.every(q=>q.options) ? 'Choose the answer letters shown on the book page.' : part.questions.every(q=>!q.options) ? 'Write ONE word for each gap. No word bank.' : 'Follow the question instructions and word limits shown on the book pages.'))}</p></div>${saved.checked ? `<strong class="reading-score" tabindex="-1" role="status">${correct}/${scored} correct</strong>` : ''}</div><div class="reading-answer-inputs">${part.questions.map(q => inputMarkup(q,saved)).join('')}</div><div class="reading-submit-row">${saved.checked ? '<button class="btn" type="button" data-reading-action="retry">Try this part again</button>' : '<button class="btn btn-primary" type="submit">Check answers</button>'}<button class="text-button" type="button" data-reading-action="back-to-page">Back to reading page ↑</button></div></form>
      ${saved.checked ? `<section class="reading-solutions" aria-labelledby="reading-solutions-title"><h3 id="reading-solutions-title">Answer key &amp; explanations</h3><p class="reading-solution-note">${data.source.answerKeyPdfSha256 ? "Checked against the publisher answer key. " : ""}WordHop explanations based on the reading text.</p>${part.questions.map(q => {const value = String(saved.answers[q.number] ?? ''); const ok = grade(q,value); return `<article class="reading-solution ${q.unscored ? 'reading-review' : ok ? 'reading-correct' : 'reading-incorrect'}"><div class="reading-solution-top"><h4>Question ${q.number} · ${esc(q.answer)}${q.unscored ? (q.publisherAnswer ? (normal(q.publisherAnswer)===normal(q.answer) ? ' (book key)' : ' (reviewed)') : ' (intended)') : ''}</h4><span>${q.unscored ? 'Not scored' : ok ? 'Correct' : 'Review'}</span></div><p class="reading-your-answer">Your answer: <strong>${value.trim() ? esc(value) : 'Not answered'}</strong>${q.accepted?.length > 1 ? ` · Also accepted: ${q.accepted.filter(a=>a!==q.answer).map(esc).join(', ')}` : ''}</p>${q.publisherAnswer && q.unscored ? `<p class="reading-key-note">Publisher key: <strong>${esc(q.publisherAnswer)}</strong> · Key page ${q.publisherKeyPrintedPage}</p>` : ""}<p>${esc(q.explanation)}</p><blockquote><span>Evidence from the text</span>${esc(q.evidence)}</blockquote></article>`;}).join('')}</section>` : '<p class="reading-key-note">Check your answers to see the answer key and an explanation for every question, including correct answers. Unanswered questions receive no mark.</p>'}
      <p class="reading-source-note">Original passages and questions: ${esc(data.source.title)}. ${esc(data.source.publisher)}.</p>
    </section>`;
  }
  function render(context) {
    active = context;
    document.querySelector('#main').innerHTML = context.header + '<p class="notice" role="status">Loading reading passage…</p>';
    load(context.unit).then(data => { context.data = data; draw(context,data); }).catch(() => {
      if (active === context && context.isCurrent()) document.querySelector('#main').innerHTML = context.header + '<div class="notice" role="alert">This reading test could not be loaded. Check your connection and try again.</div><button class="btn btn-primary" type="button" data-reading-action="reload">Try again</button>';
    });
  }
  function remember(event) {
    const control = event.target.closest('[data-reading-number]');
    if (!control || !active?.part || !active.isCurrent()) return;
    const saved = attempt(active.unit.id, active.part.id);
    if (saved.checked) return;
    saved.answers[Number(control.dataset.readingNumber)] = control.dataset.readingMultiple ? [...control.closest('.reading-multiple').querySelectorAll('input:checked')].map(c=>c.value) : control.value;
    clearTimeout(saveTimer); saveTimer = setTimeout(persist, 250);
  }
  document.addEventListener('input', remember);
  document.addEventListener('change', remember);
  document.addEventListener('submit', event => {
    if (!event.target.matches('[data-reading-form]') || !active?.part || !active.isCurrent()) return;
    event.preventDefault();
    const context = active, saved = attempt(context.unit.id,context.part.id);
    for (const control of event.target.querySelectorAll('[data-reading-number]')) saved.answers[Number(control.dataset.readingNumber)] = control.dataset.readingMultiple ? [...control.closest('.reading-multiple').querySelectorAll('input:checked')].map(c=>c.value) : control.value;
    saved.checked = true; persist();
    context.onGrade?.(context.part.questions.filter(q=>!q.unscored).every(q => grade(q,saved.answers[q.number])));
    draw(context,context.data);
    const score = document.querySelector('.reading-score'); score?.focus({preventScroll:true});
    document.querySelector('.reading-answer-sheet')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-reading-action]');
    if (!button || !active?.isCurrent()) return;
    const action = button.dataset.readingAction;
    if (action === 'reload') { render(active); return; }
    if (action === 'zoom') { const page=document.querySelector('.reading-page'); const zoomed=page.classList.toggle('is-zoomed'); button.setAttribute('aria-pressed',String(zoomed)); button.textContent=zoomed?'Fit page':'Zoom page'; return; }
    if (action === 'back-to-page') { document.querySelector('.reading-page').scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (action === 'retry') { progress[active.unit.id][active.part.id] = {answers:{},checked:false}; persist(); draw(active,active.data); document.querySelector('[data-reading-number]')?.focus({preventScroll:true}); }
  });
  window.addEventListener('beforeunload',persist);
  window.WordHopReading = {render,validate,grade,clearResults};
})();
