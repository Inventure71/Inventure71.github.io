(function () {
  const navItems = [
    { key: 'home', label: 'Home', href: '/index.html' },
    { key: 'projects', label: 'Projects', href: '/projects.html' },
    { key: 'apps', label: 'Apps', href: '/apps.html' },
    { key: 'resume', label: 'Resume', href: '/resume.html' },
    { key: 'contact', label: 'Contact', href: '/contact.html' },
  ];

  const projectCommandItems = [
    {
      label: 'Budget Buddy',
      description: 'AI finance coach',
      href: '/project_details/project-budget-buddy.html',
      keywords: 'budget buddy finance chatbot financial planning ai agents',
    },
    {
      label: 'Neural Noir',
      description: 'Interactive story engine',
      href: '/project_details/project-neural-noir.html',
      keywords: 'neural noir detective procedural storytelling unreal engine ai game',
    },
    {
      label: 'HoloVinyl',
      description: 'Touchless vision control deck',
      href: '/project_details/project-holovinyl.html',
      keywords: 'holovinyl computer vision gesture music python interaction',
    },
    {
      label: 'DrSorrisoDonations',
      description: 'Donation intelligence platform',
      href: '/project_details/project-drsorrisodonations.html',
      keywords: 'dr sorriso donations donor crm analytics python',
    },
    {
      label: 'VictorIA',
      description: 'Multi-domain AI sandbox',
      href: '/project_details/project-victoria.html',
      keywords: 'victoria ai game computer vision robotics sandbox',
    },
    {
      label: 'ReminderZ / Project Loom',
      description: 'AI context weaving platform',
      href: '/project_details/project-remainder-v0.html',
      keywords: 'reminderz reminderproject remainder project loom context weaving knowledge workflow',
    },
    {
      label: 'ClipClop',
      description: 'Cross-device clipboard intelligence',
      href: '/project_details/project-clipclop.html',
      keywords: 'clipclop clipboard android macos productivity',
    },
    {
      label: 'EvolveProject',
      description: 'AI card generation backend',
      href: '/project_details/project-evolveproject.html',
      keywords: 'evolveproject generative ai unreal engine card generation',
    },
    {
      label: 'Clash Royale In Python',
      description: 'Algorithmic strategy game engine',
      href: '/project_details/project-algorithms-project.html',
      keywords: 'clash royale python pygame algorithms bfs pathfinding complexity',
    },
    {
      label: 'Core Conflict',
      description: 'AI-assisted multiplayer game prototype',
      href: '/project_details/project-gengame.html',
      keywords: 'core conflict gengame multiplayer networking ai game',
    },
  ];

  const commandItems = [
    ...navItems.map((item) => ({
      label: item.label,
      description: item.key === 'home' ? 'Main page' : `Open ${item.label.toLowerCase()}`,
      href: item.href,
      keywords: item.key,
    })),
    {
      label: 'Project map',
      description: 'Tag relationship view',
      href: '/tags.html',
      keywords: 'tags tag map neural network project relationships',
    },
    ...projectCommandItems,
    {
      label: 'Resume PDF',
      description: 'Download current resume',
      href: '/assets/docs/matteo-giorgetti-resume-current.pdf',
      keywords: 'cv pdf download',
    },
    {
      label: 'GitHub',
      description: 'Open Inventure71 profile',
      href: 'https://github.com/Inventure71',
      keywords: 'code repositories profile external',
    },
    {
      label: 'LinkedIn',
      description: 'Open professional profile',
      href: 'https://www.linkedin.com/in/matteo-giorgetti-026172247/',
      keywords: 'profile contact professional external',
    },
    {
      label: 'Download ClipClop',
      description: 'Open latest ClipClop release',
      href: 'https://github.com/Inventure71/ClipClop/releases/tag/beta.2',
      keywords: 'app utility clipboard release download',
    },
    {
      label: 'Download TypeCraft',
      description: 'Open TypeCraft release',
      href: 'https://github.com/Inventure71/TypeCraft/releases/tag/Stable',
      keywords: 'app utility typing practice release download',
    },
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currentNavKey() {
    const path = window.location.pathname;
    if (path.includes('/project_details/') || path.endsWith('/projects.html') || path.endsWith('/tags.html')) {
      return 'projects';
    }
    const match = path.match(/\/([^/]+)\.html$/);
    return match ? match[1].replace('index', 'home') : 'home';
  }

  function renderSharedNavbar() {
    const navbar = document.querySelector('.playfolio-page .navbar');
    if (!navbar) return;

    const activeKey = navbar.dataset.activePage || currentNavKey();
    navbar.className = 'navbar navbar-expand-lg';
    navbar.innerHTML = `
      <div class="container">
        <a class="navbar-brand" href="/index.html">MG</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
          aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <div class="ms-auto d-flex align-items-center flex-column flex-lg-row gap-2">
            <ul class="navbar-nav mb-2 mb-lg-0 text-center text-lg-start">
              ${navItems.map((item) => `
                <li class="nav-item">
                  <a class="nav-link${item.key === activeKey ? ' active' : ''}" href="${item.href}">${item.label}</a>
                </li>
              `).join('')}
            </ul>
            <div class="d-flex gap-2">
              <button class="pf-icon-button" type="button" data-command-open aria-label="Open command menu">
                <i class="bi bi-command"></i>
              </button>
              <button class="theme-toggle-btn" type="button" data-theme-toggle aria-label="Toggle color scheme">
                <i class="bi bi-moon"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.MGTheme) {
      window.MGTheme.sync();
    }
  }

  const isTypingTarget = (element) => {
    if (!element) return false;
    const tag = element.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable;
  };

  function setupReveals() {
    const revealItems = document.querySelectorAll('.pf-reveal');
    if (!revealItems.length) return;

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((item) => observer.observe(item));
  }

  function readProjectData(element) {
    return {
      title: element.dataset.title || element.querySelector('.pf-project-name, .pf-row-title')?.textContent || '',
      type: element.dataset.type || '',
      summary: element.dataset.summary || element.querySelector('.pf-row-summary')?.textContent || '',
      stack: element.dataset.stack || '',
      status: element.dataset.status || '',
      year: element.dataset.year || '',
      href: element.dataset.href || element.getAttribute('href') || '#',
      image: element.dataset.image || '',
      fallback: element.dataset.fallback || element.dataset.title || '',
    };
  }

  function setImage(container, image, fallback) {
    if (!container) return;
    const img = container.querySelector('img');
    container.dataset.fallback = fallback || '';
    container.classList.toggle('has-image', Boolean(image));
    if (!img) return;
    if (image) {
      img.src = image;
      img.alt = `${fallback} preview`;
    } else {
      img.removeAttribute('src');
      img.alt = '';
    }
  }

  function setupProjectPreview() {
    const cards = Array.from(document.querySelectorAll('[data-project-card]'));
    const preview = document.querySelector('[data-project-preview]');
    if (!cards.length || !preview) return;

    const fields = {
      kicker: preview.querySelector('[data-preview-kicker]'),
      title: preview.querySelector('[data-preview-title]'),
      summary: preview.querySelector('[data-preview-summary]'),
      stack: preview.querySelector('[data-preview-stack]'),
      link: preview.querySelector('[data-preview-link]'),
      media: preview.querySelector('[data-preview-media]'),
    };

    const activate = (card) => {
      cards.forEach((item) => {
        const active = item === card;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      const data = readProjectData(card);
      if (fields.kicker) fields.kicker.textContent = data.type || data.status || 'Selected project';
      if (fields.title) fields.title.textContent = data.title;
      if (fields.summary) fields.summary.textContent = data.summary;
      if (fields.stack) fields.stack.textContent = data.stack;
      if (fields.link) fields.link.href = data.href;
      setImage(fields.media, data.image, data.fallback || data.title);
    };

    cards.forEach((card) => {
      card.addEventListener('pointerenter', () => activate(card));
      card.addEventListener('focus', () => activate(card));
      card.addEventListener('click', () => activate(card));
    });

    activate(cards.find((card) => card.classList.contains('is-active')) || cards[0]);
  }

  function setupProjectExplorer() {
    const rows = Array.from(document.querySelectorAll('[data-project-row]'));
    const filters = Array.from(document.querySelectorAll('[data-project-filter]'));
    const nodes = Array.from(document.querySelectorAll('[data-project-node]'));
    const inspector = document.querySelector('[data-project-inspector]');
    if (!rows.length || !inspector) return;

    const fields = {
      title: inspector.querySelector('[data-inspector-title]'),
      summary: inspector.querySelector('[data-inspector-summary]'),
      type: inspector.querySelector('[data-inspector-type]'),
      stack: inspector.querySelector('[data-inspector-stack]'),
      status: inspector.querySelector('[data-inspector-status]'),
      year: inspector.querySelector('[data-inspector-year]'),
      link: inspector.querySelector('[data-inspector-link]'),
      media: inspector.querySelector('[data-inspector-media]'),
    };

    const activate = (row) => {
      rows.forEach((item) => {
        const active = item === row;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      nodes.forEach((node) => {
        node.classList.toggle('is-active', node.dataset.target === row.dataset.projectId);
      });

      const data = readProjectData(row);
      if (fields.title) fields.title.textContent = data.title;
      if (fields.summary) fields.summary.textContent = data.summary;
      if (fields.type) fields.type.textContent = data.type || 'Project';
      if (fields.stack) fields.stack.textContent = data.stack || 'Mixed stack';
      if (fields.status) fields.status.textContent = data.status || 'Built';
      if (fields.year) fields.year.textContent = data.year || '2026';
      if (fields.link) fields.link.href = data.href;
      setImage(fields.media, data.image, data.fallback || data.title);
    };

    const applyFilter = (filter) => {
      filters.forEach((button) => {
        const active = button.dataset.projectFilter === filter;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      let firstVisible = null;
      rows.forEach((row) => {
        const tags = (row.dataset.tags || '').split(',').map((tag) => tag.trim());
        const visible = filter === 'all' || tags.includes(filter);
        row.hidden = !visible;
        if (visible && !firstVisible) firstVisible = row;
      });

      nodes.forEach((node) => {
        const target = rows.find((row) => row.dataset.projectId === node.dataset.target);
        node.hidden = target ? target.hidden : false;
      });

      if (firstVisible) activate(firstVisible);
    };

    rows.forEach((row) => {
      row.addEventListener('pointerenter', () => {
        if (!row.hidden) activate(row);
      });
      row.addEventListener('focus', () => {
        if (!row.hidden) activate(row);
      });
      row.addEventListener('click', () => activate(row));
    });

    nodes.forEach((node) => {
      node.addEventListener('click', () => {
        const row = rows.find((item) => item.dataset.projectId === node.dataset.target);
        if (row && !row.hidden) {
          activate(row);
          row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    });

    filters.forEach((button) => {
      button.addEventListener('click', () => applyFilter(button.dataset.projectFilter || 'all'));
    });

    activate(rows.find((row) => row.classList.contains('is-active')) || rows[0]);
  }

  function setupCommandPalette() {
    let overlay = document.querySelector('[data-command-palette]');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'pf-command-overlay';
      overlay.dataset.commandPalette = '';
      overlay.hidden = true;
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="pf-command" role="dialog" aria-modal="true" aria-label="Command menu">
        <input class="pf-command-input" type="search" placeholder="Jump to..." data-command-input />
        <div class="pf-command-list">
          ${commandItems.map((item) => `
            <button class="pf-command-item" type="button" data-command-item
              data-href="${escapeHtml(item.href)}"
              data-keywords="${escapeHtml(item.keywords || '')}">
              <strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.description)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const openers = document.querySelectorAll('[data-command-open]');
    const input = overlay.querySelector('[data-command-input]');
    const items = Array.from(overlay.querySelectorAll('[data-command-item]'));

    const close = () => {
      overlay.hidden = true;
      input.value = '';
      items.forEach((item) => {
        item.hidden = false;
        item.classList.remove('is-selected');
      });
    };

    const open = () => {
      overlay.hidden = false;
      items.forEach((item) => {
        item.hidden = false;
        item.classList.remove('is-selected');
      });
      if (items[0]) items[0].classList.add('is-selected');
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    };

    const runItem = (item) => {
      const href = item.dataset.href;
      if (href) window.location.href = href;
    };

    const visibleItems = () => items.filter((item) => !item.hidden);

    const selectItem = (item) => {
      if (!item) return;
      items.forEach((candidate) => candidate.classList.toggle('is-selected', candidate === item));
      item.scrollIntoView({ block: 'nearest' });
    };

    openers.forEach((button) => button.addEventListener('click', open));

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });

    items.forEach((item) => {
      item.addEventListener('click', () => runItem(item));
    });

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      items.forEach((item) => {
        const haystack = `${item.textContent} ${item.dataset.keywords || ''}`.toLowerCase();
        item.hidden = Boolean(query) && !haystack.includes(query);
      });
      selectItem(visibleItems()[0]);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const candidates = visibleItems();
        const selectedIndex = candidates.findIndex((item) => item.classList.contains('is-selected'));
        const offset = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = selectedIndex < 0
          ? 0
          : (selectedIndex + offset + candidates.length) % candidates.length;
        selectItem(candidates[nextIndex]);
      }

      if (event.key === 'Enter') {
        const selected = visibleItems().find((item) => item.classList.contains('is-selected')) || visibleItems()[0];
        if (selected) runItem(selected);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !overlay.hidden) {
        close();
        return;
      }

      const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const slashShortcut = (event.key === '/' || event.code === 'Slash') && !isTypingTarget(document.activeElement);
      if (commandShortcut || slashShortcut) {
        event.preventDefault();
        open();
      }
    });
  }

  function setupRaceFilters() {
    const filters = Array.from(document.querySelectorAll('[data-race-focus]'));
    if (!filters.length) return;

    const apply = (focus) => {
      filters.forEach((button) => {
        const active = button.dataset.raceFocus === focus;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      const filterTargets = [
        ...document.querySelectorAll('.f1-driver-entry'),
        ...document.querySelectorAll('.f1-car'),
      ];

      filterTargets.forEach((target) => {
        const tags = target.dataset.tags || '';
        const visible = focus === 'all' || tags.split(',').map((tag) => tag.trim()).includes(focus);
        target.classList.toggle('is-filter-dimmed', !visible);
      });
    };

    filters.forEach((button) => {
      button.addEventListener('click', () => apply(button.dataset.raceFocus || 'all'));
    });
  }

  function setupPortraitCycle() {
    const image = document.querySelector('[data-portrait-cycle]');
    if (!image) return;

    const sources = (image.dataset.cycleImages || '')
      .split(',')
      .map((source) => source.trim())
      .filter(Boolean);

    if (sources.length < 2) return;

    let index = Math.max(0, sources.indexOf(image.getAttribute('src')));

    sources.forEach((source) => {
      const preload = new Image();
      preload.src = source;
    });

    image.addEventListener('load', () => {
      image.classList.remove('is-switching');
    });

    window.setInterval(() => {
      image.classList.add('is-switching');
      window.setTimeout(() => {
        index = (index + 1) % sources.length;
        image.src = sources[index];
      }, 180);
    }, 2400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSharedNavbar();
    setupReveals();
    setupProjectPreview();
    setupProjectExplorer();
    setupCommandPalette();
    setupRaceFilters();
    setupPortraitCycle();
  });
})();
