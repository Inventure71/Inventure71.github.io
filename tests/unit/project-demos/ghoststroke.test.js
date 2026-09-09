import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildTypingPlan, createTypingPlayer, createLoopingPlayback, mountGhoststrokeDemo, PREPARED_TEXT, FALSE_START, PREFIX } from '../../../js/project-demos/ghoststroke.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Ghostyper browser illustration', () => {
  test('erases only the alternative, retaining the first sentence and the exact original result', () => {
    const plan = buildTypingPlan();
    const considered = plan.find(event => event.kind === 'consider');
    expect(considered.text).toBe(PREFIX + FALSE_START);
    expect(considered.alternativeStart).toBe(PREFIX.length);
    expect(considered.duration).toBeGreaterThanOrEqual(1800);
    const corrections = plan.filter(event => event.kind === 'correction');
    expect(corrections.every(event => event.text.startsWith(PREFIX))).toBe(true);
    expect(corrections.at(-1).text).toBe(PREFIX);
    expect(plan.at(-1).text).toBe(PREPARED_TEXT);
    expect(plan.filter(event => event.kind === 'typing').every(event => PREPARED_TEXT.startsWith(event.text))).toBe(true);
  });

  test('switching off the false start produces only the original text, including unicode', () => {
    const source = 'An idea 🌱 — prêt.';
    const plan = buildTypingPlan({ mistakes: false, source });
    expect(plan.some((event) => ['alternative', 'consider', 'correction'].includes(event.kind))).toBe(false);
    expect(plan.at(-1).text).toBe(source);
    expect(plan.filter((event) => event.kind === 'typing').every((event) => source.startsWith(event.text))).toBe(true);
  });

  test('cadence changes event timing while retaining the same final text and phases', () => {
    const quick = buildTypingPlan({ profile: 'quick' });
    const slow = buildTypingPlan({ profile: 'deliberate' });
    expect(quick.map(({ text, kind }) => [text, kind])).toEqual(slow.map(({ text, kind }) => [text, kind]));
    expect(quick.every((event, index) => event.kind === 'consider' ? event.duration === slow[index].duration : event.duration < slow[index].duration)).toBe(true);
    expect(buildTypingPlan({ profile: 'missing' })).toEqual(buildTypingPlan());
  });

  test('pause freezes emission and resume uses only the remaining part of the current delay', () => {
    const player = createTypingPlayer({ plan: [{ text: 'A', kind: 'typing', duration: 1000 }], now: () => Date.now() });
    player.play();
    vi.advanceTimersByTime(350);
    player.pause();
    expect(player.snapshot()).toMatchObject({ text: '', running: false, elapsed: 350 });
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    player.play();
    vi.advanceTimersByTime(649);
    expect(player.snapshot().text).toBe('');
    vi.advanceTimersByTime(1);
    expect(player.snapshot()).toMatchObject({ text: 'A', complete: true, running: false, elapsed: 1000 });
  });

  test('replay and a new profile cancel the old timer and never interleave two plans', () => {
    const player = createTypingPlayer({ plan: buildTypingPlan(), now: () => Date.now() });
    player.play();
    player.play();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2000);
    player.reset(buildTypingPlan({ source: 'A new plan.', mistakes: false }));
    expect(vi.getTimerCount()).toBe(0);
    player.play();
    vi.runAllTimers();
    expect(player.snapshot()).toMatchObject({ text: 'A new plan.', complete: true, running: false });
    player.play();
    expect(player.snapshot()).toMatchObject({ text: '', complete: false, running: true });
    expect(vi.getTimerCount()).toBe(1);
  });

  test('completes at exactly the duration represented by the timeline and releases its timer', () => {
    const plan = buildTypingPlan();
    const changes = [];
    const player = createTypingPlayer({ plan, now: () => Date.now(), onChange: (state) => changes.push(state) });
    player.play();
    vi.runAllTimers();
    const result = player.snapshot();
    expect(result.elapsed).toBe(result.total);
    expect(result.text).toBe(PREPARED_TEXT);
    expect(changes.some((state) => state.kind === 'correction')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('holds the completed text, loops once, and cancels replay when hidden', () => {
    let loop;
    const player = createTypingPlayer({ plan: [{ text:'Done',kind:'typing',duration:100 }], now:()=>Date.now(), onChange:state=>{ if(state.complete) loop.completed(); } });
    loop = createLoopingPlayback(player, { delay:1000 });
    loop.setActive(true);
    vi.advanceTimersByTime(100);
    expect(player.snapshot()).toMatchObject({text:'Done',complete:true});
    loop.setActive(true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(999);
    expect(player.snapshot().text).toBe('Done');
    vi.advanceTimersByTime(1);
    expect(player.snapshot()).toMatchObject({text:'',running:true,complete:false});
    vi.advanceTimersByTime(100);
    loop.setActive(false);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(player.snapshot().text).toBe('Done');
    loop.setActive(true);
    vi.advanceTimersByTime(1000);
    expect(player.snapshot().running).toBe(true);
    loop.setActive(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  test('autoplays only in view, resumes when visible, and stays static with reduced motion', () => {
    const node = () => ({ dataset: {}, textContent: '', style: { setProperty: vi.fn() }, events: {},
      addEventListener(name, callback) { this.events[name] = callback; }, setAttribute() {}, append() {}, replaceChildren() {} });
    const nodes = Object.fromEntries(['text', 'status', 'wave', 'timeline', 'time', 'explanation'].map(key => [key,node()]));
    const doc = { hidden:false, events:{}, addEventListener(name,callback) { this.events[name]=callback; }, createDocumentFragment:node, createElementNS:node, createElement:node };
    let intersect;
    const Observer = class { constructor(callback) { intersect=callback; } observe() {} };
    const motion = { matches:false, addEventListener(name,callback) { this.change=callback; } };
    vi.stubGlobal('document',doc);
    vi.stubGlobal('IntersectionObserver',Observer);
    vi.stubGlobal('window',{IntersectionObserver:Observer, addEventListener(){}, matchMedia:()=>motion});
    const root={dataset:{},querySelector:selector=>nodes[selector.slice(9,-1)]};
    const player=mountGhoststrokeDemo(root);
    expect(player.snapshot().running).toBe(false);
    intersect([{isIntersecting:true}]);
    expect(player.snapshot().running).toBe(true);
    vi.advanceTimersByTime(100);
    intersect([{isIntersecting:false}]);
    expect(vi.getTimerCount()).toBe(0);
    intersect([{isIntersecting:true}]);
    expect(player.snapshot().running).toBe(true);
    doc.hidden=true; doc.events.visibilitychange();
    expect(vi.getTimerCount()).toBe(0);
    doc.hidden=false; doc.events.visibilitychange();
    expect(player.snapshot().running).toBe(true);
    motion.matches=true; motion.change();
    expect(vi.getTimerCount()).toBe(0);
    expect(nodes.text.textContent).toBe(PREPARED_TEXT);
    intersect([{isIntersecting:true}]);
    expect(player.snapshot().running).toBe(false);
    motion.matches=false; motion.change();
    expect(player.snapshot().running).toBe(true);
    intersect([{isIntersecting:false}]);
  });
});
