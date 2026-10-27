import { observeElementActivity } from './playfolio/visibility.js';
import { projectMapItems } from './project-map-data.js';

(function() {
    // --- Data Configuration ---
    const projects = projectMapItems;

    // --- Graph State ---
    const canvas = document.getElementById('neuron-canvas');
    const ctx = canvas.getContext('2d');
    const container = canvas.closest('.neuron-container');
    const overlay = document.getElementById('neuron-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayCount = document.getElementById('overlay-count');
    const overlayList = document.getElementById('overlay-list');
    const closeBtn = document.querySelector('.neuron-overlay-close');

    let width, height, dpr, graphTop = 210;
    let nodes = [];
    let edges = [];
    let animationId = null;
    let active = false;
    let framesRemaining = 0;
    let lastFrameTime = null;
    let floatTime = 0;
    let previousFocus;
    let inertBackground = [];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const topics = document.createElement('div');
    topics.className = 'neuron-topics';
    topics.setAttribute('role', 'group');
    topics.setAttribute('aria-label', 'Project topics');
    container.insertBefore(topics, overlay);
    let hoveredNode = null;
    let selectedNode = null;
    let draggedNode = null;
    
    // Mouse interaction
    const mouse = { x: 0, y: 0, isDown: false };

    function nodePalette(node) {
        const label = node.id.toLowerCase();
        if (label.includes('ai') || label.includes('generative') || label.includes('vision')) return '#40b898';
        if (label.includes('game') || label.includes('unreal') || label.includes('story') || label.includes('multiplayer')) return '#ff7048';
        if (label.includes('python') || label.includes('algorithm') || label.includes('pathfinding')) return '#f4f1e8';
        if (label.includes('android') || label.includes('macos') || label.includes('productivity') || label.includes('tools')) return '#79a0ff';
        if (label.includes('data') || label.includes('api') || label.includes('analytics') || label.includes('finance')) return '#f4b84a';
        if (label.includes('robot') || label.includes('physical') || label.includes('interface') || label.includes('gesture')) return '#8bd7ff';
        return '#d8ded8';
    }

    function placeNode(node, index) {
        const columns = Math.max(2, Math.floor((width - 32) / 160));
        const cellWidth = (width - 32) / columns;
        node.homeX = 16 + cellWidth * (index % columns + 0.5);
        node.homeY = graphTop + Math.floor(index / columns) * 120 + (index % 2) * 12;
        node.x = node.homeX;
        node.y = node.homeY;
        node.vx = node.vy = 0;
        node.boundaryMargin = Math.max(node.radius + 20, (node.button?.offsetWidth || 0) / 2 + 8);
    }

    // --- Initialization ---
    function init() {
        resize();
        window.addEventListener('resize', resize);
        new ResizeObserver(resize).observe(container.querySelector('.neuron-ui'));
        
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
            placeNode(node, index);
        });

        nodes.forEach((node) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'neuron-topic';
            const label = document.createElement('span');
            label.className = 'neuron-topic-label';
            label.textContent = node.id;
            button.append(label);
            button.setAttribute('aria-label', `${node.id}, ${node.projects.length} project${node.projects.length === 1 ? '' : 's'}`);
            button.setAttribute('aria-controls', 'neuron-overlay');
            button.setAttribute('aria-expanded', 'false');
            button.style.setProperty('--topic-color', node.color);
            let dragStart = null, moved = false;
            button.addEventListener('pointerdown', (event) => {
                if (event.button !== 0) return;
                dragStart = { x: event.clientX, y: event.clientY, nodeX: node.x, nodeY: node.y };
                moved = false;
                button.setPointerCapture(event.pointerId);
            });
            button.addEventListener('pointermove', (event) => {
                if (!dragStart || event.pointerType === 'touch') return;
                const dx = event.clientX - dragStart.x, dy = event.clientY - dragStart.y;
                if (Math.hypot(dx, dy) < 5) return;
                moved = true;
                draggedNode = node;
                node.x = Math.max(80, Math.min(width - 80, dragStart.nodeX + dx));
                node.y = Math.max(graphTop, Math.min(height - 100, dragStart.nodeY + dy));
                node.vx = node.vy = 0;
                wake();
            });
            const releaseDrag = () => {
                dragStart = null;
                if (draggedNode === node) draggedNode = null;
                wake();
            };
            button.addEventListener('pointerup', releaseDrag);
            button.addEventListener('pointercancel', releaseDrag);
            button.addEventListener('lostpointercapture', releaseDrag);
            button.addEventListener('click', () => { if (!moved) selectNode(node); moved = false; });
            button.addEventListener('focus', () => { hoveredNode = node; wake(); });
            button.addEventListener('pointerenter', () => { hoveredNode = node; wake(); });
            button.addEventListener('pointerleave', () => { hoveredNode = null; wake(); });
            button.addEventListener('blur', () => { hoveredNode = null; wake(); });
            topics.append(button);
            node.button = button;
        });
        resize();

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

        container.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && selectedNode) { event.preventDefault(); closeOverlay(); }
            if (event.key === 'Tab' && selectedNode) {
                const links = [...overlay.querySelectorAll('button, a[href]')];
                const first = links[0], last = links.at(-1);
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
        motion.addEventListener('change', () => { resize(); wake(); });
        observeElementActivity(container, (value) => {
            active = value;
            if (!active) {
                if (animationId !== null) cancelAnimationFrame(animationId);
                animationId = null;
                lastFrameTime = null;
            }
            if (active) wake();
        });
    }

    function resize() {
        const columns = Math.max(2, Math.floor((container.clientWidth - 32) / 160));
        const intro = container.querySelector('.neuron-ui');
        graphTop = intro.offsetTop + intro.offsetHeight + 70;
        container.style.height = `${Math.max(620, graphTop + 100 + Math.ceil(nodes.length / columns) * 120)}px`;
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
            nodes.forEach((node, index) => placeNode(node, index));
        }
        wake();
    }

    // --- Physics Engine ---
    function updatePhysics(step = 1) {
        const damping = Math.pow(0.65, step);
        nodes.forEach(node => {
            if (node === draggedNode) return;
            if (motion.matches || (!draggedNode && framesRemaining === 1)) {
                node.x = node.homeX;
                node.y = node.homeY;
                node.vx = node.vy = 0;
                return;
            }
            node.vx = (node.vx + (node.homeX - node.x) * 0.08 * step) * damping;
            node.vy = (node.vy + (node.homeY - node.y) * 0.08 * step) * damping;
            node.x += node.vx * step;
            node.y += node.vy * step;
        });

        // Resolve contact using the same positions that are drawn and dragged.
        // A few passes let a pushed neighbor transfer contact to another node.
        for (let pass = 0; pass < 3; pass++) {
            let touching = false;
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i], b = nodes[j];
                    const dx = b.x + (b.floatX || 0) - a.x - (a.floatX || 0);
                    const dy = b.y + (b.floatY || 0) - a.y - (a.floatY || 0);
                    const distance = Math.hypot(dx, dy);
                    const separation = a.radius + b.radius + 10;
                    if (distance >= separation) continue;
                    touching = true;
                    const homeDistance = Math.hypot(b.homeX - a.homeX, b.homeY - a.homeY) || 1;
                    const nx = distance > 0.01 ? dx / distance : (b.homeX - a.homeX) / homeDistance;
                    const ny = distance > 0.01 ? dy / distance : (b.homeY - a.homeY) / homeDistance;
                    const overlap = separation - distance;
                    const aShare = a === draggedNode ? 0 : b === draggedNode ? 1 : 0.5;
                    const bShare = 1 - aShare;
                    if (aShare) {
                        a.x -= nx * overlap * aShare;
                        a.y -= ny * overlap * aShare;
                        a.vx *= 0.5;
                        a.vy *= 0.5;
                    }
                    if (bShare) {
                        b.x += nx * overlap * bShare;
                        b.y += ny * overlap * bShare;
                        b.vx *= 0.5;
                        b.vy *= 0.5;
                    }
                }
            }
            nodes.forEach(node => {
                const margin = node.boundaryMargin;
                node.x = Math.max(margin, Math.min(width - margin, node.x));
                node.y = Math.max(graphTop, Math.min(height - 100, node.y));
            });
            if (!touching) break;
        }
    }

    // --- Rendering ---
    function draw() {
        ctx.clearRect(0, 0, width, height);

        nodes.forEach((node, index) => {
            // Keep labels and targets steady while someone is using them.
            if (motion.matches) {
                node.floatX = node.floatY = 0;
            } else if (node !== hoveredNode && node !== selectedNode && node !== draggedNode) {
                node.floatX = Math.sin(floatTime * 0.65 + index * 2.4) * 2.5;
                node.floatY = Math.sin(floatTime * 0.5 + index * 1.6) * 2;
            }
            node.drawX = node.x + (node.floatX || 0);
            node.drawY = node.y + (node.floatY || 0);
        });

        // Draw Edges
        edges.forEach(edge => {
            const isConnectedToHover = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
            const isConnectedToSelected = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
            
            ctx.beginPath();
            ctx.moveTo(edge.source.drawX, edge.source.drawY);
            ctx.lineTo(edge.target.drawX, edge.target.drawY);
            
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
            ctx.arc(node.drawX, node.drawY, node.radius, 0, Math.PI * 2);
            
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

            node.button.style.left = `${node.drawX}px`;
            node.button.style.top = `${node.drawY}px`;

        });
    }

    function animate(timestamp) {
        animationId = null;
        if (!active) return;
        if (motion.matches) {
            updatePhysics();
            draw();
            return;
        }
        // Gentle ambient motion needs only 30 updates per second. Physics can
        // sleep once settled; the inexpensive drift continues independently.
        if (lastFrameTime === null || timestamp - lastFrameTime >= 1000 / 30) {
            const elapsed = lastFrameTime === null ? 0 : Math.min(timestamp - lastFrameTime, 100);
            floatTime += elapsed / 1000;
            lastFrameTime = timestamp;
            if (framesRemaining > 0 || draggedNode) {
                updatePhysics(Math.min(elapsed / (1000 / 30), 1.5) || 1);
                if (!draggedNode) framesRemaining--;
            }
            draw();
        }
        animationId = requestAnimationFrame(animate);
    }

    function wake() {
        framesRemaining = 60;
        if (active && animationId === null) animationId = requestAnimationFrame(animate);
    }

    // --- Interaction Handlers ---
    function onMouseMove(e) {
        wake();
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;

        // Hit testing
        let found = null;
        for (const node of nodes) {
            const dist = Math.hypot(mouse.x - node.drawX, mouse.y - node.drawY);
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
        wake();
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
        if (selectedNode) return;
        previousFocus = node.button;
        selectedNode = node;
        nodes.forEach((item) => item.button.setAttribute('aria-expanded', String(item === node)));
        inertBackground = [canvas, topics, container.querySelector('.neuron-ui'), container.querySelector('.neuron-controls'), document.querySelector('nav'), document.querySelector('footer'), document.querySelector('[data-site-skip]')]
            .filter(Boolean).map(element => ({ element, wasInert: element.inert }));
        inertBackground.forEach(({ element }) => { element.inert = true; });
        wake();
        
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

        overlay.removeAttribute('aria-hidden');
        overlay.inert = false;
        overlay.classList.add('active');
        closeBtn.focus({ preventScroll: true });
    }

    function closeOverlay() {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.inert = true;
        selectedNode = null;
        inertBackground.forEach(({ element, wasInert }) => { element.inert = wasInert; });
        inertBackground = [];
        nodes.forEach((item) => item.button.setAttribute('aria-expanded', 'false'));
        previousFocus?.focus({ preventScroll: true });
        wake();
    }

    // Start
    init();

})();
