// Reviewed public project facts. Priority is editorial order, not a simulation stat.
// This catalog owns project classifications across discovery, resume and races.
export const ROLE_OPTIONS = [
  {
    "id": "all",
    "label": "All roles"
  },
  {
    "id": "software-engineering",
    "label": "Software engineering"
  },
  {
    "id": "ai-ml",
    "label": "AI / ML"
  },
  {
    "id": "robotics",
    "label": "Robotics"
  },
  {
    "id": "native-apps",
    "label": "Native apps"
  }
];

export const SERIES = [
  {
    "id": "F1",
    "label": "F1",
    "description": "Refined projects",
    "logo": "/dist/f1-simulator/assets/f1Logo.png"
  },
  {
    "id": "F2",
    "label": "F2",
    "description": "Prototypes & explorations",
    "logo": "/assets/brand/racing/f2-logo.svg"
  },
  {
    "id": "F3",
    "label": "F3",
    "description": "Focused work & studies",
    "logo": "/assets/brand/racing/f3-logo.svg"
  }
];

export const projects = [
  {
    "id": "noty",
    "raceId": "noty",
    "label": "Noty",
    "description": "Notes that stay attached to your Mac windows.",
    "href": "/project_details/project-noty.html",
    "roles": [
      "software-engineering",
      "native-apps",
      "ai-ml"
    ],
    "tags": [
      "Swift",
      "macOS",
      "AppKit",
      "Markdown",
      "Local-First Tools",
      "Productivity"
    ],
    "stack": "Swift · SwiftUI · AppKit · SQLite",
    "dates": "2026",
    "status": "macOS application",
    "tier": "F1",
    "priority": 1
  },
  {
    "id": "paddockjs",
    "raceId": "paddockjs",
    "label": "PaddockJS",
    "description": "A reusable racing simulation for browsers and headless experiments.",
    "href": "/project_details/project-paddockjs.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "JavaScript",
      "PixiJS",
      "Simulation",
      "Web/API",
      "Developer Tools",
      "Games"
    ],
    "stack": "JavaScript · PixiJS",
    "dates": "2026",
    "status": "Open-source package",
    "tier": "F1",
    "priority": 2
  },
  {
    "id": "dream2detect",
    "raceId": "dream2detect",
    "label": "Dream2Detect",
    "description": "Learning package-damage assessment from synthetic images.",
    "href": "/project_details/project-dream2detect.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "Computer Vision",
      "PyTorch",
      "Synthetic Data",
      "Machine Learning",
      "Research"
    ],
    "stack": "Python · PyTorch · Computer vision",
    "dates": "2026",
    "status": "Research study",
    "tier": "F1",
    "priority": 3
  },
  {
    "id": "whos-on-repeat",
    "raceId": "whos-on-repeat",
    "label": "Who’s On Repeat",
    "description": "A multiplayer music game with shared rooms and an offline demo.",
    "href": "/project_details/project-whos-on-repeat.html",
    "roles": [
      "software-engineering"
    ],
    "tags": [
      "Python",
      "JavaScript",
      "Databases",
      "Web/API",
      "Games",
      "Multiplayer",
      "Music"
    ],
    "stack": "Python · SQLite · JavaScript",
    "dates": "2026",
    "status": "Course project",
    "tier": "F1",
    "priority": 4
  },
  {
    "id": "ghostyper",
    "raceId": "ghoststroke",
    "label": "Ghostyper",
    "description": "Prepared text typed with custom pace, pauses and corrections.",
    "href": "/project_details/project-ghoststroke.html",
    "roles": [
      "software-engineering",
      "native-apps",
      "ai-ml"
    ],
    "tags": [
      "Swift",
      "macOS",
      "Accessibility",
      "Core Graphics",
      "Automation",
      "Productivity",
      "Local-First Tools"
    ],
    "stack": "Swift · AppKit · Accessibility · MLX",
    "dates": "2026",
    "status": "macOS application",
    "tier": "F1",
    "priority": 5
  },
  {
    "id": "clipclop",
    "raceId": "clipclop",
    "label": "ClipClop",
    "description": "Share text and images between a Mac and Android phone.",
    "href": "/project_details/project-clipclop.html",
    "roles": [
      "software-engineering",
      "native-apps"
    ],
    "tags": [
      "Python",
      "Android",
      "macOS",
      "Productivity",
      "Local-First Tools"
    ],
    "stack": "Python · Java · TCP · AES-GCM",
    "dates": "2025–2026",
    "status": "Working prototype",
    "tier": "F1",
    "priority": 6
  },
  {
    "id": "vigil",
    "raceId": "vigil",
    "label": "VIGIL",
    "description": "Robot fleet monitoring, remote terminals and guided recovery.",
    "href": "/project_details/project-vigil.html",
    "roles": [
      "software-engineering",
      "robotics"
    ],
    "tags": [
      "Python",
      "Robotics",
      "ROS",
      "FastAPI",
      "Operations",
      "Web/API"
    ],
    "stack": "Python · FastAPI · Paramiko · ROS",
    "dates": "2026",
    "status": "Lab platform",
    "tier": "F1",
    "priority": 7
  },
  {
    "id": "victoria",
    "raceId": "victoria",
    "label": "VictorIA",
    "description": "A robot arm that reads a board and plays Connect Four.",
    "href": "/project_details/project-victoria.html",
    "roles": [
      "software-engineering",
      "robotics",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "Game AI",
      "Computer Vision",
      "Robotics",
      "Physical Computing"
    ],
    "stack": "Python · OpenCV · SAM 2 · ROS",
    "dates": "2025",
    "status": "Robotics prototype",
    "tier": "F1",
    "priority": 8
  },
  {
    "id": "neural-noir",
    "raceId": "noir",
    "label": "Neural Noir",
    "description": "A detective game with generated cases and suspect dialogue.",
    "href": "/project_details/project-neural-noir.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Generative AI",
      "Procedural Storytelling",
      "Unreal Engine",
      "Games",
      "Python"
    ],
    "stack": "Unreal Engine 5 · Python · Gemini",
    "dates": "2024",
    "status": "Game prototype",
    "tier": "F1",
    "priority": 9
  },
  {
    "id": "mattyflow",
    "raceId": "mattyflow",
    "label": "MattyFlow",
    "description": "Local dictation and optional rewriting into the current app.",
    "href": "/project_details/project-mattyflow.html",
    "roles": [
      "software-engineering",
      "native-apps",
      "ai-ml"
    ],
    "tags": [
      "Swift",
      "Python",
      "macOS",
      "MLX",
      "Speech",
      "FastAPI",
      "Local-First Tools"
    ],
    "stack": "Swift · AppKit · Python · FastAPI · MLX",
    "dates": "2026",
    "status": "macOS prototype",
    "tier": "F1",
    "priority": 10
  },
  {
    "id": "dottor-sorriso",
    "raceId": "drsorriso",
    "label": "Dr Sorriso Donations",
    "description": "Match bank transfers to donors and record donations.",
    "href": "/project_details/project-drsorrisodonations.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "Donor CRM",
      "Analytics",
      "Data Systems",
      "Web/API"
    ],
    "stack": "Python · Selenium · OpenAI API",
    "dates": "2023–2025",
    "status": "Internal automation",
    "tier": "F1",
    "priority": 11
  },
  {
    "id": "project-unity",
    "raceId": "project-unity",
    "label": "Project Unity",
    "description": "One keyboard and mouse across macOS and Windows.",
    "href": "/project_details/project-unity.html",
    "roles": [
      "software-engineering",
      "native-apps"
    ],
    "tags": [
      "Swift",
      "C++",
      "macOS",
      "Windows",
      "Networking",
      "Security",
      "Systems"
    ],
    "stack": "Swift · C++ · TCP · UDP",
    "dates": "2026",
    "status": "Systems prototype",
    "tier": "F2",
    "priority": 12
  },
  {
    "id": "mosaic-swarm",
    "raceId": "mosaic",
    "label": "MOSAIC",
    "description": "Robot fleet coordination and spatial debugging through shared telemetry.",
    "href": "/project_details/project-mosaic.html",
    "roles": [
      "software-engineering",
      "robotics"
    ],
    "tags": [
      "Python",
      "ROS",
      "Robotics",
      "Distributed Systems",
      "UDP",
      "Autonomy",
      "Visualization",
      "Physical Computing",
      "Research"
    ],
    "stack": "Python · ROS 2 · OptiTrack · NDI",
    "dates": "2025–2026",
    "status": "Lab platform prototype",
    "tier": "F2",
    "priority": 13,
    "componentHrefs": [
      "/project_details/project-mosaic-floor.html"
    ]
  },
  {
    "id": "core-conflict",
    "raceId": "core",
    "label": "Core Conflict",
    "description": "Agents generate and test new mechanics for a multiplayer game.",
    "href": "/project_details/project-gengame.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "AI Agents",
      "Generative AI",
      "Games",
      "Multiplayer",
      "Web/API"
    ],
    "stack": "Python · Pygame · Docker · LLM APIs",
    "dates": "2025–2026",
    "status": "Game prototype",
    "tier": "F2",
    "priority": 14
  },
  {
    "id": "contextkey",
    "raceId": "contextkey",
    "label": "ContextKey",
    "description": "Cursor-side autocomplete using a model running on your Mac.",
    "href": "/project_details/project-contextkey.html",
    "roles": [
      "software-engineering",
      "native-apps",
      "ai-ml"
    ],
    "tags": [
      "Swift",
      "macOS",
      "MLX",
      "Accessibility",
      "OCR",
      "Local-First Tools"
    ],
    "stack": "Swift · AppKit · MLX · Accessibility",
    "dates": "2026",
    "status": "Experimental prototype",
    "tier": "F2",
    "priority": 15
  },
  {
    "id": "holovinyl",
    "raceId": "vinyl",
    "label": "HoloVinyl",
    "description": "Objects select music; hand gestures control playback.",
    "href": "/project_details/project-holovinyl.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "Computer Vision",
      "Gesture UI",
      "Interfaces",
      "Music"
    ],
    "stack": "Python · YOLO11 · MediaPipe · Spotify",
    "dates": "2025",
    "status": "Computer vision prototype",
    "tier": "F2",
    "priority": 16
  },
  {
    "id": "tcgnet",
    "raceId": "databases-ie",
    "label": "TCGNET",
    "description": "A card collection marketplace with transactional inventory.",
    "href": "/project_details/project-databases-ie.html",
    "roles": [
      "software-engineering"
    ],
    "tags": [
      "Python",
      "Django",
      "PostgreSQL",
      "Databases",
      "Data Systems",
      "Web/API"
    ],
    "stack": "Django · PostgreSQL · JavaScript",
    "dates": "2026",
    "status": "Course project",
    "tier": "F2",
    "priority": 17
  },
  {
    "id": "reminderz",
    "raceId": "reminderz",
    "label": "ReminderZ & Project Loom",
    "description": "Experiments in organizing messages and visual Python programming.",
    "href": "/project_details/project-remainder-v0.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "AI Agents",
      "Notes",
      "Productivity",
      "Web/API"
    ],
    "stack": "Python · Gemini · Electron · FAISS",
    "dates": "2025",
    "status": "Desktop prototypes",
    "tier": "F2",
    "priority": 18
  },
  {
    "id": "pead-learning-demos",
    "raceId": "pead",
    "label": "Learning Rules",
    "description": "Interactive experiments in learning, PCA and forgetting.",
    "href": "/project_details/project-pead.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "JavaScript",
      "Machine Learning",
      "Algorithms",
      "Research"
    ],
    "stack": "Python · NumPy · JavaScript",
    "dates": "2026",
    "status": "ML demonstrations",
    "tier": "F3",
    "priority": 19
  },
  {
    "id": "evolve",
    "raceId": "evolve",
    "label": "Evolve Project",
    "description": "An agent that writes and loads tools during a task.",
    "href": "/project_details/project-evolveproject.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "AI Agents",
      "Gemini",
      "Ollama",
      "Developer Tools"
    ],
    "stack": "Python · Gemini · Ollama",
    "dates": "2025",
    "status": "Agent experiment",
    "tier": "F3",
    "priority": 20
  },
  {
    "id": "algorithms-game",
    "raceId": "clash",
    "label": "Clash Royale in Python",
    "description": "A strategy game with pathfinding and custom data structures.",
    "href": "/project_details/project-algorithms-project.html",
    "roles": [
      "software-engineering"
    ],
    "tags": [
      "Python",
      "Pygame",
      "Games",
      "Game AI",
      "Algorithms",
      "Pathfinding"
    ],
    "stack": "Python · Pygame · Algorithms",
    "dates": "2025",
    "status": "Course project",
    "tier": "F3",
    "priority": 21
  },
  {
    "id": "matrices-recommender",
    "raceId": "matrices",
    "label": "Sparse SVD Recommender",
    "description": "Explore movie recommendations through matrix reconstruction.",
    "href": "/project_details/project-matrices.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "JavaScript",
      "Python",
      "Machine Learning",
      "Algorithms",
      "Interfaces"
    ],
    "stack": "JavaScript · Linear algebra · Python reference",
    "dates": "2026",
    "status": "Interactive demonstration",
    "tier": "F3",
    "priority": 22
  },
  {
    "id": "budget-buddy",
    "raceId": "budget",
    "label": "Budget Buddy",
    "description": "A budget assistant using spending history and savings goals.",
    "href": "/project_details/project-budget-buddy.html",
    "roles": [
      "software-engineering",
      "ai-ml"
    ],
    "tags": [
      "Python",
      "AI Agents",
      "Financial Planning",
      "Data Systems",
      "Web/API"
    ],
    "stack": "Python · AI agents",
    "dates": "2024",
    "status": "Hackathon prototype",
    "tier": "F3",
    "priority": 23
  },
  {
    "id": "gdg-event-website",
    "raceId": "gdg",
    "label": "Tech Roulette Website",
    "description": "An event website for the IE GDG community hackathon.",
    "href": "/project_details/project-gdg-website.html",
    "roles": [
      "software-engineering"
    ],
    "tags": [
      "JavaScript",
      "Interfaces",
      "Web/API",
      "Community"
    ],
    "stack": "HTML · CSS · JavaScript",
    "dates": "2026",
    "status": "Community website",
    "tier": "F3",
    "priority": 24
  }
];
