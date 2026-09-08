export const navItems = [
  { key: 'home', label: 'Home', href: '/index.html' },
  { key: 'projects', label: 'Projects', href: '/projects.html' },
  { key: 'apps', label: 'Apps', href: '/apps.html' },
  { key: 'resume', label: 'Resume', href: '/resume.html' },
  { key: 'contact', label: 'Contact', href: '/contact.html' },
];

export const projectCommandItems = [
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
    description: 'Music controlled with gestures',
    href: '/project_details/project-holovinyl.html',
    keywords: 'holovinyl computer vision gesture music python interaction',
  },
  {
    label: 'Dr Sorriso Donations',
    description: 'Donation record classification',
    href: '/project_details/project-drsorrisodonations.html',
    keywords: 'dr sorriso donations donor crm analytics python',
  },
  {
    label: 'VictorIA',
    description: 'A robot that plays Connect Four',
    href: '/project_details/project-victoria.html',
    keywords: 'victoria ai game computer vision robotics sandbox',
  },
  {
    label: 'ReminderZ / Project Loom',
    description: 'Connected notes and reminders',
    href: '/project_details/project-remainder-v0.html',
    keywords: 'reminderz reminderproject remainder project loom context weaving knowledge workflow',
  },
  {
    label: 'ClipClop',
    description: 'Shared clipboard for Mac and Android',
    href: '/project_details/project-clipclop.html',
    keywords: 'clipclop clipboard android macos productivity',
  },
  {
    label: 'Evolve Project',
    description: 'Agent that writes and loads its own tools',
    href: '/project_details/project-evolveproject.html',
    keywords: 'evolveproject python gemini ollama agents dynamic tools shell',
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
  {
    label: 'Noty',
    description: 'Notes attached to your Mac windows',
    href: '/project_details/project-noty.html',
    keywords: 'noty macos notes markdown appkit swift local first attachments',
  },
  {
    label: 'PaddockJS',
    description: 'F1 simulation toolkit and headless environment',
    href: '/project_details/project-paddockjs.html',
    keywords: 'paddockjs f1 simulator pixijs javascript headless environment npm',
  },
  {
    label: 'Dream2Detect',
    description: 'Synthetic-to-real package damage research',
    href: '/project_details/project-dream2detect.html',
    keywords: 'dream2detect computer vision synthetic data pytorch package damage',
  },
  {
    label: 'VIGIL',
    description: 'Robot fleet operations and guided recovery',
    href: '/project_details/project-vigil.html',
    keywords: 'vigil robotics fleet monitoring ros fastapi recovery',
  },
  {
    label: 'ContextKey',
    description: 'Experimental local macOS autocomplete',
    href: '/project_details/project-contextkey.html',
    keywords: 'contextkey macos autocomplete local mlx accessibility ocr appkit',
  },
  {
    label: 'Project Unity',
    description: 'Low-latency control across macOS and Windows',
    href: '/project_details/project-unity.html',
    keywords: 'project unity macos windows input control networking udp security low latency',
  },
  {
    label: 'MattyFlow',
    description: 'Dictation and rewriting on your Mac',
    href: '/project_details/project-mattyflow.html',
    keywords: 'mattyflow localflow macos dictation speech mlx gemma swift python local first',
  },
  {
    label: 'Mosaic',
    description: 'Distributed ROS 2 robot fleet control',
    href: '/project_details/project-mosaic.html',
    keywords: 'mosaic swarm ros2 robotics fleet optitrack udp autonomy distributed systems',
  },
  {
    label: 'TCGNET',
    description: 'PostgreSQL-backed card collection marketplace',
    href: '/project_details/project-databases-ie.html',
    keywords: 'tcgnet databases project ie django postgresql cards marketplace inventory sql database',
  },
  {
    label: 'Ghoststroke',
    description: 'Prepared text typed at your own pace',
    href: '/project_details/project-ghoststroke.html',
    keywords: 'ghoststroke macos swift accessibility typing automation cadence profiles keyboard',
  },
];

export const footerLinks = [
  { label: 'GitHub', href: 'https://github.com/Inventure71', external: true },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/matteo-giorgetti-026172247/', external: true },
  { label: 'Resume PDF', href: '/assets/docs/matteo-giorgetti-resume-current.pdf', external: false },
];

export const commandItems = [
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
    href: 'https://github.com/Inventure71/ClipClop/releases/latest',
    keywords: 'app utility clipboard release download',
  },
];
