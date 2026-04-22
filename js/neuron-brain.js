
(function() {
    // --- Data Configuration ---
    const projects = [
        {
            id: 'budget-buddy',
            title: 'Budget Buddy',
            desc: 'AI-Powered Financial Chatbot',
            url: 'project_details/project-budget-buddy.html',
            tags: ['Python', 'AI Agents', 'Financial Planning']
        },
        {
            id: 'neural-noir',
            title: 'Neural Noir',
            desc: 'AI-Driven Interactive Story Game',
            url: 'project_details/project-neural-noir.html',
            tags: ['AI-Powered', 'Procedural Storytelling', 'Unreal Engine 5']
        },
        {
            id: 'holovinyl',
            title: 'HoloVinyl',
            desc: 'Touchless Vision Control Deck',
            url: 'project_details/project-holovinyl.html',
            tags: ['Computer Vision', 'Gesture UI', 'Python']
        },
        {
            id: 'drsorriso',
            title: 'DrSorrisoDonations',
            desc: 'Donation Intelligence Platform',
            url: 'project_details/project-drsorrisodonations.html',
            tags: ['Python', 'Donor CRM', 'Analytics']
        },
        {
            id: 'victoria',
            title: 'VictorIA',
            desc: 'Multi-Domain AI Sandbox',
            url: 'project_details/project-victoria.html',
            tags: ['Game AI', 'Computer Vision', 'Robotics']
        },
        {
            id: 'remainder',
            title: 'ReminderZ',
            desc: 'AI Context Weaving Platform',
            url: 'project_details/project-remainder-v0.html',
            tags: ['ReminderProject', 'RemainderV0', 'ProjectLoom', 'remainder_app']
        },
        {
            id: 'clipclop',
            title: 'ClipClop',
            desc: 'Cross-Device Clipboard Intelligence',
            url: 'project_details/project-clipclop.html',
            tags: ['Python', 'Android', 'Productivity']
        },
        {
            id: 'evolve',
            title: 'EvolveProject',
            desc: 'AI Card Generation Backend',
            url: 'project_details/project-evolveproject.html',
            tags: ['Python', 'Generative AI', 'Unreal Engine']
        },
        {
            id: 'algorithms-project',
            title: 'Clash Royale In Python',
            desc: 'Algorithmic Strategy Game Engine',
            url: 'project_details/project-algorithms-project.html',
            tags: ['Python', 'Game Development', 'Pygame', 'BFS Pathfinding', 'Algorithms', 'Complexity Analysis']
        }
    ];

    // --- Graph State ---
    const canvas = document.getElementById('neuron-canvas');
    const ctx = canvas.getContext('2d');
    const container = canvas.closest('.neuron-container');
    const overlay = document.getElementById('neuron-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayCount = document.getElementById('overlay-count');
    const overlayList = document.getElementById('overlay-list');
    const closeBtn = document.querySelector('.neuron-overlay-close');

    let width, height, dpr;
    let nodes = [];
    let edges = [];
    let animationId;
    let hoveredNode = null;
    let selectedNode = null;
    let draggedNode = null;
    
    // Mouse interaction
    const mouse = { x: 0, y: 0, isDown: false };

    function hashString(value) {
        return Array.from(value).reduce((hash, char) => {
            return ((hash << 5) - hash) + char.charCodeAt(0);
        }, 0);
    }

    function nodePalette(node) {
        const label = node.id.toLowerCase();
        if (label.includes('ai') || label.includes('generative') || label.includes('vision')) return '#40b898';
        if (label.includes('game') || label.includes('unreal') || label.includes('story')) return '#ff7048';
        if (label.includes('python') || label.includes('algorithm') || label.includes('complexity')) return '#f4f1e8';
        if (label.includes('android') || label.includes('productivity') || label.includes('reminder')) return '#79a0ff';
        return '#d8ded8';
    }

    function placeNode(node, index, count) {
        const angle = (-Math.PI / 2) + (Math.PI * 2 * index / count);
        const ring = Math.min(width, height) * (0.3 + ((index % 3) * 0.09));
        const horizontalBias = width < 760 ? 0 : width * 0.14;
        node.homeX = (width / 2) + horizontalBias + Math.cos(angle) * ring;
        node.homeY = (height / 2) + Math.sin(angle) * ring * 0.7;
        node.x = node.homeX + ((hashString(node.id) % 41) - 20);
        node.y = node.homeY + ((hashString(`${node.id}:y`) % 41) - 20);
    }

    // --- Initialization ---
    function init() {
        resize();
        window.addEventListener('resize', resize);
        
        // Build Graph Data
        const tagMap = new Map();
        
        // Create Nodes (Tags)
        projects.forEach(p => {
            p.tags.forEach(tag => {
                if (!tagMap.has(tag)) {
                    tagMap.set(tag, {
                        id: tag,
                        x: Math.random() * width,
                        y: Math.random() * height,
                        vx: 0,
                        vy: 0,
                        radius: 5 + Math.random() * 5, // Base radius
                        projects: []
                    });
                }
                tagMap.get(tag).projects.push(p);
            });
        });

        nodes = Array.from(tagMap.values())
            .sort((a, b) => b.projects.length - a.projects.length || a.id.localeCompare(b.id));

        // Adjust radius based on project count
        nodes.forEach((node, index) => {
            node.radius = 18 + Math.min(node.projects.length, 4) * 5;
            node.color = nodePalette(node);
            node.labelRank = index;
            node.labelSide = index % 2 === 0 ? 1 : -1;
            placeNode(node, index, nodes.length);
        });

        // Create Edges (Co-occurrence)
        // Connect tags that appear in the same project
        const edgeMap = new Map();
        projects.forEach(p => {
            const pTags = p.tags;
            for (let i = 0; i < pTags.length; i++) {
                for (let j = i + 1; j < pTags.length; j++) {
                    const t1 = pTags[i];
                    const t2 = pTags[j];
                    const id = [t1, t2].sort().join('-');
                    if (!edgeMap.has(id)) {
                        edgeMap.set(id, {
                            source: nodes.find(n => n.id === t1),
                            target: nodes.find(n => n.id === t2),
                            strength: 1
                        });
                    } else {
                        edgeMap.get(id).strength += 1;
                    }
                }
            }
        });

        edges = Array.from(edgeMap.values());

        // Event Listeners
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
        canvas.addEventListener('click', onClick);
        closeBtn.addEventListener('click', closeOverlay);

        animate();
    }

    function resize() {
        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (nodes.length) {
            nodes.forEach((node, index) => placeNode(node, index, nodes.length));
        }
    }

    // --- Physics Engine ---
    function updatePhysics() {
        // 1. Repulsion (Coulomb's Law)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy) || 1;
                
                // Stronger repulsion at close range
                const force = (1200 * 1200) / (dist * dist);
                
                const fx = (dx / dist) * force * 0.0002;
                const fy = (dy / dist) * force * 0.0002;

                if (a !== draggedNode) {
                    a.vx -= fx;
                    a.vy -= fy;
                }
                if (b !== draggedNode) {
                    b.vx += fx;
                    b.vy += fy;
                }
            }
        }

        // 2. Spring (Edges)
        edges.forEach(edge => {
            const a = edge.source;
            const b = edge.target;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 1;
            const targetDist = Math.max(150, a.radius + b.radius + 110);
            
            const force = (dist - targetDist) * (0.0019 + (edge.strength * 0.0006));
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (a !== draggedNode) {
                a.vx += fx;
                a.vy += fy;
            }
            if (b !== draggedNode) {
                b.vx -= fx;
                b.vy -= fy;
            }
        });

        // 3. Home Gravity
        nodes.forEach(node => {
            if (node === draggedNode) {
                node.vx = 0;
                node.vy = 0;
                return;
            }

            const dx = node.homeX - node.x;
            const dy = node.homeY - node.y;
            node.vx += dx * 0.0022;
            node.vy += dy * 0.0022;

            // Mouse Interaction (Repel/Attract)
            const mdx = mouse.x - node.x;
            const mdy = mouse.y - node.y;
            const mDist = Math.hypot(mdx, mdy);
            
            if (mDist > 0 && mDist < 180) {
                const mForce = (180 - mDist) * 0.0008;
                node.vx -= (mdx / mDist) * mForce;
                node.vy -= (mdy / mDist) * mForce;
            }

            // Velocity Damping
            node.vx *= 0.90;
            node.vy *= 0.90;

            // Update Position
            node.x += node.vx;
            node.y += node.vy;

            // Boundary Check
            const margin = node.radius + 20;
            if (node.x < margin) { node.x = margin; node.vx *= -1; }
            if (node.x > width - margin) { node.x = width - margin; node.vx *= -1; }
            if (node.y < margin) { node.y = margin; node.vy *= -1; }
            if (node.y > height - margin) { node.y = height - margin; node.vy *= -1; }
        });

        // 4. Hard Collision Resolution (Prevent Overlap)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);
                const minDist = a.radius + b.radius + 10; // Add buffer

                if (dist < minDist) {
                    const overlap = minDist - dist;
                    const nx = dist ? dx / dist : 1;
                    const ny = dist ? dy / dist : 0;
                    
                    // Move apart proportional to inverse mass (assume equal mass for now)
                    const moveX = nx * overlap * 0.5;
                    const moveY = ny * overlap * 0.5;

                    if (a !== draggedNode) {
                        a.x -= moveX;
                        a.y -= moveY;
                        // Kill velocity in collision direction
                        a.vx *= 0.5;
                        a.vy *= 0.5;
                    }
                    if (b !== draggedNode) {
                        b.x += moveX;
                        b.y += moveY;
                        b.vx *= 0.5;
                        b.vy *= 0.5;
                    }
                }
            }
        }
    }

    function drawLabel(node, strong = false) {
        const fontSize = strong ? 15 : 12;
        ctx.font = `${strong ? '700' : '650'} ${fontSize}px "Plus Jakarta Sans"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = node.id;
        const maxWidth = Math.min(210, Math.max(86, node.radius * 4.5));
        const width = Math.min(ctx.measureText(label).width + 18, maxWidth);
        const height = fontSize + 10;
        const x = node.x - (width / 2);
        const labelGap = node.radius + 13;
        const y = node.labelSide > 0 ? node.y + labelGap : node.y - labelGap - height;

        ctx.fillStyle = strong ? 'rgba(13, 13, 11, 0.82)' : 'rgba(13, 13, 11, 0.56)';
        ctx.strokeStyle = strong ? 'rgba(244, 241, 232, 0.24)' : 'rgba(244, 241, 232, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = strong ? '#f4f1e8' : 'rgba(244, 241, 232, 0.76)';
        ctx.fillText(label, node.x, y + (height / 2), maxWidth - 14);
    }

    // --- Rendering ---
    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Draw Edges
        edges.forEach(edge => {
            const isConnectedToHover = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
            const isConnectedToSelected = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
            
            ctx.beginPath();
            ctx.moveTo(edge.source.x, edge.source.y);
            ctx.lineTo(edge.target.x, edge.target.y);
            
            if (isConnectedToHover || isConnectedToSelected) {
                ctx.strokeStyle = 'rgba(244, 241, 232, 0.78)';
                ctx.lineWidth = 2.2 + edge.strength * 0.3;
                ctx.globalAlpha = 1;
            } else if (hoveredNode) {
                // Dim unrelated edges when hovering
                ctx.strokeStyle = 'rgba(244, 241, 232, 0.05)';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.2;
            } else {
                ctx.strokeStyle = 'rgba(244, 241, 232, 0.14)';
                ctx.lineWidth = 0.8 + edge.strength * 0.2;
                ctx.globalAlpha = 1;
            }
            ctx.stroke();
        });
        ctx.globalAlpha = 1; // Reset alpha

        // Draw Nodes
        nodes.forEach(node => {
            const isHovered = node === hoveredNode;
            const isSelected = node === selectedNode;
            const isConnected = hoveredNode && edges.some(e => 
                (e.source === node && e.target === hoveredNode) || 
                (e.target === node && e.source === hoveredNode)
            );

            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            
            if (isSelected) {
                ctx.fillStyle = node.color;
                ctx.shadowBlur = 26;
                ctx.shadowColor = node.color;
            } else if (isHovered) {
                ctx.fillStyle = node.color;
                ctx.shadowBlur = 20;
                ctx.shadowColor = node.color;
            } else if (isConnected) {
                ctx.fillStyle = node.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = node.color;
            } else if (hoveredNode) {
                // Dim unrelated nodes
                ctx.fillStyle = 'rgba(244, 241, 232, 0.22)';
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = node.color;
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0; // Reset
            ctx.strokeStyle = isHovered || isSelected ? 'rgba(244, 241, 232, 0.86)' : 'rgba(13, 13, 11, 0.42)';
            ctx.lineWidth = isHovered || isSelected ? 2 : 1;
            ctx.stroke();

            // Draw Label
            if (isHovered || isSelected || isConnected || (!hoveredNode && (node.projects.length > 1 || node.labelRank < 8))) {
                drawLabel(node, isHovered || isSelected);
            }
        });
    }

    function animate() {
        updatePhysics();
        draw();
        animationId = requestAnimationFrame(animate);
    }

    // --- Interaction Handlers ---
    function onMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;

        // Hit testing
        let found = null;
        for (const node of nodes) {
            const dist = Math.hypot(mouse.x - node.x, mouse.y - node.y);
            if (dist < node.radius + 5) {
                found = node;
                break;
            }
        }
        
        hoveredNode = found;
        canvas.style.cursor = hoveredNode ? 'pointer' : 'default';

        if (draggedNode) {
            draggedNode.x = mouse.x;
            draggedNode.y = mouse.y;
            draggedNode.homeX = mouse.x;
            draggedNode.homeY = mouse.y;
            canvas.style.cursor = 'grabbing';
        }
    }

    function onMouseDown(e) {
        mouse.isDown = true;
        if (hoveredNode) {
            draggedNode = hoveredNode;
            canvas.style.cursor = 'grabbing';
        }
    }

    function onMouseUp(e) {
        mouse.isDown = false;
        draggedNode = null;
        canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
    }

    function onClick(e) {
        if (hoveredNode && !draggedNode) {
            selectNode(hoveredNode);
        } else {
            // Deselect if clicking empty space
            // selectedNode = null;
            // closeOverlay();
        }
    }

    function selectNode(node) {
        selectedNode = node;
        
        // Populate Overlay
        overlayTitle.textContent = node.id;
        overlayCount.textContent = `${node.projects.length} Project${node.projects.length !== 1 ? 's' : ''}`;
        
        overlayList.innerHTML = node.projects.map(p => `
            <li class="tag-project-item">
                <a href="${p.url}" class="tag-project-link">
                    <span class="tag-project-title">${p.title}</span>
                    <span class="tag-project-desc">${p.desc}</span>
                </a>
            </li>
        `).join('');

        overlay.classList.add('active');
    }

    function closeOverlay() {
        overlay.classList.remove('active');
        selectedNode = null;
    }

    // Start
    init();

})();
