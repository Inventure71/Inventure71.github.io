
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
        }
    ];

    // --- Graph State ---
    const canvas = document.getElementById('neuron-canvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('neuron-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayCount = document.getElementById('overlay-count');
    const overlayList = document.getElementById('overlay-list');
    const closeBtn = document.querySelector('.neuron-overlay-close');

    let width, height;
    let nodes = [];
    let edges = [];
    let animationId;
    let hoveredNode = null;
    let selectedNode = null;
    
    // Mouse interaction
    const mouse = { x: 0, y: 0, isDown: false };

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

        nodes = Array.from(tagMap.values());

        // Adjust radius based on project count
        nodes.forEach(node => {
            node.radius = 15 + (node.projects.length * 8);
        });

        // Create Edges (Co-occurrence)
        // Connect tags that appear in the same project
        const edgeSet = new Set();
        projects.forEach(p => {
            const pTags = p.tags;
            for (let i = 0; i < pTags.length; i++) {
                for (let j = i + 1; j < pTags.length; j++) {
                    const t1 = pTags[i];
                    const t2 = pTags[j];
                    const id = [t1, t2].sort().join('-');
                    if (!edgeSet.has(id)) {
                        edgeSet.add(id);
                        edges.push({
                            source: nodes.find(n => n.id === t1),
                            target: nodes.find(n => n.id === t2),
                            strength: 0.5
                        });
                    }
                }
            }
        });

        // Add random weak connections to make it look more like a brain/network
        // if the graph is disconnected
        for (let i = 0; i < nodes.length; i++) {
            const closest = nodes
                .filter(n => n !== nodes[i])
                .sort((a, b) => {
                    const distA = Math.hypot(a.x - nodes[i].x, a.y - nodes[i].y);
                    const distB = Math.hypot(b.x - nodes[i].x, b.y - nodes[i].y);
                    return distA - distB;
                })
                .slice(0, 2); // Connect to 2 closest neighbors
            
            closest.forEach(neighbor => {
                const id = [nodes[i].id, neighbor.id].sort().join('-');
                if (!edgeSet.has(id)) {
                    edgeSet.add(id);
                    edges.push({
                        source: nodes[i],
                        target: neighbor,
                        strength: 0.1 // Weaker visual connection
                    });
                }
            });
        }

        // Event Listeners
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('click', onClick);
        closeBtn.addEventListener('click', closeOverlay);

        animate();
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }

    // --- Physics Engine ---
    function updatePhysics() {
        // Repulsion
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy) || 1;
                const force = (1000 * 1000) / (dist * dist); // Inverse square law
                
                const fx = (dx / dist) * force * 0.0005;
                const fy = (dy / dist) * force * 0.0005;

                a.vx -= fx;
                a.vy -= fy;
                b.vx += fx;
                b.vy += fy;
            }
        }

        // Spring (Edges)
        edges.forEach(edge => {
            const a = edge.source;
            const b = edge.target;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 1;
            const targetDist = 150; // Optimal distance
            
            const force = (dist - targetDist) * 0.005;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
        });

        // Center Gravity
        nodes.forEach(node => {
            const dx = (width / 2) - node.x;
            const dy = (height / 2) - node.y;
            node.vx += dx * 0.0008;
            node.vy += dy * 0.0008;

            // Mouse Interaction (Repel/Attract)
            const mdx = mouse.x - node.x;
            const mdy = mouse.y - node.y;
            const mDist = Math.hypot(mdx, mdy);
            
            if (mDist < 200) {
                const mForce = (200 - mDist) * 0.002;
                node.vx -= (mdx / mDist) * mForce;
                node.vy -= (mdy / mDist) * mForce;
            }

            // Velocity Damping
            node.vx *= 0.92;
            node.vy *= 0.92;

            // Update Position
            node.x += node.vx;
            node.y += node.vy;

            // Boundary Check
            const margin = node.radius;
            if (node.x < margin) node.x = margin;
            if (node.x > width - margin) node.x = width - margin;
            if (node.y < margin) node.y = margin;
            if (node.y > height - margin) node.y = height - margin;
        });
    }

    // --- Rendering ---
    function draw() {
        ctx.clearRect(0, 0, width, height);

        // Draw Edges
        ctx.lineWidth = 1;
        edges.forEach(edge => {
            ctx.beginPath();
            ctx.moveTo(edge.source.x, edge.source.y);
            ctx.lineTo(edge.target.x, edge.target.y);
            
            const isConnectedToHover = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
            const isConnectedToSelected = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
            
            if (isConnectedToHover || isConnectedToSelected) {
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
            }
            ctx.stroke();
        });

        // Draw Nodes
        nodes.forEach(node => {
            const isHovered = node === hoveredNode;
            const isSelected = node === selectedNode;

            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            
            if (isSelected) {
                ctx.fillStyle = '#3b82f6'; // Brand accent
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#3b82f6';
            } else if (isHovered) {
                ctx.fillStyle = '#60a5fa';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#60a5fa';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.shadowBlur = 0;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0; // Reset

            // Draw Label
            if (isHovered || isSelected || node.radius > 20) {
                ctx.fillStyle = '#fff';
                ctx.font = isSelected ? 'bold 14px "Plus Jakarta Sans"' : '12px "Plus Jakarta Sans"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.id, node.x, node.y + node.radius + 15);
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
    }

    function onMouseDown(e) {
        mouse.isDown = true;
    }

    function onMouseUp(e) {
        mouse.isDown = false;
    }

    function onClick(e) {
        if (hoveredNode) {
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
