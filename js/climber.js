// Autonomous Camera Explorer - Searching for the Elusive Cube
(function() {
    window.Climber = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        clearMemory: clearMemory
    };

    const canvas = document.getElementById('climber-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Color palette - three muted tones
    const colors = {
        primary: '#8B7355',   // Muted brown
        secondary: '#A69080', // Light brown
        accent: '#6B5B73'     // Muted purple
    };

    // The elusive black cube that tries to escape
    const hiddenCube = {
        x: 0,
        y: 0,
        z: 0,
        size: 12,
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        speed: 0.6, // Slower movement
        escapeRadius: 400, // Larger escape radius
        pulseTime: 0,
        visible: true, // Always visible now
        alpha: 1.0
    };

    // Autonomous camera explorer with zoom
    const camera = {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        zoom: 0.6,
        targetZoom: 0.6,
        explorationMode: 'tracking', // Always tracking
        moveSpeed: 0.001, // Much slower
        trackingDistance: 800, // Further back
        followDelay: 60 // Frames to wait before following
    };

    // 3D boxes in the world
    const boxes = [];

    // Generate the massive 3D boxy world
    function generateWorld() {
        boxes.length = 0;
        
        // Create main city-like grid formations
        for (let gridX = -3; gridX <= 3; gridX++) {
            for (let gridY = -3; gridY <= 3; gridY++) {
                const centerX = gridX * canvas.width * 1.5;
                const centerY = gridY * canvas.height * 1.5;
                
                // Dense urban clusters
                for (let cluster = 0; cluster < 15; cluster++) {
                    const clusterX = centerX + (Math.random() - 0.5) * canvas.width;
                    const clusterY = centerY + (Math.random() - 0.5) * canvas.height;
                    const clusterZ = Math.random() * 400;
                    
                    // Each cluster has 15-30 boxes
                    const boxCount = Math.floor(Math.random() * 16) + 15;
                    
                    for (let i = 0; i < boxCount; i++) {
                        const angle = (i / boxCount) * Math.PI * 2 + Math.random() * 0.5;
                        const distance = Math.random() * 200 + 30;
                        const height = Math.random() * 150 + 10;
                        
                        boxes.push({
                            x: clusterX + Math.cos(angle) * distance + (Math.random() - 0.5) * 100,
                            y: clusterY + Math.sin(angle) * distance + (Math.random() - 0.5) * 100,
                            z: clusterZ + (Math.random() - 0.5) * 200,
                            width: Math.random() * 80 + 15,
                            height: height,
                            depth: Math.random() * 80 + 15,
                            colorType: Math.floor(Math.random() * 3)
                        });
                    }
                }
                
                // Add some towering structures
                for (let tower = 0; tower < 8; tower++) {
                    const towerX = centerX + (Math.random() - 0.5) * canvas.width * 0.8;
                    const towerY = centerY + (Math.random() - 0.5) * canvas.height * 0.8;
                    
                    // Stack boxes vertically
                    for (let level = 0; level < 12; level++) {
                        boxes.push({
                            x: towerX + (Math.random() - 0.5) * 40,
                            y: towerY + (Math.random() - 0.5) * 40,
                            z: level * 80 + Math.random() * 20,
                            width: Math.random() * 60 + 20,
                            height: Math.random() * 60 + 20,
                            depth: Math.random() * 60 + 20,
                            colorType: Math.floor(Math.random() * 3)
                        });
                    }
                }
            }
        }
        
        // Add scattered bridge-like formations
        for (let bridge = 0; bridge < 25; bridge++) {
            const startX = (Math.random() - 0.5) * canvas.width * 8;
            const startY = (Math.random() - 0.5) * canvas.height * 8;
            const endX = startX + (Math.random() - 0.5) * 800;
            const endY = startY + (Math.random() - 0.5) * 800;
            const bridgeZ = Math.random() * 300 + 100;
            
            const segments = Math.floor(Math.random() * 20) + 10;
            for (let i = 0; i < segments; i++) {
                const t = i / segments;
                boxes.push({
                    x: startX + (endX - startX) * t,
                    y: startY + (endY - startY) * t,
                    z: bridgeZ + Math.sin(t * Math.PI) * 50,
                    width: Math.random() * 40 + 25,
                    height: Math.random() * 30 + 10,
                    depth: Math.random() * 40 + 25,
                    colorType: Math.floor(Math.random() * 3)
                });
            }
        }
        
        // Add circular formations
        for (let circle = 0; circle < 20; circle++) {
            const circleX = (Math.random() - 0.5) * canvas.width * 6;
            const circleY = (Math.random() - 0.5) * canvas.height * 6;
            const circleZ = Math.random() * 350;
            const radius = Math.random() * 300 + 100;
            const boxCount = Math.floor(Math.random() * 25) + 15;
            
            for (let i = 0; i < boxCount; i++) {
                const angle = (i / boxCount) * Math.PI * 2;
                const r = radius + (Math.random() - 0.5) * 80;
                
                boxes.push({
                    x: circleX + Math.cos(angle) * r,
                    y: circleY + Math.sin(angle) * r,
                    z: circleZ + (Math.random() - 0.5) * 100,
                    width: Math.random() * 70 + 20,
                    height: Math.random() * 90 + 15,
                    depth: Math.random() * 70 + 20,
                    colorType: Math.floor(Math.random() * 3)
                });
            }
        }
        
        // Add spiral formations
        for (let spiral = 0; spiral < 15; spiral++) {
            const spiralX = (Math.random() - 0.5) * canvas.width * 7;
            const spiralY = (Math.random() - 0.5) * canvas.height * 7;
            const spiralBoxes = Math.floor(Math.random() * 40) + 20;
            
            for (let i = 0; i < spiralBoxes; i++) {
                const angle = (i / spiralBoxes) * Math.PI * 6;
                const radius = i * 8 + 50;
                
                boxes.push({
                    x: spiralX + Math.cos(angle) * radius,
                    y: spiralY + Math.sin(angle) * radius,
                    z: i * 15 + Math.random() * 50,
                    width: Math.random() * 50 + 15,
                    height: Math.random() * 60 + 10,
                    depth: Math.random() * 50 + 15,
                    colorType: Math.floor(Math.random() * 3)
                });
            }
        }
        
        // Add random scattered boxes throughout
        for (let scattered = 0; scattered < 800; scattered++) {
            boxes.push({
                x: (Math.random() - 0.5) * canvas.width * 10,
                y: (Math.random() - 0.5) * canvas.height * 10,
                z: Math.random() * 500,
                width: Math.random() * 100 + 10,
                height: Math.random() * 120 + 8,
                depth: Math.random() * 100 + 10,
                colorType: Math.floor(Math.random() * 3)
            });
        }
        
        // Add massive corner monuments
        for (let corner = 0; corner < 4; corner++) {
            const cornerX = (corner % 2 === 0 ? -1 : 1) * canvas.width * 3;
            const cornerY = (corner < 2 ? -1 : 1) * canvas.height * 3;
            
            // Create massive structure
            for (let monument = 0; monument < 60; monument++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 400 + 100;
                
                boxes.push({
                    x: cornerX + Math.cos(angle) * distance,
                    y: cornerY + Math.sin(angle) * distance,
                    z: Math.random() * 600,
                    width: Math.random() * 120 + 30,
                    height: Math.random() * 150 + 40,
                    depth: Math.random() * 120 + 30,
                    colorType: Math.floor(Math.random() * 3)
                });
            }
        }
        
        // Place the elusive cube
        placeHiddenCube();
        
        console.log(`Generated ${boxes.length} boxes in the world`);
        console.log(`Elusive cube placed at: ${hiddenCube.x.toFixed(0)}, ${hiddenCube.y.toFixed(0)}, ${hiddenCube.z.toFixed(0)}`);
    }

    function placeHiddenCube() {
        // Place the cube somewhere among the structures
        const randomBox = boxes[Math.floor(Math.random() * boxes.length)];
        hiddenCube.x = randomBox.x + (Math.random() - 0.5) * 300;
        hiddenCube.y = randomBox.y + (Math.random() - 0.5) * 300;
        hiddenCube.z = randomBox.z + Math.random() * 100;
        
        // Initialize visibility state
        hiddenCube.visible = true;
        hiddenCube.alpha = 1.0;
    }

    // Convert 3D coordinates to 2D isometric view with zoom
    function project3D(x, y, z) {
        const iso = {
            x: (x - y) * 0.866 * camera.zoom,
            y: ((x + y) * 0.5 - z * 0.8) * camera.zoom
        };
        return iso;
    }

    function updateHiddenCube() {
        const distanceToCamera = Math.hypot(camera.x - hiddenCube.x, camera.y - hiddenCube.y);
        
        // Find the structure the cube is currently on or nearest to
        let currentStructure = null;
        let minDistance = Infinity;
        
        // Find nearby boxes to consider for movement
        const nearbyBoxes = boxes.filter(box => {
            const distance = Math.hypot(box.x - hiddenCube.x, box.y - hiddenCube.y);
            return distance < 300; // Check boxes within 300 units
        });
        
        // Find the closest structure surface the cube should be on
        for (const box of nearbyBoxes) {
            const boxLeft = box.x - box.width / 2;
            const boxRight = box.x + box.width / 2;
            const boxTop = box.y - box.depth / 2;
            const boxBottom = box.y + box.depth / 2;
            const boxZTop = box.z + box.height;
            
            // Check if cube is above this box (on top surface)
            if (hiddenCube.x >= boxLeft - 10 && hiddenCube.x <= boxRight + 10 &&
                hiddenCube.y >= boxTop - 10 && hiddenCube.y <= boxBottom + 10) {
                const distanceToTop = Math.abs(hiddenCube.z - boxZTop);
                if (distanceToTop < minDistance) {
                    minDistance = distanceToTop;
                    currentStructure = {
                        box: box,
                        surface: 'top',
                        targetZ: boxZTop + hiddenCube.size / 2
                    };
                }
            }
            
            // Check side surfaces if cube is at the right height
            if (hiddenCube.z >= box.z && hiddenCube.z <= boxZTop + 20) {
                // Left side
                if (Math.abs(hiddenCube.x - boxLeft) < 15 &&
                    hiddenCube.y >= boxTop - 10 && hiddenCube.y <= boxBottom + 10) {
                    const distance = Math.abs(hiddenCube.x - boxLeft);
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentStructure = {
                            box: box,
                            surface: 'left',
                            targetX: boxLeft - hiddenCube.size / 2
                        };
                    }
                }
                
                // Right side
                if (Math.abs(hiddenCube.x - boxRight) < 15 &&
                    hiddenCube.y >= boxTop - 10 && hiddenCube.y <= boxBottom + 10) {
                    const distance = Math.abs(hiddenCube.x - boxRight);
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentStructure = {
                            box: box,
                            surface: 'right',
                            targetX: boxRight + hiddenCube.size / 2
                        };
                    }
                }
                
                // Front side
                if (Math.abs(hiddenCube.y - boxTop) < 15 &&
                    hiddenCube.x >= boxLeft - 10 && hiddenCube.x <= boxRight + 10) {
                    const distance = Math.abs(hiddenCube.y - boxTop);
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentStructure = {
                            box: box,
                            surface: 'front',
                            targetY: boxTop - hiddenCube.size / 2
                        };
                    }
                }
                
                // Back side
                if (Math.abs(hiddenCube.y - boxBottom) < 15 &&
                    hiddenCube.x >= boxLeft - 10 && hiddenCube.x <= boxRight + 10) {
                    const distance = Math.abs(hiddenCube.y - boxBottom);
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentStructure = {
                            box: box,
                            surface: 'back',
                            targetY: boxBottom + hiddenCube.size / 2
                        };
                    }
                }
            }
        }
        
        // If no structure found nearby, find the closest one to hop to
        if (!currentStructure || minDistance > 50) {
            let closestBox = null;
            let closestDistance = Infinity;
            
            for (const box of boxes) {
                const distance = Math.hypot(box.x - hiddenCube.x, box.y - hiddenCube.y);
                if (distance < closestDistance && distance < 800) { // Only consider boxes within hopping range
                    closestDistance = distance;
                    closestBox = box;
                }
            }
            
            if (closestBox) {
                // Hop to the top of the closest structure
                const hopSpeed = 0.05;
                const targetX = closestBox.x + (Math.random() - 0.5) * closestBox.width * 0.8;
                const targetY = closestBox.y + (Math.random() - 0.5) * closestBox.depth * 0.8;
                const targetZ = closestBox.z + closestBox.height + hiddenCube.size / 2;
                
                hiddenCube.x += (targetX - hiddenCube.x) * hopSpeed;
                hiddenCube.y += (targetY - hiddenCube.y) * hopSpeed;
                hiddenCube.z += (targetZ - hiddenCube.z) * hopSpeed;
                
                return; // Skip normal movement while hopping
            }
        }
        
        // Snap to the current structure surface
        if (currentStructure) {
            const snapSpeed = 0.1;
            
            switch (currentStructure.surface) {
                case 'top':
                    hiddenCube.z += (currentStructure.targetZ - hiddenCube.z) * snapSpeed;
                    break;
                case 'left':
                    hiddenCube.x += (currentStructure.targetX - hiddenCube.x) * snapSpeed;
                    break;
                case 'right':
                    hiddenCube.x += (currentStructure.targetX - hiddenCube.x) * snapSpeed;
                    break;
                case 'front':
                    hiddenCube.y += (currentStructure.targetY - hiddenCube.y) * snapSpeed;
                    break;
                case 'back':
                    hiddenCube.y += (currentStructure.targetY - hiddenCube.y) * snapSpeed;
                    break;
            }
        }
        
        // Movement along structure surfaces
        if (currentStructure) {
            // Random movement along the surface
            const moveSpeed = 0.3;
            const randomDirection = Math.random() * Math.PI * 2;
            
            // Gentle escape behavior when camera gets close
            let moveX = Math.cos(randomDirection) * moveSpeed;
            let moveY = Math.sin(randomDirection) * moveSpeed;
            
            if (distanceToCamera < hiddenCube.escapeRadius) {
                const escapeAngle = Math.atan2(hiddenCube.y - camera.y, hiddenCube.x - camera.x);
                moveX += Math.cos(escapeAngle) * 0.5;
                moveY += Math.sin(escapeAngle) * 0.5;
            }
            
            // Apply movement based on surface type
            const box = currentStructure.box;
            const boxLeft = box.x - box.width / 2;
            const boxRight = box.x + box.width / 2;
            const boxTop = box.y - box.depth / 2;
            const boxBottom = box.y + box.depth / 2;
            
            switch (currentStructure.surface) {
                case 'top':
                    // Move freely on top surface, but stay within bounds
                    const newX = hiddenCube.x + moveX;
                    const newY = hiddenCube.y + moveY;
                    
                    if (newX >= boxLeft + hiddenCube.size/2 && newX <= boxRight - hiddenCube.size/2) {
                        hiddenCube.x = newX;
                    }
                    if (newY >= boxTop + hiddenCube.size/2 && newY <= boxBottom - hiddenCube.size/2) {
                        hiddenCube.y = newY;
                    }
                    break;
                    
                case 'left':
                case 'right':
                    // Move along Y axis and Z axis on side surfaces
                    const newYSide = hiddenCube.y + moveY;
                    const newZSide = hiddenCube.z + moveX; // Use moveX for Z movement
                    
                    if (newYSide >= boxTop + hiddenCube.size/2 && newYSide <= boxBottom - hiddenCube.size/2) {
                        hiddenCube.y = newYSide;
                    }
                    if (newZSide >= box.z + hiddenCube.size/2 && newZSide <= box.z + box.height - hiddenCube.size/2) {
                        hiddenCube.z = newZSide;
                    }
                    break;
                    
                case 'front':
                case 'back':
                    // Move along X axis and Z axis on front/back surfaces
                    const newXFront = hiddenCube.x + moveX;
                    const newZFront = hiddenCube.z + moveY; // Use moveY for Z movement
                    
                    if (newXFront >= boxLeft + hiddenCube.size/2 && newXFront <= boxRight - hiddenCube.size/2) {
                        hiddenCube.x = newXFront;
                    }
                    if (newZFront >= box.z + hiddenCube.size/2 && newZFront <= box.z + box.height - hiddenCube.size/2) {
                        hiddenCube.z = newZFront;
                    }
                    break;
            }
            
            // Occasionally decide to move to an adjacent structure
            if (Math.random() < 0.005) { // 0.5% chance per frame
                // Look for adjacent structures to move to
                const adjacentBoxes = nearbyBoxes.filter(otherBox => {
                    if (otherBox === box) return false;
                    const distance = Math.hypot(otherBox.x - box.x, otherBox.y - box.y);
                    return distance < 150; // Adjacent if within 150 units
                });
                
                if (adjacentBoxes.length > 0) {
                    const targetBox = adjacentBoxes[Math.floor(Math.random() * adjacentBoxes.length)];
                    // Start hopping to the adjacent structure
                    currentStructure = null; // This will trigger the hopping logic above
                }
            }
        }
        
        // Keep cube in reasonable world bounds
        const worldSize = canvas.width * 4;
        if (Math.abs(hiddenCube.x) > worldSize) {
            hiddenCube.x = Math.sign(hiddenCube.x) * worldSize * 0.9;
        }
        if (Math.abs(hiddenCube.y) > worldSize) {
            hiddenCube.y = Math.sign(hiddenCube.y) * worldSize * 0.9;
        }
        
        // Update pulse animation
        hiddenCube.pulseTime += 0.05;
    }

    function updateCamera() {
        const distanceToCube = Math.hypot(camera.x - hiddenCube.x, camera.y - hiddenCube.y);
        
        // Very slow, gentle tracking - don't predict movement as much
        camera.targetX = hiddenCube.x + hiddenCube.velocityX * 5; // Much less prediction
        camera.targetY = hiddenCube.y + hiddenCube.velocityY * 5;
        
        // Stay mostly zoomed out, only zoom in slightly when very close
        if (distanceToCube < 150) {
            camera.targetZoom = 0.8; // Slight zoom in when very close
        } else if (distanceToCube > 1000) {
            camera.targetZoom = 0.4; // Zoom out when very far
        } else {
            camera.targetZoom = 0.6; // Default zoomed out view
        }
        
        // Very slow zoom changes
        camera.zoom += (camera.targetZoom - camera.zoom) * 0.005;
        
        // Very slow camera movement - lazy following
        camera.x += (camera.targetX - camera.x) * camera.moveSpeed;
        camera.y += (camera.targetY - camera.y) * camera.moveSpeed;
        
        // Only make small adjustments if cube gets way off screen
        const screenDistance = Math.hypot(
            (hiddenCube.x - camera.x) * camera.zoom,
            (hiddenCube.y - camera.y) * camera.zoom
        );
        
        // Much more lenient - only adjust if cube is really far off screen
        if (screenDistance > Math.min(canvas.width, canvas.height) * 0.6) {
            // Very gentle pull towards cube
            camera.x += (hiddenCube.x - camera.x) * 0.002;
            camera.y += (hiddenCube.y - camera.y) * 0.002;
        }
    }

    function drawBox(box) {
        const pos = project3D(box.x - camera.x, box.y - camera.y, box.z);
        const screenX = pos.x + canvas.width/2;
        const screenY = pos.y + canvas.height/2;

        // Cull boxes that are too far off screen
        if (screenX < -300 || screenX > canvas.width + 300 || 
            screenY < -300 || screenY > canvas.height + 300) {
            return;
        }

        // Get the appropriate color
        let boxColor;
        switch(box.colorType) {
            case 0: boxColor = colors.primary; break;
            case 1: boxColor = colors.secondary; break;
            case 2: boxColor = colors.accent; break;
        }

        // Draw the 3D box using isometric projection
        const w = box.width * 0.866 * camera.zoom;
        const h = box.height * 0.5 * camera.zoom;
        const d = box.depth * 0.866 * camera.zoom;
        const dh = box.depth * 0.5 * camera.zoom;

        // Top face
        ctx.fillStyle = boxColor;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + w, screenY + h);
        ctx.lineTo(screenX + w - d, screenY + h - dh);
        ctx.lineTo(screenX - d, screenY - dh);
        ctx.closePath();
        ctx.fill();

        // Left face (darker)
        ctx.fillStyle = shadeColor(boxColor, -25);
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX - d, screenY - dh);
        ctx.lineTo(screenX - d, screenY - dh + box.height * camera.zoom);
        ctx.lineTo(screenX, screenY + box.height * camera.zoom);
        ctx.closePath();
        ctx.fill();

        // Right face (lighter)
        ctx.fillStyle = shadeColor(boxColor, 15);
        ctx.beginPath();
        ctx.moveTo(screenX + w, screenY + h);
        ctx.lineTo(screenX + w - d, screenY + h - dh);
        ctx.lineTo(screenX + w - d, screenY + h - dh + box.height * camera.zoom);
        ctx.lineTo(screenX + w, screenY + h + box.height * camera.zoom);
        ctx.closePath();
        ctx.fill();
    }

    function drawHiddenCube() {
        // Only draw if cube is visible
        if (!hiddenCube.visible) {
            return;
        }
        
        const pos = project3D(hiddenCube.x - camera.x, hiddenCube.y - camera.y, hiddenCube.z);
        const screenX = pos.x + canvas.width/2;
        const screenY = pos.y + canvas.height/2;

        // Only draw if on screen
        if (screenX < -100 || screenX > canvas.width + 100 || 
            screenY < -100 || screenY > canvas.height + 100) {
            return;
        }

        hiddenCube.pulseTime += 0.05;
        const pulse = Math.sin(hiddenCube.pulseTime) * 0.2 + 0.8;
        const size = hiddenCube.size * pulse * camera.zoom;

        // Draw elusive black cube with slight transparency when about to disappear
        const alpha = hiddenCube.alpha;
        
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
        
        // Add subtle movement trail with same alpha
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
        ctx.fillRect(
            screenX - hiddenCube.velocityX * 10 - size/2, 
            screenY - hiddenCube.velocityY * 10 - size/2, 
            size, size
        );
        
        // Add a very subtle glow when visible
        if (alpha > 0.5) {
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 3;
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
            ctx.fillRect(screenX - size/2, screenY - size/2, size, size);
            ctx.shadowBlur = 0;
        }
    }

    function shadeColor(color, percent) {
        const f = parseInt(color.slice(1), 16);
        const t = percent < 0 ? 0 : 255;
        const p = percent < 0 ? percent * -1 : percent;
        const R = f >> 16;
        const G = f >> 8 & 0x00FF;
        const B = f & 0x0000FF;
        return "#" + (0x1000000 + (Math.round((t - R) * p / 100) + R) * 0x10000 + 
                     (Math.round((t - G) * p / 100) + G) * 0x100 + 
                     (Math.round((t - B) * p / 100) + B)).toString(16).slice(1);
    }

    function draw() {
        // Clear with the primary color as background
        ctx.fillStyle = shadeColor(colors.primary, -50);
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sort boxes by depth for proper rendering - only visible ones
        const visibleBoxes = boxes.filter(box => {
            const pos = project3D(box.x - camera.x, box.y - camera.y, box.z);
            const screenX = pos.x + canvas.width/2;
            const screenY = pos.y + canvas.height/2;
            return screenX > -300 && screenX < canvas.width + 300 && 
                   screenY > -300 && screenY < canvas.height + 300;
        });

        const sortedBoxes = visibleBoxes.sort((a, b) => 
            (b.x + b.y - b.z) - (a.x + a.y - a.z)
        );

        // Draw all visible boxes
        sortedBoxes.forEach(box => drawBox(box));

        // Draw the elusive cube
        drawHiddenCube();

        // Draw exploration info
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '11px "Courier New"';
        ctx.fillText(`Mode: ${camera.explorationMode}`, 10, 20);
        ctx.fillText(`Tracking Distance: ${camera.trackingDistance.toFixed(0)}`, 10, 35);
        ctx.fillText(`Zoom: ${camera.zoom.toFixed(2)}`, 10, 50);
        
        const distance = Math.hypot(camera.x - hiddenCube.x, camera.y - hiddenCube.y);
        ctx.fillText(`Distance: ${distance.toFixed(0)}`, 10, 65);
        
        ctx.fillText('CUBE DRIFTING & EXPLORING', 10, 80);
        
        // Show cube status
        const cubeSpeed = Math.hypot(hiddenCube.velocityX, hiddenCube.velocityY);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillText(`Cube Speed: ${cubeSpeed.toFixed(2)}`, 10, 95);
        ctx.fillText(`Cube Z: ${hiddenCube.z.toFixed(0)}`, 10, 110);
        
        // Show nearby environment interactions
        const nearbyBoxCount = boxes.filter(box => {
            const dist = Math.hypot(box.x - hiddenCube.x, box.y - hiddenCube.y);
            return dist < 200;
        }).length;
        ctx.fillText(`Nearby Structures: ${nearbyBoxCount}`, 10, 125);
    }

    function animate() {
        if (!Climber.active) return;
        
        updateHiddenCube();
        updateCamera();
        draw();
        Climber.animationId = requestAnimationFrame(animate);
    }

    function init() {
        console.log('Initializing Elusive Cube Chase...');
        resizeCanvas();
        generateWorld();
        Climber.active = true;
        animate();
    }

    function stopAnimation() {
        Climber.active = false;
        if (Climber.animationId) {
            cancelAnimationFrame(Climber.animationId);
            Climber.animationId = null;
        }
    }

    function clearMemory() {
        stopAnimation();
        boxes.length = 0;
    }

    if (canvas.classList.contains('active')) {
        init();
    }
})(); 