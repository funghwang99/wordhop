'use strict';
(() => {
  const service = 'https://wordhop.funghwang99.chatgpt.site/api/';
  const esc = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let student = null, memorySession = null, working = false, revision = 0;
  let returnPath = '#/', changed = () => {};

  function request(path, data) {
    return fetch(service+path,{
      method:'POST', credentials:'include', cache:'no-store', referrerPolicy:'no-referrer',
      headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify(memorySession ? {...data,session:memorySession} : data),
      signal:AbortSignal.timeout(12000)
    });
  }
  async function session(action, fields = {}) {
    const response = await request('student-session',{action,...fields});
    return {status:response.status,...await response.json()};
  }
  function validProfile(profile) {
    return typeof profile?.id === 'string' && /^[a-f0-9]{32}$/.test(profile.id) &&
      typeof profile.name === 'string' && Boolean(profile.name) && typeof profile.username === 'string';
  }
  async function restore() {
    if (working) return;
    const attempt = ++revision;
    try {
      const result = await session('verify');
      if (attempt !== revision) return;
      const previous = student;
      if (result.ok && validProfile(result.student)) student = result.student;
      else if (result.status === 401) { student = null; memorySession = null; }
      if (student?.id !== previous?.id || student?.name !== previous?.name) changed();
    } catch {}
  }
  function start(onChange) {
    changed = onChange;
    void restore();
    window.addEventListener('pageshow', event => { if (event.persisted) void restore(); });
  }
  function remember(previous, next) {
    if (next === '#/student' && previous !== next && /^#\/[a-z0-9_/-]*$/i.test(previous)) returnPath = previous;
  }
  function expire(expectedStudentId) {
    if (student?.id !== expectedStudentId) return;
    revision++;
    student = null; memorySession = null;
    changed();
  }
  async function signIn(form, navigate, keepRoute) {
    if (working) return;
    const status = form.querySelector('[role="status"]'), button = form.querySelector('button');
    const fields = {username:form.elements.username.value.trim(),password:form.elements.password.value};
    revision++;
    working = true; button.disabled = true; status.textContent = 'Signing in…';
    try {
      const login = await session('sign-in',fields);
      if (!login.ok || !validProfile(login.student)) {
        status.textContent = login.error || 'Could not sign in. Please try again.';
        return;
      }
      let verified = await session('verify');
      if (verified.status === 401) {
        // Some browsers block cross-site cookies even when partitioned.
        // In that case use a tab-memory session for this visit.
        verified = await session('sign-in',{...fields,memoryOnly:true});
        if (verified.ok && /^[a-f0-9]{64}$/.test(verified.session)) memorySession = verified.session;
        else throw new Error('Could not establish session');
      }
      if (!verified.ok || !validProfile(verified.student) || verified.student.id !== login.student.id) {
        memorySession = null;
        throw new Error('Session did not match');
      }
      form.elements.password.value = '';
      const shouldReturn = form.isConnected && !keepRoute;
      student = verified.student;
      changed();
      if (shouldReturn) navigate(returnPath);
    } catch {
      status.textContent = 'Could not sign in. Check your connection and try again.';
    } finally {
      working = false; button.disabled = false;
    }
  }
  async function signOut(form) {
    if (working) return;
    const button = form.querySelector('button'), status = form.querySelector('[role="status"]');
    revision++;
    working = true; button.disabled = true; status.textContent = 'Signing out…';
    try {
      const result = await session('sign-out');
      if (!result.ok) throw new Error('Sign-out failed');
      student = null; memorySession = null;
      changed();
    } catch {
      status.textContent = 'Could not sign out. Check your connection and try again.';
    } finally {
      working = false; button.disabled = false;
    }
  }
  function render(main, navigate, {keepRoute = false} = {}) {
    const account = student;
    const breadcrumbs = account
      ? '<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/" data-nav="#/">Courses</a>' +
        '<span class="sep" aria-hidden="true">/</span><span class="current" aria-current="page">Student account</span></nav>'
      : '';
    main.innerHTML = breadcrumbs + '<section class="student-account"><span class="student-account-kicker">WORDHOP</span>' +
      (account
        ? '<h1>Student account</h1><p>Signed in as <strong>'+esc(account.name)+'</strong>.</p>' +
            '<p class="student-username">'+esc(account.username)+'</p>' +
            (memorySession ? '<p class="student-username">This browser keeps you signed in for this visit. Refreshing the page may ask you to sign in again.</p>' : '') +
            '<a class="btn btn-primary" href="'+esc(returnPath)+'" data-nav="'+esc(returnPath)+'">Continue studying</a>' +
            '<form class="student-signout" method="post"><button class="btn" type="submit">Sign out</button><p role="status"></p></form>'
          : '<h1>Student sign in</h1><p>Use the username and password from your teacher to open WordHop.</p>' +
            '<form class="student-signin" method="post">' +
            '<label for="student-username">Username</label><input id="student-username" name="username" autocomplete="username" ' +
            'autocapitalize="none" spellcheck="false" required minlength="3" maxlength="40">' +
            '<label for="student-password">Password</label><input id="student-password" name="password" type="password" ' +
            'autocomplete="current-password" required maxlength="32">' +
            '<button class="btn btn-primary" type="submit">Sign in</button><p role="status"></p></form>') + '</section>';
    const form = main.querySelector('form');
    form?.addEventListener('submit',event=>{
      event.preventDefault();
      if (account) void signOut(form);
      else void signIn(form,navigate,keepRoute);
    });
  }

  window.WordHopStudent = {start,render,remember,request,expire,current:()=>student};
})();
