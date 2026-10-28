import { drawActivityWave } from './ghoststroke-wave.js';

// A fixed illustration of the native generation/typing workflow, not live inference.
export const PREFIX = 'I’ll send the first version on Friday. ';
export const PREPARED_TEXT = PREFIX + 'We can review it together and decide what needs another pass.';
export const FALSE_START = 'Maybe we should wait until every detail is finished.';
const PACES = { natural: 1, deliberate: 1.4, quick: 0.6 };

export function buildTypingPlan({ profile = 'natural', mistakes = true, source = PREPARED_TEXT } = {}) {
  const pace = PACES[profile] ?? PACES.natural;
  const events = [];
  let text = '';
  let alternativeStart = null;
  const add = (kind, duration) => events.push({ text, alternativeStart, kind, duration: kind === 'consider' ? 2400 : Math.round(duration * pace) });
  const type = (phrase, kind) => Array.from(phrase).forEach((character, index) => {
    text += character;
    add(kind, character === ' ' ? 110 : /[.,!?]/.test(character) ? 340 : 42 + (index % 7) * 11);
  });
  const prefix = source.startsWith(PREFIX) ? PREFIX : '';
  add('pause', 300);
  type(prefix, 'typing');
  if (mistakes) {
    add('pause', 550);
    alternativeStart = text.length;
    type(FALSE_START, 'alternative');
    // Let the visitor read the complete alternative before backspacing it.
    add('consider', 2000);
    const letters = Array.from(FALSE_START);
    while (letters.length) {
      letters.pop();
      text = prefix + letters.join('');
      add('correction', 27);
    }
    alternativeStart = null;
    add('pause', 500);
  }
  type(source.slice(prefix.length), 'typing');
  return events;
}

/** One timer at a time; pausing retains the remainder of the current event. */
export function createTypingPlayer({ plan, onChange = () => {}, now = () => performance.now(), setTimer = setTimeout, clearTimer = clearTimeout }) {
  let events = plan;
  let index = 0;
  let elapsed = 0;
  let remaining = events[0]?.duration ?? 0;
  let startedAt = 0;
  let timer = null;
  let running = false;
  const snapshot = () => ({
    text: index ? events[index - 1].text : '',
    kind: events[index]?.kind ?? 'complete',
    alternativeStart: index ? (events[index - 1].alternativeStart ?? null) : null,
    running,
    complete: index >= events.length,
    elapsed: elapsed + (running ? Math.min(remaining, Math.max(0, now() - startedAt)) : 0),
    total: events.reduce((total, event) => total + event.duration, 0),
    index,
  });
  const emit = () => onChange(snapshot());
  function schedule() {
    startedAt = now();
    timer = setTimer(() => {
      timer = null;
      elapsed += remaining;
      index += 1;
      remaining = events[index]?.duration ?? 0;
      if (index >= events.length) running = false;
      if (running) schedule();
      emit();
    }, remaining);
  }
  function pause() {
    if (!running) return;
    const spent = Math.min(remaining, Math.max(0, now() - startedAt));
    remaining -= spent;
    elapsed += spent;
    clearTimer(timer);
    timer = null;
    running = false;
    emit();
  }
  function reset(nextPlan = events) {
    if (timer !== null) clearTimer(timer);
    events = nextPlan;
    index = 0;
    elapsed = 0;
    remaining = events[0]?.duration ?? 0;
    timer = null;
    running = false;
    emit();
  }
  function play() {
    if (running || !events.length) return;
    if (index >= events.length) reset();
    running = true;
    schedule();
    emit();
  }
  return { play, pause, reset, snapshot };
}

/** Replay only while visible, holding the completed wording between runs. */
export function createLoopingPlayback(player, { delay = 2800, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let active = false, replayTimer = null;
  function completed() {
    if (!active || replayTimer !== null) return;
    replayTimer = setTimer(() => {
      replayTimer = null;
      if (active) player.play();
    }, delay);
  }
  function setActive(value) {
    active = value;
    if (!active) {
      if (replayTimer !== null) clearTimer(replayTimer);
      replayTimer = null;
      player.pause();
    } else if (player.snapshot().complete) completed();
    else player.play();
  }
  return { setActive, completed };
}

export function mountGhoststrokeDemo(root) {
  if (!root || root.dataset.gsReady) return;
  root.dataset.gsReady = 'true';
  const find = (name) => root.querySelector(`[data-gs-${name}]`);
  const text = find('text'), status = find('status');
  const wave = find('wave'), timeline = find('timeline'), time = find('time');
  const explanation = find('explanation');
  const original = find('original'), alternative = find('alternative');
  if (original) original.textContent = PREPARED_TEXT;
  if (alternative) alternative.textContent = FALSE_START;
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const labels = { pause: 'Pause', alternative: 'Typing an alternative', consider: 'Reading the alternative', correction: 'Erasing the alternative', typing: 'Typing your original text' };
  const explanations = {
    pause: 'A pause between phrases. The original text stays intact.',
    alternative: 'The highlighted words are an alternative phrase. They are temporary.',
    consider: 'A different way to continue the thought. Next, it will be erased.',
    correction: 'Only the alternative is erased. The first sentence stays in place.',
    typing: 'Your original wording is being typed into the destination.',
  };
  let hasPlayed = false, frame = null, inView = false, pageHidden = false;
  const plan = buildTypingPlan();
  function drawProgress(state) {
    timeline.style.setProperty('--gs-progress', state.total ? state.elapsed / state.total : 0);
    time.textContent = `${(state.elapsed / 1000).toFixed(1)} / ${(state.total / 1000).toFixed(1)} s`;
  }
  function animateProgress() {
    frame = null;
    const state = player.snapshot();
    drawProgress(state);
    if (state.running) frame = window.requestAnimationFrame?.(animateProgress) ?? null;
  }
  const player = createTypingPlayer({ plan, onChange(state) {
    root.dataset.playing = String(state.running);
    root.dataset.phase = state.kind;
    const staticView = motion?.matches || !hasPlayed;
    const visibleText = staticView ? PREPARED_TEXT : state.text;
    if (!staticView && state.alternativeStart !== null && state.alternativeStart < visibleText.length) {
      const prefix = document.createElement('span');
      prefix.textContent = visibleText.slice(0, state.alternativeStart);
      const candidate = document.createElement('mark');
      candidate.textContent = visibleText.slice(state.alternativeStart);
      text.replaceChildren(prefix, candidate);
    } else text.textContent = visibleText;
    status.textContent = staticView ? 'Original text' : state.complete ? 'Original text preserved' : labels[state.kind];
    if (explanation) explanation.textContent = staticView
      ? 'An alternative is typed and erased before the original wording continues.'
      : state.complete ? 'The alternative is gone. The result matches your original text exactly.' : explanations[state.kind];
    drawProgress(state);
    if (state.running && frame === null) frame = window.requestAnimationFrame?.(animateProgress) ?? null;
    if (!state.running && frame !== null) { window.cancelAnimationFrame?.(frame); frame = null; }
    if (state.complete) loop.completed();
  } });
  const loop = createLoopingPlayback(player);
  function updatePlayback() {
    const active = inView && !document.hidden && !pageHidden && !motion?.matches;
    if (active) hasPlayed = true;
    loop.setActive(active);
  }
  document.addEventListener('visibilitychange', updatePlayback);
  window.addEventListener('pagehide', () => { pageHidden = true; updatePlayback(); });
  window.addEventListener('pageshow', () => { pageHidden = false; updatePlayback(); });
  motion?.addEventListener('change', () => {
    updatePlayback();
    if (motion.matches) { hasPlayed = false; player.reset(); }
  });
  drawActivityWave(wave, plan);
  player.reset();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { inView = entries[0]?.isIntersecting ?? false; updatePlayback(); }, { threshold: 0 }).observe(root);
  } else { inView = true; updatePlayback(); }
  return player;
}

if (typeof document !== 'undefined') mountGhoststrokeDemo(document.querySelector('[data-gs-demo]'));
