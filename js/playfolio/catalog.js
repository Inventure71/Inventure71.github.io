import { projects } from './project-catalog.js';

export const navItems = [
  { key: 'home', label: 'Home', href: '/index.html' },
  { key: 'projects', label: 'Projects', href: '/projects.html' },
  { key: 'apps', label: 'Apps', href: '/apps.html' },
  { key: 'resume', label: 'Resume', href: '/resume.html' },
  { key: 'contact', label: 'Contact', href: '/contact.html' },
];

export const projectCommandItems = projects.map(({ label, description, href, tags, stack }) => ({
  label, description, href,
  keywords: `${label} ${tags.join(' ')} ${stack}`,
}));

export const footerLinks = [
  { label: 'GitHub', href: 'https://github.com/Inventure71', external: true },
  { label: 'University GitHub', href: 'https://github.com/Inventure72', external: true },
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
    label: 'University GitHub',
    description: 'Open coursework on Inventure72',
    href: 'https://github.com/Inventure72',
    keywords: 'university coursework assignments school code repositories external',
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
