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
