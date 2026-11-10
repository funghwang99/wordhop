'use strict';
(() => {
  const base = '#/pet/trainer';
  const readings = {
    1: 'trainer/test-1-reading.9cb675a48d97.json',
    2: 'trainer/test-2-reading.e386b500fec6.json'
  };
  const skills = ['reading', 'listening', 'writing', 'speaking'];
  const titleCase = value => value[0].toUpperCase() + value.slice(1);
  const testPath = test => `${base}/trainer-test-${test}`;
  const scopeKey = student => `wordhop.trainer.reading.v2.${student.id}`;
  let active = null;

  function parse(segments) {
    const test = Number(String(segments[0] || '').replace(/^trainer-test-/, ''));
    const hasMode = ['exam', 'training'].includes(segments[1]);
    const mode = hasMode ? segments[1] : 'exam';
    const skill = segments[hasMode ? 2 : 1] || 'reading';
    const part = segments[hasMode ? 3 : 2] || 'part-1';
    return {test, mode, skill, part, valid: test >= 1 && test <= 6 && Number.isInteger(test)};
  }

  function migrate(student) {
    const target = scopeKey(student);
    try {
      if (localStorage.getItem(target) !== null) return true;
      const legacy = JSON.parse(localStorage.getItem(`wordhop.trainer.v1.${student.id}`) || '{}');
      const tests = {};
      for (const [key, saved] of Object.entries(legacy || {})) {
        const match = /^([12]):exam:reading:(part-[123])$/.exec(key);
        if (!match || !saved?.answers || typeof saved.answers !== 'object' || Array.isArray(saved.answers)) continue;
        const answers = {};
        for (const [question, answer] of Object.entries(saved.answers)) {
          if (/^q\d+$/.test(question) && typeof answer === 'string') answers[Number(question.slice(1))] = answer;
        }
        const test = tests[`trainer-test-${match[1]}`] ||= {};
        test[match[2]] = {answers, checked: saved.checked === true};
      }
      localStorage.setItem(target, JSON.stringify({version: 1, tests}));
      return true;
    } catch {
      return false;
    }
  }

  function breadcrumbs(test) {
    return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/" data-nav="#/">Courses</a><span class="sep" aria-hidden="true">/</span><a href="#/pet" data-nav="#/pet">PET</a><span class="sep" aria-hidden="true">/</span>${test ? `<a href="${base}" data-nav="${base}">Trainer</a><span class="sep" aria-hidden="true">/</span><span class="current" aria-current="page">Test ${test}</span>` : '<span class="current" aria-current="page">Trainer</span>'}</nav>`;
  }

  function testCards() {
    return breadcrumbs() + '<div class="page-heading"><h1>Trainer</h1><p>B1 Preliminary for Schools · Second edition</p></div><p class="section-label">Choose a test</p><div class="cards">' +
      Array.from({length: 6}, (_, index) => {
        const test = index + 1;
        const ready = Boolean(readings[test]);
        const url = testPath(test);
        return `<a class="nav-card compact${ready ? '' : ' empty'}" href="${url}" data-nav="${url}"><div class="nav-card-top"><span class="card-label${ready ? '' : ' neutral'}">${ready ? '3 Reading parts available' : 'In preparation'}</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></div><h2>Test ${test}</h2><p>${ready ? 'Reading Parts 1–3 · 15 questions' : 'Exercises are being prepared.'}</p>${ready ? '<span class="card-meta">Answer key · Vietnamese explanations</span>' : ''}</a>`;
      }).join('') + '</div>';
  }

  function header(route) {
    const root = testPath(route.test);
    const modePath = root + (route.mode === 'training' ? '/training' : '');
    const modes = route.test <= 2
      ? `<nav class="trainer-modes" aria-label="Practice mode">${['exam', 'training'].map(mode => {
        const url = root + (mode === 'training' ? '/training' : '') + '/' + route.skill;
        return `<a class="unit-tab${route.mode === mode ? ' active' : ''}" href="${url}" data-nav="${url}" ${route.mode === mode ? 'aria-current="page"' : ''}>${mode === 'exam' ? 'Exam Practice' : 'Training'}</a>`;
      }).join('')}</nav>` : '';
    const tabs = `<nav class="unit-tabs" aria-label="Study and practice">${skills.map(skill => {
      const url = modePath + '/' + skill;
      return `<a class="unit-tab${route.skill === skill ? ' active' : ''}" href="${url}" data-nav="${url}" ${route.skill === skill ? 'aria-current="page"' : ''}>${titleCase(skill)}</a>`;
    }).join('')}</nav>`;
    return breadcrumbs(route.test) + `<div class="unit-heading"><div><h1>Test ${route.test}</h1><p>Trainer · PET</p></div><div class="unit-heading-actions"><button class="text-button clear-results-button" type="button" data-trainer-action="clear-results">Clear saved results</button></div></div>` + modes + tabs;
  }

  function render(context) {
    const student = window.WordHopStudent.current();
    if (!student) return;
    const route = parse(context.segments);
    const hash = location.hash;
    active = {...context, route, studentId: student.id};
    if (!route.valid) {
      context.container.innerHTML = testCards();
      return;
    }
    if (!skills.includes(route.skill)) route.skill = 'reading';
    const top = header(route);
    if (route.mode === 'exam' && route.skill === 'reading' && readings[route.test] && /^part-[123]$/.test(route.part)) {
      if (!migrate(student)) context.toast('Previous Trainer answers could not be restored. Check your browser storage settings.');
      window.WordHopReading.render({
        unit: {id: `trainer-test-${route.test}`, title: `Test ${route.test}`, readingFile: readings[route.test]},
        header: top,
        partId: route.part,
        path: testPath(route.test),
        storageKey: scopeKey(student),
        isCurrent: () => active?.studentId === student.id && window.WordHopStudent.current()?.id === student.id && location.hash === hash,
        toast: context.toast,
        onGrade: context.onGrade
      });
      return;
    }
    context.container.innerHTML = top + `<section class="empty-state"><h2>${route.mode === 'training' ? 'Training' : titleCase(route.skill)} is in preparation</h2><p>The exercises for this section are being prepared.</p>${readings[route.test] ? `<a class="btn btn-primary" href="${testPath(route.test)}/reading" data-nav="${testPath(route.test)}/reading">Open available Reading parts</a>` : `<a class="btn" href="${base}" data-nav="${base}">Back to tests</a>`}</section>`;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-trainer-action="clear-results"]');
    if (!button || !active?.route.valid || window.WordHopStudent.current()?.id !== active.studentId) return;
    const context = active;
    context.confirmClear(context.route.test, () => {
      if (active !== context || window.WordHopStudent.current()?.id !== context.studentId) return;
      const student = window.WordHopStudent.current();
      if (!migrate(student) || !window.WordHopReading.clearResults(`trainer-test-${context.route.test}`, scopeKey(student))) {
        context.toast('Saved results could not be cleared. Check your browser storage settings.');
        return;
      }
      render(context);
      context.toast(`Saved results cleared for Test ${context.route.test}.`);
    });
  });

  window.WordHopTrainer = {render, stop() {active = null;}};
})();
