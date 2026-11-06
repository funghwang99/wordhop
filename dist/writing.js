'use strict';
(() => {
  const storageKey = 'wordhop.writing.v1', cache = new Map();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let progress = {}, active = null, saveTimer = null, saveFailed = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved?.version === 1 && saved.tests && typeof saved.tests === 'object' && !Array.isArray(saved.tests)) progress = saved.tests;
  } catch {}

  function wordCount(text) {
    return String(text).trim().split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length;
  }
  function status(message) {
    const node = document.querySelector('#writing-save-state');
    if (node && active?.isCurrent()) node.textContent = message;
  }
  function persist() {
    clearTimeout(saveTimer); saveTimer = null;
    try {
      localStorage.setItem(storageKey, JSON.stringify({version:1, tests:progress}));
      saveFailed = false; status('Draft saved on this device.');
      return true;
    } catch {
      saveFailed = true; status('Draft could not be saved. Keep this page open and copy your writing before leaving.');
      return false;
    }
  }
  function stop() {
    if (saveTimer !== null && !persist()) active?.toast('Your writing draft could not be saved. Return to Writing and copy it before closing this page.');
    active = null;
  }
  function clearResults(unitId) {
    const next = {...progress}; delete next[unitId];
    try { localStorage.setItem(storageKey, JSON.stringify({version:1, tests:next})); }
    catch { return false; }
    clearTimeout(saveTimer); saveTimer = null; progress = next; saveFailed = false;
    if (active?.unit.id === unitId) active = null;
    return true;
  }
  function validate(data, unitId) {
    if (data?.id !== unitId || !data.source?.title || !Array.isArray(data.parts) || data.parts.length !== 2) throw new Error('Writing data mismatch');
    for (const [i, part] of data.parts.entries()) {
      if (part.id !== 'part-' + (i+1) || part.requiredQuestions !== 1 || typeof part.instructions !== 'string' || !Array.isArray(part.pages) || !part.pages.length) throw new Error('Invalid writing part');
      for (const page of part.pages) if (!/^assets\/writing\/[\w.-]+\.webp$/.test(page.image) || !(page.width > 0) || !(page.height > 0)) throw new Error('Invalid writing page');
      const expected = i === 0 ? [1] : [2,3];
      if (!Array.isArray(part.questions) || part.questions.length !== expected.length) throw new Error('Incomplete writing questions');
      for (const [j, q] of part.questions.entries()) {
        if (q.number !== expected[j] || q.id !== 'question-' + q.number || !q.title || !['email','article','story'].includes(q.genre) || !Number.isInteger(q.targetWords) || q.targetWords < 1) throw new Error('Invalid writing question');
      }
    }
    return data;
  }
  function load(unit) {
    if (!cache.has(unit.id)) cache.set(unit.id, fetch(unit.writingFile).then(r => {
      if (!r.ok) throw new Error('Writing unavailable');
      return r.json();
    }).then(data => validate(data,unit.id)).catch(error => { cache.delete(unit.id); throw error; }));
    return cache.get(unit.id);
  }
  function attempt(unitId, part) {
    if (!progress[unitId] || typeof progress[unitId] !== 'object' || Array.isArray(progress[unitId])) progress[unitId] = {};
    let saved = progress[unitId][part.id];
    if (!saved || typeof saved !== 'object' || !saved.answers || typeof saved.answers !== 'object' || Array.isArray(saved.answers)) saved = progress[unitId][part.id] = {selected:part.questions[0].id, answers:{}};
    if (!part.questions.some(q => q.id === saved.selected)) saved.selected = part.questions[0].id;
    return saved;
  }
  function draw(context, data) {
    if (active !== context || !context.isCurrent()) return;
    const part = data.parts.find(p => p.id === context.partId) || data.parts[0];
    context.part = part;
    const saved = attempt(context.unit.id,part), q = part.questions.find(q => q.id === saved.selected);
    context.question = q;
    const text = typeof saved.answers[q.id] === 'string' ? saved.answers[q.id] : '';
    const first = part.pages[0], last = part.pages.at(-1);
    document.querySelector('#main').innerHTML = context.header + `<section class="writing-view reading-view" aria-label="Book writing test">
      <div class="reading-intro"><div><h2>Writing</h2><p>Read the original task and instructions. Write your answer below; drafts save on this device.</p></div></div>
      <nav class="reading-parts" aria-label="Writing parts">${data.parts.map(p => `<a class="reading-part-link${p.id === part.id ? ' active' : ''}" href="${esc(context.path)}/writing/${p.id}" data-nav="${esc(context.path)}/writing/${p.id}" ${p.id === part.id ? 'aria-current="page"' : ''}>Part ${esc(p.id.split('-')[1])}</a>`).join('')}</nav>
      <div class="reading-part-heading"><div><h3>${esc(part.title)}</h3><p>${esc(part.instructions)}</p><p>Book ${part.pages.length === 1 ? 'page' : 'pages'} ${esc(first.printedPage)}${part.pages.length > 1 ? '–'+esc(last.printedPage) : ''}</p></div><div class="reading-page-actions"><button class="btn" type="button" data-writing-action="write">Start writing ↓</button><button class="btn" type="button" data-writing-action="zoom" aria-pressed="false">Zoom page</button><a class="text-button" href="${esc(first.image)}" target="_blank" rel="noopener">Open full-size page ↗</a></div></div>
      <div class="reading-page writing-page" tabindex="0" aria-label="Original writing tasks and instructions">${part.pages.map((page,index) => `<img src="${esc(page.image)}" width="${page.width}" height="${page.height}" alt="${esc(context.title || context.unit.title)}, Writing ${esc(part.title)}, book page ${esc(page.printedPage)}. Original questions and instructions." decoding="async" ${index > 0 ? 'loading="lazy"' : ''}>`).join('')}</div>
      <section class="writing-editor" aria-label="Writing draft">
        ${part.questions.length > 1 ? `<label class="writing-question-label" for="writing-question">Choose ONE question</label><select id="writing-question" data-writing-question>${part.questions.map(option => `<option value="${esc(option.id)}" ${q.id === option.id ? 'selected' : ''}>Question ${option.number} · ${esc(option.title)}</option>`).join('')}</select>` : ''}
        <div class="writing-editor-heading"><label for="writing-draft">Your answer · Question ${q.number}</label><span id="writing-word-count">${wordCount(text)} words · Aim for about ${q.targetWords}</span></div>
        <textarea id="writing-draft" data-writing-draft rows="12" maxlength="20000" spellcheck="true" placeholder="Write your ${esc(q.genre)} here…">${esc(text)}</textarea>
        <div class="writing-editor-footer"><p id="writing-save-state" role="status" aria-live="polite">${saveFailed ? 'Draft could not be saved. Copy your writing before leaving.' : text ? 'Draft saved on this device.' : 'Your draft saves automatically on this device.'}</p><button class="text-button" type="button" data-writing-action="prompt">Back to prompt ↑</button></div>
      </section>
      <p class="reading-source-note">Original writing tasks and instructions: ${esc(data.source.title)}. ${esc(data.source.publisher)}.</p>
    </section>`;
  }
  function render(context) {
    stop(); active = context;
    document.querySelector('#main').innerHTML = context.header + '<p class="notice" role="status">Loading writing tasks…</p>';
    load(context.unit).then(data => { context.data = data; draw(context,data); }).catch(() => {
      if (active === context && context.isCurrent()) document.querySelector('#main').innerHTML = context.header + '<div class="notice" role="alert">This writing test could not be loaded. Check your connection and try again.</div><button class="btn btn-primary" type="button" data-writing-action="reload">Try again</button>';
    });
  }
  document.addEventListener('input', event => {
    const control = event.target.closest('[data-writing-draft]');
    if (!control || !active?.question || !active.isCurrent()) return;
    attempt(active.unit.id,active.part).answers[active.question.id] = control.value;
    document.querySelector('#writing-word-count').textContent = `${wordCount(control.value)} words · Aim for about ${active.question.targetWords}`;
    status('Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(persist,250);
  });
  document.addEventListener('change', event => {
    const control = event.target.closest('[data-writing-question]');
    if (!control || !active?.part || !active.isCurrent() || !active.part.questions.some(q => q.id === control.value)) return;
    attempt(active.unit.id,active.part).selected = control.value; persist(); draw(active,active.data);
    document.querySelector('#writing-draft')?.focus({preventScroll:true});
    document.querySelector('.writing-editor')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-writing-action]');
    if (!button || !active?.isCurrent()) return;
    const action = button.dataset.writingAction;
    if (action === 'reload') { render(active); return; }
    if (action === 'zoom') { const zoomed = document.querySelector('.writing-page').classList.toggle('is-zoomed'); button.setAttribute('aria-pressed',String(zoomed)); button.textContent = zoomed ? 'Fit page' : 'Zoom page'; }
    if (action === 'write') { document.querySelector('.writing-editor').scrollIntoView({behavior:'smooth',block:'start'}); document.querySelector('#writing-draft').focus({preventScroll:true}); }
    if (action === 'prompt') document.querySelector('.writing-page').scrollIntoView({behavior:'smooth',block:'start'});
  });
  window.addEventListener('beforeunload', () => { if (saveTimer !== null) persist(); });
  window.addEventListener('pagehide', () => { if (saveTimer !== null) persist(); });
  window.WordHopWriting = {render,validate,wordCount,clearResults,stop};
})();
