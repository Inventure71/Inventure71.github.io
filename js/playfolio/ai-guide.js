import { navItems } from './catalog.js';
import { readProjectData } from './dom.js';

export function buildAiGuide(root = document) {
  const origin = new URL(root.baseURI).origin;
  const title = root.querySelector('.pf-title')?.textContent?.trim() || root.title.trim();
  const summary = root.querySelector('.pf-lede')?.textContent?.trim()
    || root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
    || '';
  const featuredProjects = Array.from(root.querySelectorAll('[data-project-card]'))
    .slice(0, 3)
    .map((card) => {
      const data = readProjectData(card);
      return `- ${data.title} — ${data.summary} (${new URL(data.href, origin).href})`;
    });
  const startLinks = navItems.map((item) => {
    const description = item.key === 'home'
      ? 'overview and intro'
      : item.key === 'projects'
        ? 'main project index'
        : item.key === 'apps'
          ? 'interactive experiments and apps'
          : item.key === 'resume'
            ? 'experience, skills, and background'
            : 'contact routes';
    return `- ${item.label}: ${new URL(item.href, origin).href} — ${description}`;
  });

  return [
    `Website guide: ${title}`,
    '',
    'Short intro:',
    summary,
    '',
    'How to use this site with an LLM:',
    '- Use the links below directly instead of guessing.',
    '- Prefer project detail pages for project-specific facts.',
    '- Use the resume page for background, skills, and experience claims.',
    '- If the site does not state something explicitly, say that clearly.',
    '',
    'Best starting links:',
    ...startLinks,
    '',
    ...(featuredProjects.length ? ['Featured projects to inspect first:', ...featuredProjects, ''] : []),
    'Primary contact:',
    `- ${new URL('/contact.html', origin).href}`,
  ].join('\n');
}

export async function copyTextToClipboard(text, root = document) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  const helper = root.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'absolute';
  helper.style.left = '-9999px';
  root.body.appendChild(helper);
  helper.select();

  let copied = false;
  try {
    copied = root.execCommand('copy');
  } finally {
    helper.remove();
  }

  return copied;
}

export function buildAiGuideToastMarkup() {
  return `
        <div class="pf-ai-toast-card" role="status" aria-live="polite">
          <button class="pf-ai-toast-close" type="button" data-ai-guide-toast-close aria-label="Close AI popup">
            <i class="bi bi-x-lg"></i>
          </button>
          <span class="pf-ai-toast-kicker" data-ai-guide-toast-kicker>Copied</span>
          <h2 class="pf-ai-toast-title" data-ai-guide-toast-title>Prompt ready.</h2>
          <p class="pf-ai-toast-copy" data-ai-guide-toast-copy>
            Go to your favorite AI, paste in the prompt, and add your specific request.
          </p>
          <div class="pf-ai-toast-links">
            <a class="pf-ai-link is-chatgpt" href="https://chatgpt.com" target="_blank" rel="noopener">
              <img src="/assets/brand/icons/ChatGPTIcon.webp" alt="" />
              <span>ChatGPT</span>
            </a>
            <a class="pf-ai-link is-claude" href="https://claude.ai" target="_blank" rel="noopener">
              <img src="/assets/brand/icons/ClaudeIcon.webp" alt="" />
              <span>Claude</span>
            </a>
            <a class="pf-ai-link is-deepseek" href="https://chat.deepseek.com" target="_blank" rel="noopener">
              <img src="/assets/brand/icons/DeepSeek.webp" alt="" />
              <span>DeepSeek</span>
            </a>
          </div>
        </div>
      `;
}

export function setupAiGuideCopy(root = document) {
  const buttons = Array.from(root.querySelectorAll('[data-ai-guide-copy]'));
  let toast = root.querySelector('[data-ai-guide-toast]');
  if (!buttons.length) return;

  let toastKicker = null;
  let toastTitle = null;
  let toastCopy = null;
  let closeButton = null;
  let closeBound = false;
  let resetTimer = 0;

  const ensureToast = () => {
    if (!toast) {
      toast = root.createElement('div');
      toast.className = 'pf-ai-toast';
      toast.dataset.aiGuideToast = '';
      toast.hidden = true;
      toast.innerHTML = buildAiGuideToastMarkup();
      root.body.appendChild(toast);
    }

    toastKicker = toast.querySelector('[data-ai-guide-toast-kicker]');
    toastTitle = toast.querySelector('[data-ai-guide-toast-title]');
    toastCopy = toast.querySelector('[data-ai-guide-toast-copy]');
    closeButton = toast.querySelector('[data-ai-guide-toast-close]');

    if (closeButton && !closeBound) {
      closeButton.addEventListener('click', hideToast);
      closeBound = true;
    }

    return toast;
  };

  const showToast = ({ kicker, title, copy, state }) => {
    ensureToast();
    if (toastKicker) toastKicker.textContent = kicker;
    if (toastTitle) toastTitle.textContent = title;
    if (toastCopy) toastCopy.textContent = copy;
    toast.dataset.state = state;
    toast.hidden = false;

    window.requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });
  };

  const hideToast = () => {
    if (!toast) return;
    window.clearTimeout(resetTimer);
    toast.classList.remove('is-visible');
    window.setTimeout(() => {
      if (!toast.classList.contains('is-visible')) {
        toast.hidden = true;
      }
    }, 220);
  };

  buttons.forEach((button) => button.addEventListener('click', async () => {
    hideToast();
    button.disabled = true;

    try {
      const copied = await copyTextToClipboard(buildAiGuide(root), root);
      if (!copied) throw new Error('Copy command was rejected.');
      showToast({
        kicker: 'Copied',
        title: 'Prompt ready.',
        copy: 'Go to your favorite AI, paste in the prompt, and add your specific request.',
        state: 'success',
      });
    } catch (error) {
      console.error(error);
      showToast({
        kicker: 'Clipboard issue',
        title: 'Copy did not work.',
        copy: 'Your browser blocked automatic copying, so the Ask AI prompt was not copied.',
        state: 'error',
      });
    } finally {
      button.disabled = false;
      resetTimer = window.setTimeout(() => {
        hideToast();
      }, 8000);
    }
  }));
}
