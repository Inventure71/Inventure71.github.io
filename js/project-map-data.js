import { projectCommandItems } from './playfolio/catalog.js';

const projectTopics = [
        {
            id: 'budget-buddy',
            url: 'project_details/project-budget-buddy.html',
            tags: ['Python', 'AI Agents', 'Financial Planning', 'Data Systems', 'Web/API']
        },
        {
            id: 'neural-noir',
            url: 'project_details/project-neural-noir.html',
            tags: ['Generative AI', 'Procedural Storytelling', 'Unreal Engine', 'Games', 'Python']
        },
        {
            id: 'holovinyl',
            url: 'project_details/project-holovinyl.html',
            tags: ['Python', 'Computer Vision', 'Gesture UI', 'Interfaces', 'Music']
        },
        {
            id: 'drsorriso',
            url: 'project_details/project-drsorrisodonations.html',
            tags: ['Python', 'Donor CRM', 'Analytics', 'Data Systems', 'Web/API']
        },
        {
            id: 'victoria',
            url: 'project_details/project-victoria.html',
            tags: ['Python', 'Game AI', 'Computer Vision', 'Robotics', 'Physical Computing']
        },
        {
            id: 'remainder',
            url: 'project_details/project-remainder-v0.html',
            tags: ['Python', 'AI Agents', 'Notes', 'Productivity', 'Web/API']
        },
        {
            id: 'clipclop',
            url: 'project_details/project-clipclop.html',
            tags: ['Python', 'Android', 'macOS', 'Productivity', 'Local-First Tools']
        },
        {
            id: 'evolve',
            url: 'project_details/project-evolveproject.html',
            tags: ['Python', 'AI Agents', 'Gemini', 'Ollama', 'Developer Tools']
        },
        {
            id: 'algorithms-project',
            url: 'project_details/project-algorithms-project.html',
            tags: ['Python', 'Pygame', 'Games', 'Game AI', 'Algorithms', 'Pathfinding']
        },
        {
            id: 'core-conflict',
            url: 'project_details/project-gengame.html',
            tags: ['Python', 'AI Agents', 'Generative AI', 'Games', 'Multiplayer', 'Web/API']
        },
        {
            id: 'noty',
            url: 'project_details/project-noty.html',
            tags: ['Swift', 'macOS', 'AppKit', 'Markdown', 'Local-First Tools', 'Productivity']
        },
        {
            id: 'paddockjs',
            url: 'project_details/project-paddockjs.html',
            tags: ['JavaScript', 'PixiJS', 'Simulation', 'Web/API', 'Developer Tools', 'Games']
        },
        {
            id: 'dream2detect',
            url: 'project_details/project-dream2detect.html',
            tags: ['Python', 'Computer Vision', 'PyTorch', 'Synthetic Data', 'Machine Learning', 'Research']
        },
        {
            id: 'vigil',
            url: 'project_details/project-vigil.html',
            tags: ['Python', 'Robotics', 'ROS', 'FastAPI', 'Operations', 'Web/API']
        },
        {
            id: 'contextkey',
            url: 'project_details/project-contextkey.html',
            tags: ['Swift', 'macOS', 'MLX', 'Accessibility', 'OCR', 'Local-First Tools']
        },
        {
            id: 'project-unity',
            url: 'project_details/project-unity.html',
            tags: ['Swift', 'C++', 'macOS', 'Windows', 'Networking', 'Security', 'Systems']
        },
        {
            id: 'mattyflow',
            url: 'project_details/project-mattyflow.html',
            tags: ['Swift', 'Python', 'macOS', 'MLX', 'Speech', 'FastAPI', 'Local-First Tools']
        },
        {
            id: 'mosaic',
            url: 'project_details/project-mosaic.html',
            tags: ['Python', 'ROS', 'Robotics', 'Distributed Systems', 'UDP', 'Autonomy']
        },
        {
            id: 'databases-ie',
            url: 'project_details/project-databases-ie.html',
            tags: ['Python', 'Django', 'PostgreSQL', 'Databases', 'Data Systems', 'Web/API']
        },
        {
            id: 'ghoststroke',
            url: 'project_details/project-ghoststroke.html',
            tags: ['Swift', 'macOS', 'Accessibility', 'Core Graphics', 'Automation', 'Productivity', 'Local-First Tools']
        }
];

const catalogByHref = new Map(projectCommandItems.map((project) => [project.href, project]));

export const projectMapItems = projectTopics.map((topic) => {
  const project = catalogByHref.get(`/${topic.url}`);
  if (!project) throw new Error(`Project map entry missing from catalog: ${topic.url}`);
  return { ...topic, title: project.label, desc: project.description };
});
