(function () {
    const VIEWBOX = { width: 1200, height: 700 };
    const LAP_RANGE = { min: 10, max: 20 };
    const CAR_IMAGE = '/assets/f1Car_base.png';
    const TRACK_TYPES = ['Street Circuit', 'High-Speed', 'Technical', 'Desert Night', 'Harbor Loop', 'Mountain Pass'];
    const WEATHER = ['Clear Skies', 'Night Race', 'Neon Glow', 'Golden Hour', 'Azure Skies'];
    const COLOR_PALETTE = ['#ff3860', '#ffd166', '#06d6a0', '#118ab2', '#8338ec', '#ff5c8a', '#f25f5c', '#3a86ff', '#2ec4b6', '#f28482'];

    const randBetween = (min, max) => Math.random() * (max - min) + min;
    const randInt = (min, max) => Math.floor(randBetween(min, max + 1));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Convert hex color to CSS filter for tinting white images
    function hexToFilter(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return '';
        
        // Normalize RGB values
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;
        
        // Calculate HSL for better color matching
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        // Calculate lightness (average of max and min)
        const lightness = (max + min) / 2;
        
        // Calculate saturation
        const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
        
        // Calculate hue
        let hue = 0;
        if (delta !== 0) {
            if (max === r) {
                hue = 60 * (((g - b) / delta) % 6);
            } else if (max === g) {
                hue = 60 * ((b - r) / delta + 2);
            } else {
                hue = 60 * ((r - g) / delta + 4);
            }
        }
        if (hue < 0) hue += 360;
        
        // Adjust brightness based on target lightness (darker colors need lower brightness)
        // Map lightness (0-1) to brightness (0.35-0.9) to add more depth and darkness
        const brightnessValue = 0.35 + (lightness * 0.55);
        
        // Use sepia to add warmth/base color, then hue-rotate to target hue
        // Higher sepia for more saturated colors
        const sepiaValue = Math.min(100, saturation * 100);
        
        // Hue rotation - sepia's base color is around 38-40deg (yellow-brown)
        // We need to rotate from that base to our target hue
        const sepiaHue = 38; // Sepia's base hue (yellow-brown)
        let hueRotateValue = hue - sepiaHue;
        
        // Normalize hue rotation to -180 to 180 range for shortest path
        while (hueRotateValue > 180) hueRotateValue -= 360;
        while (hueRotateValue < -180) hueRotateValue += 360;
        
        // Saturation boost - higher for more vibrant colors, but not too high
        const saturateValue = 80 + (saturation * 120);
        
        // Add contrast to deepen colors and improve color accuracy
        const contrastValue = 1.1 + (saturation * 0.4);
        
        return `brightness(${brightnessValue.toFixed(2)}) contrast(${contrastValue.toFixed(2)}) sepia(${sepiaValue.toFixed(1)}%) hue-rotate(${hueRotateValue.toFixed(1)}deg) saturate(${saturateValue.toFixed(1)}%)`;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    class ProjectGrandPrix {
        constructor(container) {
            this.container = container;
            this.stage = null;
            this.carLayer = null;
            this.svg = null;
            this.trackPath = null;
            this.trackLength = 0;
            this.raceDistance = 0;
            this.cars = [];
            this.totalLaps = randInt(LAP_RANGE.min, LAP_RANGE.max);
            this.lastTimestamp = null;
            this.raceActive = false;
            this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.telemetryList = document.querySelector('.f1-driver-list');
            this.lapInfoElement = document.querySelector('.f1-lap-info');
            this.unitsPerSecond = 0;
            this.viewportMetrics = null;
            this.wrapper = null;
            this.resizeHandler = () => this.updateViewportMetrics();
            this.rafCallback = (timestamp) => this.tick(timestamp);
        }

        init() {
            if (!this.container) return;
            
            // Ensure a wrapper exists to host the info panel and track canvas
            const currentParent = this.container.parentElement;
            if (!currentParent) return;
            if (currentParent.classList.contains('f1-track-wrapper')) {
                this.wrapper = currentParent;
            } else {
                const wrapper = document.createElement('div');
                wrapper.className = 'f1-track-wrapper';
                currentParent.insertBefore(wrapper, this.container);
                wrapper.appendChild(this.container);
                this.wrapper = wrapper;
            }
            
            this.buildTrack();
            this.collectDrivers();

            if (!this.drivers?.length) {
                this.showEmptyState();
                return;
            }

            this.createCars();
            this.updateViewportMetrics();
            this.updateTelemetry(this.cars);
            this.attachResizeHandling();
            this.startRace();
        }

        buildTrack() {
            this.container.innerHTML = '';
            this.container.classList.add('f1-track-ready');

            const glow = document.createElement('div');
            glow.className = 'f1-track-glow';
            this.container.appendChild(glow);

            this.stage = document.createElement('div');
            this.stage.className = 'f1-track-stage';
            this.container.appendChild(this.stage);

            const grid = document.createElement('div');
            grid.className = 'f1-track-grid';
            this.stage.appendChild(grid);

            this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            this.svg.setAttribute('viewBox', `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
            this.svg.setAttribute('class', 'f1-track-svg');
            this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            this.stage.appendChild(this.svg);

            const points = this.generateCircuitPoints();
            const pathData = this.catmullRomPath(points);

            const outline = this.createPath('f1-track-outline', pathData);
            this.svg.appendChild(outline);

            this.trackPath = this.createPath('f1-track-path', pathData);
            this.svg.appendChild(this.trackPath);

            const racingLine = this.createPath('f1-track-racing-line', pathData);
            this.svg.appendChild(racingLine);

            this.createDrsZones(pathData);
            this.createStartLine();

            this.trackLength = this.trackPath.getTotalLength();
            const baseLapTimeMs = randBetween(12000, 18000);
            this.unitsPerSecond = this.trackLength / (baseLapTimeMs / 1000);
            this.raceDistance = this.trackLength * this.totalLaps;

            this.carLayer = document.createElement('div');
            this.carLayer.className = 'f1-track-car-layer';
            this.stage.appendChild(this.carLayer);

            this.renderTrackInfo();
        }

        generateCircuitPoints() {
            const pointCount = randInt(7, 10);
            const baseRadius = Math.min(VIEWBOX.width, VIEWBOX.height) * 0.32;
            const spread = baseRadius * 0.35;
            const center = { x: VIEWBOX.width / 2, y: VIEWBOX.height / 2 };
            const points = [];

            for (let i = 0; i < pointCount; i++) {
                const angle = (i / pointCount) * Math.PI * 2 + randBetween(-0.25, 0.25);
                const radius = baseRadius + randBetween(-spread, spread);
                const x = center.x + Math.cos(angle) * radius;
                const y = center.y + Math.sin(angle) * radius * randBetween(0.85, 1.15);
                points.push({
                    x: this.clamp(x, 80, VIEWBOX.width - 80),
                    y: this.clamp(y, 80, VIEWBOX.height - 80),
                });
            }

            return points;
        }

        catmullRomPath(points) {
            if (points.length < 3) return '';
            const tension = 1;
            const pts = points.slice();
            pts.unshift(points[points.length - 1]);
            pts.push(points[0], points[1]);

            let d = `M ${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)}`;

            for (let i = 1; i < pts.length - 2; i++) {
                const p0 = pts[i - 1];
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const p3 = pts[i + 2];

                const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
                const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
                const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
                const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

                d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
            }

            return `${d} Z`;
        }

        createPath(className, d) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('class', className);
            return path;
        }

        createDrsZones(pathData) {
            const drsCount = randInt(1, 2);
            for (let i = 0; i < drsCount; i++) {
                const drsZone = this.createPath('f1-track-drs-zone', pathData);
                this.svg.appendChild(drsZone);
                queueMicrotask(() => {
                    const length = this.trackPath?.getTotalLength() || 0;
                    if (!length) return;
                    const segmentLength = length * randBetween(0.08, 0.16);
                    const startOffset = length * randBetween(0.1, 0.85);
                    drsZone.style.strokeDasharray = `${segmentLength} ${length}`;
                    drsZone.style.strokeDashoffset = `${-startOffset}`;
                });
            }
        }

        createStartLine() {
            if (!this.trackPath) return;
            const length = this.trackPath.getTotalLength();
            const startPoint = this.trackPath.getPointAtLength(0);
            const aheadPoint = this.trackPath.getPointAtLength(Math.min(20, length));
            const tangent = Math.atan2(aheadPoint.y - startPoint.y, aheadPoint.x - startPoint.x);
            const normal = tangent + Math.PI / 2;
            const lineLength = 50;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', (startPoint.x + Math.cos(normal) * lineLength).toFixed(2));
            line.setAttribute('y1', (startPoint.y + Math.sin(normal) * lineLength).toFixed(2));
            line.setAttribute('x2', (startPoint.x - Math.cos(normal) * lineLength).toFixed(2));
            line.setAttribute('y2', (startPoint.y - Math.sin(normal) * lineLength).toFixed(2));
            line.setAttribute('class', 'f1-start-line');
            this.svg.appendChild(line);
        }

        renderTrackInfo() {
            const circuitName = `${pick(['Neon', 'Quantum', 'Mirage', 'Solar', 'Apex', 'Halo'])} ${pick(['Harbor', 'Oasis', 'Summit', 'District', 'Void', 'Cascade'])} Circuit`;
            const type = pick(TRACK_TYPES);
            const weather = pick(WEATHER);
            const info = document.createElement('div');
            info.className = 'f1-track-info';
            info.innerHTML = `
                <div>
                    <div class="track-label">Circuit</div>
                    <div class="track-name">${circuitName}</div>
                </div>
                <div>
                    <div class="track-label">Profile</div>
                    <div class="track-meta">${type}</div>
                    <div class="track-weather">${weather}</div>
                </div>
                <div>
                    <div class="track-label">Telemetry</div>
                    <div class="track-meta">${this.totalLaps} laps · ${this.telemetryList ? this.telemetryList.children.length : 0} cars</div>
                </div>
            `;
            // Insert track info into the wrapper (before the track container)
            if (this.wrapper) {
                this.wrapper.insertBefore(info, this.container);
            } else {
                this.container.appendChild(info);
            }

            if (this.lapInfoElement) {
                this.lapInfoElement.textContent = `LAP 1/${this.totalLaps}`;
            }
        }

        collectDrivers() {
            if (!this.telemetryList) {
                this.drivers = [];
                return;
            }

            this.drivers = Array.from(this.telemetryList.querySelectorAll('.f1-driver-entry')).map((entry, index) => {
                const name = entry.querySelector('.f1-driver-name')?.textContent.trim() || `Project ${index + 1}`;
                const code = entry.querySelector('.f1-driver-code')?.textContent.trim() || `P${index + 1}`;
                const onclick = entry.getAttribute('onclick');
                const urlMatch = onclick?.match(/'([^']+)'/);
                const href = urlMatch ? urlMatch[1] : entry.dataset.projectUrl || '#';
                const carColor = COLOR_PALETTE[index % COLOR_PALETTE.length];
                const rgb = this.hexToRgb(carColor);

                entry.dataset.projectUrl = href;
                entry.dataset.driverCode = code;
                entry.dataset.driverColor = carColor;
                entry.style.setProperty('--driver-accent', carColor);
                entry.style.setProperty('--driver-accent-rgb', `${rgb.r} ${rgb.g} ${rgb.b}`);
                
                // Attach click handler once when collecting drivers
                if (href && href !== '#') {
                    entry.removeAttribute('onclick'); // Remove inline onclick
                    entry.style.cursor = 'pointer';
                    entry.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.location.href = href;
                    });
                }

                return {
                    id: index,
                    name,
                    code,
                    projectUrl: href,
                    entryElement: entry,
                    positionElement: entry.querySelector('.f1-position'),
                    intervalElement: entry.querySelector('.f1-interval'),
                    statusElement: entry.querySelector('.f1-status'),
                    gridIndex: index,
                    carColor,
                };
            }).filter(Boolean);
        }

        createCars() {
            if (!this.trackLength) return;
            const fragment = document.createDocumentFragment();
            this.cars = this.drivers.map((driver, index) => {
                const carColor = driver.carColor || COLOR_PALETTE[index % COLOR_PALETTE.length];
                const carButton = document.createElement('button');
                carButton.type = 'button';
                carButton.className = 'f1-car';
                carButton.setAttribute('aria-label', `${driver.name} – view project`);
                carButton.style.setProperty('--car-accent', carColor);
                
                // Create car image with color filter
                const carImage = document.createElement('img');
                carImage.src = CAR_IMAGE;
                carImage.alt = '';
                carImage.className = 'f1-car-image';
                carImage.loading = 'lazy';
                
                // Combine color filter with drop-shadow effects
                const colorFilter = hexToFilter(carColor);
                const rgb = hexToRgb(carColor);
                const dropShadow1 = `drop-shadow(0 6px 12px rgba(0, 0, 0, 0.6))`;
                const dropShadow2 = rgb ? `drop-shadow(0 0 14px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5))` : '';
                const baseFilter = `${colorFilter} ${dropShadow1} ${dropShadow2}`.trim();
                carImage.style.filter = baseFilter;
                
                // Store base filter for hover effects
                carImage.dataset.baseFilter = baseFilter;
                
                // Handle hover to enhance brightness/saturation while preserving color
                carButton.addEventListener('mouseenter', () => {
                    carImage.style.filter = `${baseFilter} brightness(1.2) saturate(120%)`;
                });
                carButton.addEventListener('mouseleave', () => {
                    carImage.style.filter = baseFilter;
                });
                
                const carNumber = document.createElement('span');
                carNumber.className = 'f1-car-number';
                carNumber.setAttribute('aria-hidden', 'true');
                carNumber.textContent = driver.code;
                
                carButton.appendChild(carImage);
                carButton.appendChild(carNumber);

                if (driver.projectUrl && driver.projectUrl !== '#') {
                    carButton.addEventListener('click', () => {
                        window.location.href = driver.projectUrl;
                    });
                }

                fragment.appendChild(carButton);

                return {
                    ...driver,
                    element: carButton,
                    carColor,
                    totalDistance: index * 5,
                    speed: this.computeSpeed(index),
                    jitterOffset: Math.random() * Math.PI * 2,
                    boostWindow: randBetween(4000, 7000),
                    finished: false,
                    currentLap: 1,
                    trackOffset: (Math.random() - 0.5) * 25,
                    rotation: null,
                    lastPosition: null,
                };
            });

            this.carLayer.appendChild(fragment);
        }

        resetCars() {
            this.cars.forEach((car, index) => {
                car.totalDistance = -index * 25;
                car.speed = this.computeSpeed(index);
                car.finished = false;
                car.currentLap = 1;
                car.rotation = null;
                car.lastPosition = null;
            });
            this.updateTelemetry(this.cars);
            this.cars.forEach(c => this.renderCar(c));
        }

        computeSpeed(index) {
            const baseLapMs = randBetween(11000, 17000);
            const baseSpeed = this.trackLength / baseLapMs;
            const variance = 0.9 + Math.random() * 0.25 + index * 0.005;
            return baseSpeed * variance;
        }

        attachResizeHandling() {
            window.addEventListener('resize', this.resizeHandler);
        }

        startRace() {
            this.raceActive = true;
            this.lastTimestamp = performance.now();
            requestAnimationFrame(this.rafCallback);
        }

        tick(timestamp) {
            if (!this.raceActive) return;
            const delta = timestamp - (this.lastTimestamp || timestamp);
            this.lastTimestamp = timestamp;
            this.updateRace(delta, timestamp);

            if (this.raceActive) {
                requestAnimationFrame(this.rafCallback);
            }
        }

        updateRace(delta, timestamp) {
            if (!this.trackPath || !this.cars.length) return;
            const motionScale = this.reduceMotion ? 0.35 : 1;

            this.cars.forEach((car) => {
                if (car.finished) return;
                const fatigue = 1 - (car.totalDistance / this.raceDistance) * 0.15;
                const oscillation = Math.sin((timestamp + car.jitterOffset) / (car.boostWindow)) * 0.05;
                const randomness = (Math.random() - 0.5) * 0.015;
                const gain = car.speed * delta * (1 + (oscillation + randomness) * motionScale) * fatigue;

                car.totalDistance += gain;

                if (car.totalDistance >= this.raceDistance) {
                    car.totalDistance = this.raceDistance;
                    car.finished = true;
                    car.currentLap = this.totalLaps;
                } else {
                    const completed = Math.floor(car.totalDistance / this.trackLength);
                    car.currentLap = Math.min(this.totalLaps, completed + 1);
                }
            });

            const ordered = [...this.cars].sort((a, b) => {
                if (b.totalDistance === a.totalDistance) {
                    return a.gridIndex - b.gridIndex;
                }
                return b.totalDistance - a.totalDistance;
            });

            this.updateTelemetry(ordered);
            ordered.forEach((car) => this.renderCar(car));
            this.updateLapInfo(ordered[0]);

            if (ordered.every((car) => car.finished)) {
                this.raceActive = false;
                if (this.lapInfoElement) {
                    this.lapInfoElement.textContent = `CHEQUERED FLAG · ${this.totalLaps} LAPS`;
                }
            }
        }

        updateTelemetry(sortedCars) {
            if (!this.telemetryList || !sortedCars.length) return;
            const fragment = document.createDocumentFragment();
            const leader = sortedCars[0];
            const leaderDistance = leader?.totalDistance || 0;

            sortedCars.forEach((car, index) => {
                const entry = car.entryElement;
                if (!entry) return;

                if (car.positionElement) {
                    car.positionElement.textContent = index + 1;
                }

                if (car.intervalElement) {
                    if (index === 0) {
                        car.intervalElement.textContent = '---';
                    } else {
                        const gap = Math.max(0, leaderDistance - car.totalDistance);
                        const seconds = gap / (this.unitsPerSecond || 1);
                        car.intervalElement.textContent = `+${seconds.toFixed(2)}s`;
                    }
                }

                if (car.statusElement) {
                    car.statusElement.textContent = car.finished ? 'FINISHED' : `LAP ${car.currentLap}`;
                    car.statusElement.classList.toggle('is-finished', Boolean(car.finished));
                }

                fragment.appendChild(entry);
            });

            this.telemetryList.appendChild(fragment);
        }

        renderCar(car) {
            if (!this.viewportMetrics || !this.trackPath || !car.element) return;
            const rawLapPosition = car.finished
                ? this.trackLength - 0.001
                : ((car.totalDistance % this.trackLength) + this.trackLength) % this.trackLength;

            const position = this.clamp(rawLapPosition, 0, this.trackLength - 0.001);
            
            // Normalize lastPosition to 0-trackLength range
            let normalizedLastPosition = typeof car.lastPosition === 'number'
                ? ((car.lastPosition % this.trackLength) + this.trackLength) % this.trackLength
                : null;
            
            // If lastPosition is not set or we've wrapped around, use a small lookback
            let previousPosition;
            if (normalizedLastPosition === null) {
                previousPosition = (position - Math.max(1.5, this.trackLength * 0.0025) + this.trackLength) % this.trackLength;
            } else {
                // Check if we've crossed the lap boundary
                const distanceTraveled = position - normalizedLastPosition;
                
                // If we've moved backwards more than half the track, we've wrapped forward
                if (distanceTraveled < -this.trackLength / 2) {
                    previousPosition = normalizedLastPosition;
                } 
                // If we've moved forward more than half the track, we've wrapped backward (shouldn't happen, but handle it)
                else if (distanceTraveled > this.trackLength / 2) {
                    previousPosition = normalizedLastPosition;
                } else {
                    previousPosition = normalizedLastPosition;
                }
            }

            // Use a small lookahead for smooth rotation calculation
            const lookahead = Math.max(1.5, this.trackLength * 0.0025);
            const nextPosition = (position + lookahead) % this.trackLength;
            
            const prevPoint = this.trackPath.getPointAtLength(previousPosition);
            const nextPoint = this.trackPath.getPointAtLength(nextPosition);

            const { offsetX, offsetY, scaleX, scaleY } = this.viewportMetrics;
            const angle = Math.atan2(nextPoint.y - prevPoint.y, nextPoint.x - prevPoint.x);
            let degrees = (angle * 180) / Math.PI;

            if (car.rotation === null) {
                car.rotation = degrees;
            }

            let diff = degrees - car.rotation;
            if (diff > 180) {
                diff -= 360;
            } else if (diff < -180) {
                diff += 360;
            }

            const smoothing = 0.12;
            car.rotation += diff * smoothing;

            // Get the current point for positioning
            const currPoint = this.trackPath.getPointAtLength(position);
            const normal = angle + Math.PI / 2;
            const carX = currPoint.x + Math.cos(normal) * car.trackOffset;
            const carY = currPoint.y + Math.sin(normal) * car.trackOffset;

            const left = offsetX + carX * scaleX - 25;
            const top = offsetY + carY * scaleY - 12;
            
            car.element.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0) rotate(${car.rotation.toFixed(2)}deg)`;
            
            // Always update lastPosition to the normalized position
            car.lastPosition = position;
        }

        updateLapInfo(leader) {
            if (!this.lapInfoElement || !leader) return;
            const leaderLap = Math.min(this.totalLaps, leader.currentLap);
            if (leaderLap >= this.totalLaps) {
                this.lapInfoElement.textContent = `FINAL LAP ${this.totalLaps}/${this.totalLaps}`;
            } else {
                this.lapInfoElement.textContent = `LAP ${leaderLap}/${this.totalLaps}`;
            }
        }

        updateViewportMetrics() {
            if (!this.svg || !this.stage) return;
            const svgRect = this.svg.getBoundingClientRect();
            const stageRect = this.stage.getBoundingClientRect();
            this.viewportMetrics = {
                offsetX: svgRect.left - stageRect.left,
                offsetY: svgRect.top - stageRect.top,
                scaleX: svgRect.width / VIEWBOX.width,
                scaleY: svgRect.height / VIEWBOX.height,
            };
        }

        showEmptyState() {
            const placeholder = document.createElement('div');
            placeholder.className = 'f1-track-placeholder';
            placeholder.innerHTML = `
                <div class="f1-placeholder-content">
                    <div class="f1-placeholder-icon">🏎️</div>
                    <h3 class="f1-placeholder-title">Add projects to start the grid</h3>
                    <p class="f1-placeholder-text">The circuit activates once projects are available.</p>
                </div>
            `;
            this.container.appendChild(placeholder);
        }

        hexToRgb(hex) {
            const normalized = hex.replace('#', '');
            if (normalized.length !== 6) {
                return { r: 255, g: 56, b: 96 };
            }
            const bigint = parseInt(normalized, 16);
            return {
                r: (bigint >> 16) & 255,
                g: (bigint >> 8) & 255,
                b: bigint & 255,
            };
        }

        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('f1-track-container');
        if (container) {
            const race = new ProjectGrandPrix(container);
            race.init();
        }
    });
})();
