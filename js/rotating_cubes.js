// Cubes Container-Filling Visualization
(function() {
    const RotatingCubes = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        clearMemory: clearMemory
    };
    
    window.RotatingCubes = RotatingCubes;

    let canvas, ctx;
    let cubes = [];
    let gravity = 0.3;
    let groundLevel;
    let spawnTimer = 0;
    let spawnInterval = 60; // Faster spawn rate (was 200ms)
    let fillLevel = 0; // Track how full the container is
    let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        groundLevel = canvas.height - 20;
    }
    
    const COLORS = {
        background: '#0a0d14',
        backgroundGradientTop: '#0a0d14',
        backgroundGradientBottom: '#141a24',
        cubeColor1: '#2d3748',
        cubeColor2: '#3d4a5e',
        cubeColor3: '#1d2a3e',
        cubeColor4: '#4a5d82',
        cubeColor5: '#2a3a5a'
    };

    // Pre-compute RGB values
    const CUBE_COLORS = [
        { r: parseInt(COLORS.cubeColor1.slice(1, 3), 16),
          g: parseInt(COLORS.cubeColor1.slice(3, 5), 16),
          b: parseInt(COLORS.cubeColor1.slice(5, 7), 16) },
        { r: parseInt(COLORS.cubeColor2.slice(1, 3), 16),
          g: parseInt(COLORS.cubeColor2.slice(3, 5), 16),
          b: parseInt(COLORS.cubeColor2.slice(5, 7), 16) },
        { r: parseInt(COLORS.cubeColor3.slice(1, 3), 16),
          g: parseInt(COLORS.cubeColor3.slice(3, 5), 16),
          b: parseInt(COLORS.cubeColor3.slice(5, 7), 16) },
        { r: parseInt(COLORS.cubeColor4.slice(1, 3), 16),
          g: parseInt(COLORS.cubeColor4.slice(3, 5), 16),
          b: parseInt(COLORS.cubeColor4.slice(5, 7), 16) },
        { r: parseInt(COLORS.cubeColor5.slice(1, 3), 16),
          g: parseInt(COLORS.cubeColor5.slice(3, 5), 16),
          b: parseInt(COLORS.cubeColor5.slice(5, 7), 16) }
    ];

    function updateCubeSettings() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const screenSize = Math.min(width, height);
        
        // Performance adjustments for mobile
        const mobileSettings = {
            size: screenSize * 0.08, // Slightly larger cubes on mobile
            maxCubes: isMobileDevice ? 400 : 1000, // Fewer cubes on mobile
            bounceEnergy: 0.4,
            friction: 0.97,
            initialVelocityX: 1.5,
            initialVelocityY: 1.5,
            rotationSpeed: isMobileDevice ? 0.008 : 0.01, // Slower rotation on mobile
            collisionPadding: 1.005,
            pushStrength: 1.5,
            settleThreshold: 1.0
        };
        
        return mobileSettings;
    }

    let CUBE_SETTINGS = updateCubeSettings();
    
    // Grid for detecting collisions more efficiently
    const GRID_CELL_SIZE = CUBE_SETTINGS.size * 1.5;
    const grid = {};
    
    function getGridKey(x, y, z) {
        const gridX = Math.floor(x / GRID_CELL_SIZE);
        const gridY = Math.floor(y / GRID_CELL_SIZE);
        const gridZ = Math.floor(z / GRID_CELL_SIZE);
        return `${gridX},${gridY},${gridZ}`;
    }
    
    function addToGrid(cube) {
        const key = getGridKey(cube.x, cube.y, cube.z);
        if (!grid[key]) {
            grid[key] = [];
        }
        grid[key].push(cube);
    }
    
    function removeFromGrid(cube) {
        const key = getGridKey(cube.x, cube.y, cube.z);
        if (grid[key]) {
            const index = grid[key].indexOf(cube);
            if (index !== -1) {
                grid[key].splice(index, 1);
            }
        }
    }
    
    function updateGrid() {
        // Clear grid
        for (const key in grid) {
            grid[key] = [];
        }
        
        // Repopulate grid
        cubes.forEach(cube => {
            addToGrid(cube);
        });
    }
    
    function getNearbyGridCells(x, y, z) {
        const centerKey = getGridKey(x, y, z);
        const centerX = Math.floor(x / GRID_CELL_SIZE);
        const centerY = Math.floor(y / GRID_CELL_SIZE);
        const centerZ = Math.floor(z / GRID_CELL_SIZE);
        
        const nearby = [];
        
        // Check surrounding cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const key = `${centerX + dx},${centerY + dy},${centerZ + dz}`;
                    if (grid[key]) {
                        nearby.push(...grid[key]);
                    }
                }
            }
        }
        
        return nearby;
    }

    // New function to check local density
    function getLocalDensity(x, y, z) {
        const nearbyCubes = getNearbyGridCells(x, y, z);
        return nearbyCubes.length;
    }

    // New function to find best spawn location
    function findBestSpawnLocation(isLargeCube = false) {
        const MAX_LOCAL_DENSITY = isLargeCube ? 4 : 8; // Lower density for large cubes
        
        // Keep evenly spaced timing but use random horizontal position
        const x = Math.random() * canvas.width; // Random position across entire width
        
        // Spawn from above the visible area
        const y = -CUBE_SETTINGS.size * (isLargeCube ? 6 : 2); // Higher spawn for large cubes
        const z = (Math.random() - 0.5) * 150;
        
        // Check if this location has acceptable density
        if (getLocalDensity(x, y, z) < MAX_LOCAL_DENSITY) {
            return { x, y, z };
        } else {
            // If density is too high, try a slightly different position
            const offset = (Math.random() - 0.5) * canvas.width * 0.2;
            const newX = Math.max(CUBE_SETTINGS.size, Math.min(canvas.width - CUBE_SETTINGS.size, x + offset));
            return { x: newX, y, z };
        }
    }

    class FillingCube {
        constructor(x, y, z, isLargeCube = false) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.isLargeCube = isLargeCube;
            this.rotationX = Math.random() * Math.PI * 2;
            this.rotationY = Math.random() * Math.PI * 2;
            this.rotationZ = Math.random() * Math.PI * 2;
            
            // Initial velocity - only downward with minimal horizontal movement
            this.velocityX = (Math.random() - 0.5) * 0.2; // Minimal horizontal movement
            this.velocityY = CUBE_SETTINGS.initialVelocityY * (isLargeCube ? 1.2 : 0.8); // Faster for large cubes
            this.velocityZ = (Math.random() - 0.5) * 0.2; // Minimal z-axis drift
            
            this.rotVelocityX = (Math.random() - 0.5) * CUBE_SETTINGS.rotationSpeed * (isLargeCube ? 0.5 : 1);
            this.rotVelocityY = (Math.random() - 0.5) * CUBE_SETTINGS.rotationSpeed * (isLargeCube ? 0.5 : 1);
            this.rotVelocityZ = (Math.random() - 0.5) * CUBE_SETTINGS.rotationSpeed * (isLargeCube ? 0.5 : 1);
            
            this.colorIndex = Math.floor(Math.random() * CUBE_COLORS.length);
            this.size = CUBE_SETTINGS.size * (isLargeCube ? 2 : (0.9 + Math.random() * 0.2));
            this.opacity = 0.8 + Math.random() * 0.2;
            this.settled = false;
            this.settling = false;
            this.settleCountdown = 30;
            
            // Large cubes have more mass
            this.mass = isLargeCube ? 4 : 1;
        }

        update() {
            if (this.settled) {
                return;
            }
            
            // Save old position for collision detection
            const oldX = this.x;
            const oldY = this.y;
            const oldZ = this.z;
            
            // Apply gravity if not settling
            if (!this.settling) {
                this.velocityY += gravity;
            }
            
            // Apply velocities
            this.x += this.velocityX;
            this.y += this.velocityY;
            this.z += this.velocityZ;
            
            // Apply rotation (slower if settling)
            const rotScale = this.settling ? 0.5 : 1.0;
            this.rotationX += this.rotVelocityX * rotScale;
            this.rotationY += this.rotVelocityY * rotScale;
            this.rotationZ += this.rotVelocityZ * rotScale;

            // Apply friction
            this.velocityX *= CUBE_SETTINGS.friction;
            this.velocityY *= CUBE_SETTINGS.friction;
            this.velocityZ *= CUBE_SETTINGS.friction;
            
            // Wall collisions
            const padding = this.size / 2;
            
            // Left wall
            if (this.x < padding) {
                this.x = padding;
                this.velocityX = Math.abs(this.velocityX) * CUBE_SETTINGS.bounceEnergy;
            }
            
            // Right wall
            if (this.x > canvas.width - padding) {
                this.x = canvas.width - padding;
                this.velocityX = -Math.abs(this.velocityX) * CUBE_SETTINGS.bounceEnergy;
            }
            
            // Floor
            if (this.y > groundLevel - padding) {
                this.y = groundLevel - padding;
                this.velocityY = -Math.abs(this.velocityY) * CUBE_SETTINGS.bounceEnergy;
                
                // Start settling if velocity is low
                if (Math.abs(this.velocityY) < 0.5 && !this.settling) {
                    this.settling = true;
                }
            }
            
            // Back and front boundaries (z-axis)
            const zBound = 200;
            if (Math.abs(this.z) > zBound) {
                this.z = Math.sign(this.z) * zBound;
                this.velocityZ = -this.velocityZ * CUBE_SETTINGS.bounceEnergy;
            }
            
            // Check cube collisions and resolve
            this.checkCollisions();
            
            // Update grid position if moved
            if (oldX !== this.x || oldY !== this.y || oldZ !== this.z) {
                removeFromGrid(this);
                addToGrid(this);
            }
            
            // If settling, count down to full settle
            if (this.settling) {
                this.settleCountdown--;
                if (this.settleCountdown <= 0 && 
                    Math.abs(this.velocityX) < 0.1 && 
                    Math.abs(this.velocityY) < 0.1 && 
                    Math.abs(this.velocityZ) < 0.1) {
                    this.settled = true;
                    this.velocityX = 0;
                    this.velocityY = 0;
                    this.velocityZ = 0;
                    this.rotVelocityX *= 0.1;
                    this.rotVelocityY *= 0.1;
                    this.rotVelocityZ *= 0.1;
                }
            }
        }
        
        checkCollisions() {
            // Get nearby cubes from grid
            const nearbyCubes = getNearbyGridCells(this.x, this.y, this.z);
            
            for (let i = 0; i < nearbyCubes.length; i++) {
                const other = nearbyCubes[i];
                if (other === this) continue;
                
                // Calculate distance between centers
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const dz = other.z - this.z;
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                // Calculate minimum distance for collision (including padding)
                const minDistance = (this.size + other.size) / 2 * CUBE_SETTINGS.collisionPadding;
                
                // If collision
                if (distance < minDistance) {
                    // Calculate collision normal
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const nz = dz / distance;
                    
                    // Calculate penetration depth
                    const penetration = minDistance - distance;
                    
                    // Resolve collision by moving cubes apart
                    const moveX = nx * penetration * 0.5;
                    const moveY = ny * penetration * 0.5;
                    const moveZ = nz * penetration * 0.5;
                    
                    // Move cubes apart (if not settled)
                    if (!this.settled) {
                        this.x -= moveX;
                        this.y -= moveY;
                        this.z -= moveZ;
                    }
                    
                    if (!other.settled) {
                        other.x += moveX;
                        other.y += moveY;
                        other.z += moveZ;
                    }
                    
                    // If one is settled, apply more bounce to the moving one
                    if (other.settled && !this.settled) {
                        // Calculate reflection vector with additional push strength
                        const vDotN = this.velocityX * nx + this.velocityY * ny + this.velocityZ * nz;
                        this.velocityX -= 2 * vDotN * nx * CUBE_SETTINGS.bounceEnergy;
                        this.velocityY -= 2 * vDotN * ny * CUBE_SETTINGS.bounceEnergy;
                        this.velocityZ -= 2 * vDotN * nz * CUBE_SETTINGS.bounceEnergy;
                        
                        // Add a little upward push to help cubes climb on top better
                        if (ny > 0.5) { // If collision is mostly from below
                            this.velocityY -= 0.7 * CUBE_SETTINGS.pushStrength;
                        }
                        
                        // Add sideways push to help fill open spaces
                        if (Math.abs(nx) > 0.7) { // If collision is mostly from side
                            // Push more toward the center of container
                            const centerX = canvas.width / 2;
                            const pushDir = this.x > centerX ? -1 : 1;
                            this.velocityX += pushDir * 0.4 * CUBE_SETTINGS.pushStrength;
                        }
                        
                        // Start settling if velocity is low after collision
                        if (Math.sqrt(this.velocityX*this.velocityX + 
                                      this.velocityY*this.velocityY + 
                                      this.velocityZ*this.velocityZ) < CUBE_SETTINGS.settleThreshold) {
                            this.settling = true;
                        }
                    } 
                    // If both are moving, exchange momentum
                    else if (!other.settled && !this.settled) {
                        // Calculate relative velocity
                        const rvx = other.velocityX - this.velocityX;
                        const rvy = other.velocityY - this.velocityY;
                        const rvz = other.velocityZ - this.velocityZ;
                        
                        // Calculate relative velocity along normal
                        const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;
                        
                        // If cubes are separating, skip
                        if (velAlongNormal > 0) continue;
                        
                        // Calculate impulse with additional push strength
                        const impulse = -velAlongNormal * CUBE_SETTINGS.bounceEnergy * CUBE_SETTINGS.pushStrength;
                        
                        // Apply impulse
                        this.velocityX -= impulse * nx;
                        this.velocityY -= impulse * ny;
                        this.velocityZ -= impulse * nz;
                        
                        other.velocityX += impulse * nx;
                        other.velocityY += impulse * ny;
                        other.velocityZ += impulse * nz;
                        
                        // Add small random perturbation to help prevent locking
                        if (Math.random() < 0.3) {
                            this.velocityX += (Math.random() - 0.5) * 0.2;
                            this.velocityZ += (Math.random() - 0.5) * 0.2;
                            
                            other.velocityX += (Math.random() - 0.5) * 0.2;
                            other.velocityZ += (Math.random() - 0.5) * 0.2;
                        }
                    }
                }
            }
        }

        draw(ctx) {
            // Create cube vertices
            const vertices = [
                { x: -this.size/2, y: -this.size/2, z: -this.size/2 },
                { x: this.size/2, y: -this.size/2, z: -this.size/2 },
                { x: this.size/2, y: this.size/2, z: -this.size/2 },
                { x: -this.size/2, y: this.size/2, z: -this.size/2 },
                { x: -this.size/2, y: -this.size/2, z: this.size/2 },
                { x: this.size/2, y: -this.size/2, z: this.size/2 },
                { x: this.size/2, y: this.size/2, z: this.size/2 },
                { x: -this.size/2, y: this.size/2, z: this.size/2 }
            ];

            // Apply rotations
            const rotatedVertices = vertices.map(v => {
                let x = v.x, y = v.y, z = v.z;
                
                // Rotate around X
                const cosX = Math.cos(this.rotationX);
                const sinX = Math.sin(this.rotationX);
                const y1 = y * cosX - z * sinX;
                const z1 = y * sinX + z * cosX;
                y = y1;
                z = z1;
                
                // Rotate around Y
                const cosY = Math.cos(this.rotationY);
                const sinY = Math.sin(this.rotationY);
                const x1 = x * cosY + z * sinY;
                const z2 = -x * sinY + z * cosY;
                x = x1;
                z = z2;
                
                // Rotate around Z
                const cosZ = Math.cos(this.rotationZ);
                const sinZ = Math.sin(this.rotationZ);
                const x2 = x * cosZ - y * sinZ;
                const y2 = x * sinZ + y * cosZ;
                x = x2;
                y = y2;
                
                return { x, y, z };
            });

            // Project vertices
            const projectedVertices = rotatedVertices.map(v => ({
                x: v.x + this.x,
                y: v.y + this.y,
                z: v.z + this.z
            }));

            // Draw faces
            const faces = [
                [0, 1, 2, 3], // front
                [4, 5, 6, 7], // back
                [0, 4, 7, 3], // left
                [1, 5, 6, 2], // right
                [0, 1, 5, 4], // top
                [3, 2, 6, 7]  // bottom
            ];

            // Sort faces by depth
            const faceDepths = faces.map((face, i) => {
                const depth = face.reduce((sum, vertexIndex) => 
                    sum + projectedVertices[vertexIndex].z, 0) / face.length;
                return { face, depth, index: i };
            });

            faceDepths.sort((a, b) => b.depth - a.depth);

            // Draw faces
            faceDepths.forEach(({ face }) => {
                const vertices = face.map(i => projectedVertices[i]);
                
                // Calculate face normal for lighting
                const v1 = { x: vertices[1].x - vertices[0].x, y: vertices[1].y - vertices[0].y };
                const v2 = { x: vertices[2].x - vertices[0].x, y: vertices[2].y - vertices[0].y };
                const normal = { x: v1.y, y: -v1.x };
                const dot = normal.x * v2.x + normal.y * v2.y;
                const isFrontFace = dot > 0;

                if (isFrontFace) {
                    const color = CUBE_COLORS[this.colorIndex];
                    
                    const lightFactor = 0.5 + Math.abs(Math.sin(this.rotationY)) * 0.3;
                    const depthFactor = 1.2 - (vertices[0].z / 800);
                    
                    const gradient = ctx.createLinearGradient(
                        vertices[0].x, vertices[0].y,
                        vertices[2].x, vertices[2].y
                    );
                    
                    const baseColor = `rgba(${color.r}, ${color.g}, ${color.b}, `;
                    const opacity = this.opacity * depthFactor;
                    gradient.addColorStop(0, baseColor + (0.3 * lightFactor * opacity) + ')');
                    gradient.addColorStop(1, baseColor + (0.15 * lightFactor * opacity) + ')');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.moveTo(vertices[0].x, vertices[0].y);
                    vertices.slice(1).forEach(v => ctx.lineTo(v.x, v.y));
                    ctx.closePath();
                    ctx.fill();

                    // Edge highlight
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 * depthFactor * opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            });
        }
    }

    function spawnCube() {
        // Determine if this should be a large cube (reduced chance on mobile)
        const isLargeCube = Math.random() < (isMobileDevice ? 0.03 : 0.05);
        
        // Use different spawn logic for large cubes
        const location = findBestSpawnLocation(isLargeCube);
        
        // Create the cube with the isLargeCube parameter
        const cube = new FillingCube(location.x, location.y, location.z, isLargeCube);
        cubes.push(cube);
        addToGrid(cube);
        
        // Log when spawning a large cube
        if (isLargeCube) {
            console.log('Spawned a large cube!');
        }
    }

    function calculateFillLevel() {
        // Find top cube
        let minY = groundLevel;
        let settledCount = 0;
        
        cubes.forEach(cube => {
            if (cube.settled) {
                minY = Math.min(minY, cube.y - cube.size/2);
                settledCount++;
            }
        });
        
        // Calculate percentage fill
        const heightFill = 1 - (minY / groundLevel);
        
        // Calculate density fill (percentage of max cubes that are settled)
        const densityFill = settledCount / CUBE_SETTINGS.maxCubes;
        
        // Return the higher of the two values
        return Math.max(heightFill, densityFill);
    }

    function init() {
        console.log('Initializing Container Filling visualization...');
        canvas = document.getElementById('rotating-cubes-canvas');
        if (!canvas) {
            console.error('Canvas not found!');
            return;
        }

        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get canvas context!');
            return;
        }

        resizeCanvas();
        CUBE_SETTINGS = updateCubeSettings();
        
        // Start with just a few cubes
        cubes = [];
        for (let i = 0; i < 3; i++) {
            spawnCube();
        }

        RotatingCubes.active = true;
        animate();
        window.addEventListener('resize', handleResize);
    }
    
    function handleResize() {
        resizeCanvas();
        CUBE_SETTINGS = updateCubeSettings();
    }

    function update() {
        // Update the fill level
        fillLevel = calculateFillLevel();
        
        // Spawn new cubes if not full
        spawnTimer += 16; // Approximately 60fps
        
        // Adjust spawn rate based on device type
        const baseInterval = isMobileDevice ? 80 : 60; // Slower spawn on mobile
        
        // Keep even timing but add slight variability
        // Each cube will still be evenly timed, but with small variations for naturality
        const currentSpawnInterval = baseInterval + (Math.random() - 0.5) * 10;
        
        if (spawnTimer >= currentSpawnInterval && fillLevel < 0.98) {
            spawnTimer = 0;
            if (cubes.length < CUBE_SETTINGS.maxCubes) {
                spawnCube();
            }
        }

        // Update cubes
        cubes.forEach(cube => cube.update());
        
        // Update grid for collision detection
        updateGrid();
        
        // Remove cubes that have fallen off-screen
        cubes = cubes.filter(cube => {
            const keep = cube.y < canvas.height + 200;
            if (!keep) {
                removeFromGrid(cube);
            }
            return keep;
        });
    }

    function draw() {
        // Clear with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, COLORS.backgroundGradientTop);
        gradient.addColorStop(1, COLORS.backgroundGradientBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw container "walls"
        ctx.strokeStyle = 'rgba(60, 70, 90, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, groundLevel);
        ctx.lineTo(canvas.width, groundLevel);
        ctx.lineTo(canvas.width, 0);
        ctx.stroke();
        
        // Draw fill level indicator
        ctx.fillStyle = 'rgba(60, 70, 90, 0.1)';
        ctx.fillRect(canvas.width - 20, groundLevel * (1 - fillLevel), 15, groundLevel * fillLevel);
        
        // Draw cubes sorted by depth
        cubes.sort((a, b) => b.z - a.z).forEach(cube => cube.draw(ctx));
    }

    function animate() {
        if (!RotatingCubes.active) return;
        
        update();
        draw();
        
        // Use setTimeout instead of requestAnimationFrame on low-end mobile devices
        // to reduce frame rate and improve performance
        if (isMobileDevice && window.devicePixelRatio < 2) {
            RotatingCubes.animationId = setTimeout(() => {
                requestAnimationFrame(animate);
            }, 1000 / 30); // Target 30fps for low-end mobile
        } else {
            RotatingCubes.animationId = requestAnimationFrame(animate);
        }
    }

    function stopAnimation() {
        console.log('Stopping Container Filling animation...');
        RotatingCubes.active = false;
        if (RotatingCubes.animationId) {
            if (isMobileDevice && window.devicePixelRatio < 2) {
                clearTimeout(RotatingCubes.animationId);
            } else {
                cancelAnimationFrame(RotatingCubes.animationId);
            }
            RotatingCubes.animationId = null;
        }
    }

    function clearMemory() {
        console.log('Clearing Container Filling memory...');
        stopAnimation();
        cubes = [];
        window.removeEventListener('resize', handleResize);
    }
})(); 