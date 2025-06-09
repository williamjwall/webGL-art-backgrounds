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
    
    // Mobile detection
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
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

    // Touch interaction variables
    const touch = {
        isActive: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        cameraOffset: { x: 0, y: 0 },
        targetOffset: { x: 0, y: 0 }
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
        alpha: 1.0,
        stuckTimer: 0,
        lastPosition: { x: 0, y: 0, z: 0 },
        stuckThreshold: 60, // frames before considering stuck
        timeSinceLastHop: 0,
        forceHopTimer: 0,
        fallbackMovement: false,
        // Added properties for better movement
        isHopping: false,
        hopProgress: 0,
        hopOrigin: { x: 0, y: 0, z: 0 },
        hopTarget: { x: 0, y: 0, z: 0 },
        failedHopAttempts: 0,
        // Motivation system for directional exploration
        motivation: {
            targetX: 0,
            targetY: 0,
            strength: 1.0, // How strongly motivated (0-1)
            timeSinceUpdate: 0,
            updateInterval: 300, // Frames between motivation updates
            explorationRadius: 2000, // How far to set exploration targets
            currentDirection: 0 // Current exploration angle
        },
        // Advanced movement system
        movement: {
            // Smooth interpolation
            targetX: 0,
            targetY: 0,
            targetZ: 0,
            smoothingFactor: 0.08, // How quickly to reach target position
            
            // Momentum and physics
            momentum: { x: 0, y: 0, z: 0 },
            friction: 0.92,
            maxMomentum: 3.0,
            
            // Path planning
            currentPath: [],
            pathIndex: 0,
            pathUpdateTimer: 0,
            pathUpdateInterval: 120, // Frames between path recalculation
            
            // Behavioral states
            behaviorState: 'exploring', // 'exploring', 'escaping', 'investigating', 'resting'
            behaviorTimer: 0,
            behaviorDuration: 0,
            
            // Surface navigation
            currentSurface: null,
            surfaceNormal: { x: 0, y: 0, z: 1 },
            surfaceConfidence: 0, // How confident we are about current surface
            
            // Intelligent decision making
            decisionCooldown: 0,
            lastDecisionTime: 0,
            explorationHistory: [], // Track where we've been
            historyMaxLength: 50
        }
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
        
        // Scale down the number of objects for mobile
        const gridExtent = isMobileDevice ? 2 : 3;
        const clustersPerGrid = isMobileDevice ? 8 : 15;
        const boxesPerCluster = isMobileDevice ? 10 : 20;
        const towersPerGrid = isMobileDevice ? 4 : 8;
        const bridgeCount = isMobileDevice ? 15 : 25;
        
        // Create main city-like grid formations
        for (let gridX = -gridExtent; gridX <= gridExtent; gridX++) {
            for (let gridY = -gridExtent; gridY <= gridExtent; gridY++) {
                const centerX = gridX * canvas.width * 1.5;
                const centerY = gridY * canvas.height * 1.5;
                
                // Dense urban clusters
                for (let cluster = 0; cluster < clustersPerGrid; cluster++) {
                    const clusterX = centerX + (Math.random() - 0.5) * canvas.width;
                    const clusterY = centerY + (Math.random() - 0.5) * canvas.height;
                    const clusterZ = Math.random() * 400;
                    
                    // Each cluster has 10-25 boxes
                    const boxCount = Math.floor(Math.random() * 16) + boxesPerCluster;
                    
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
                for (let tower = 0; tower < towersPerGrid; tower++) {
                    const towerX = centerX + (Math.random() - 0.5) * canvas.width * 0.8;
                    const towerY = centerY + (Math.random() - 0.5) * canvas.height * 0.8;
                    
                    // Stack boxes vertically - fewer on mobile
                    const levelCount = isMobileDevice ? 8 : 12;
                    for (let level = 0; level < levelCount; level++) {
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
        for (let bridge = 0; bridge < bridgeCount; bridge++) {
            const startX = (Math.random() - 0.5) * canvas.width * 8;
            const startY = (Math.random() - 0.5) * canvas.height * 8;
            const endX = startX + (Math.random() - 0.5) * 800;
            const endY = startY + (Math.random() - 0.5) * 800;
            const bridgeZ = Math.random() * 300 + 100;
            
            // Fewer segments on mobile
            const segments = Math.floor(Math.random() * (isMobileDevice ? 10 : 20)) + (isMobileDevice ? 5 : 10);
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
        // Find boxes above a certain height to ensure cube is placed on a visible surface
        const eligibleBoxes = boxes.filter(box => box.z + box.height > 50);
        
        // If no eligible boxes found, fall back to any box
        const boxPool = eligibleBoxes.length > 0 ? eligibleBoxes : boxes;
        
        // Place the cube directly on top of a box, not offset from it
        const randomBox = boxPool[Math.floor(Math.random() * boxPool.length)];
        
        // Place directly on top, with just a small random offset within the box boundaries
        hiddenCube.x = randomBox.x + (Math.random() - 0.5) * (randomBox.width * 0.5);
        hiddenCube.y = randomBox.y + (Math.random() - 0.5) * (randomBox.depth * 0.5);
        hiddenCube.z = randomBox.z + randomBox.height + hiddenCube.size / 2;
        
        // Reset movement state
        hiddenCube.velocityX = 0;
        hiddenCube.velocityY = 0;
        hiddenCube.velocityZ = 0;
        hiddenCube.isHopping = false;
        hiddenCube.stuckTimer = 0;
        hiddenCube.failedHopAttempts = 0;
        
        // Initialize motivation system with a random direction
        hiddenCube.motivation.currentDirection = Math.random() * Math.PI * 2;
        const distance = hiddenCube.motivation.explorationRadius * (0.7 + Math.random() * 0.3);
        hiddenCube.motivation.targetX = hiddenCube.x + Math.cos(hiddenCube.motivation.currentDirection) * distance;
        hiddenCube.motivation.targetY = hiddenCube.y + Math.sin(hiddenCube.motivation.currentDirection) * distance;
        hiddenCube.motivation.strength = 0.8 + Math.random() * 0.2; // Start with strong motivation
        hiddenCube.motivation.timeSinceUpdate = 0;
        
        // Store initial position to detect if it gets stuck later
        hiddenCube.lastPosition = { 
            x: hiddenCube.x, 
            y: hiddenCube.y, 
            z: hiddenCube.z 
        };
        
        // Initialize visibility state
        hiddenCube.visible = true;
        hiddenCube.alpha = 1.0;
        
        console.log(`Cube placed at: ${hiddenCube.x.toFixed(0)}, ${hiddenCube.y.toFixed(0)}, ${hiddenCube.z.toFixed(0)} on box with height ${randomBox.height}`);
        console.log(`Initial motivation: direction ${(hiddenCube.motivation.currentDirection * 180 / Math.PI).toFixed(0)}°, target (${hiddenCube.motivation.targetX.toFixed(0)}, ${hiddenCube.motivation.targetY.toFixed(0)})`);
    }

    // Convert 3D coordinates to 2D isometric view with zoom
    function project3D(x, y, z) {
        const iso = {
            x: (x - y) * 0.866 * camera.zoom,
            y: ((x + y) * 0.5 - z * 0.8) * camera.zoom
        };
        return iso;
    }

    function updateCubeMotivation() {
        hiddenCube.motivation.timeSinceUpdate++;
        
        // Update motivation target periodically or when first starting
        if (hiddenCube.motivation.timeSinceUpdate >= hiddenCube.motivation.updateInterval || 
            (hiddenCube.motivation.targetX === 0 && hiddenCube.motivation.targetY === 0)) {
            
            // Choose a new random direction to explore
            hiddenCube.motivation.currentDirection = Math.random() * Math.PI * 2;
            
            // Set target position in that direction
            const distance = hiddenCube.motivation.explorationRadius * (0.5 + Math.random() * 0.5);
            hiddenCube.motivation.targetX = hiddenCube.x + Math.cos(hiddenCube.motivation.currentDirection) * distance;
            hiddenCube.motivation.targetY = hiddenCube.y + Math.sin(hiddenCube.motivation.currentDirection) * distance;
            
            // Reset timer and set motivation strength
            hiddenCube.motivation.timeSinceUpdate = 0;
            hiddenCube.motivation.strength = 0.7 + Math.random() * 0.3; // Random strength between 0.7-1.0
            
            console.log(`Cube new motivation: direction ${(hiddenCube.motivation.currentDirection * 180 / Math.PI).toFixed(0)}°, target (${hiddenCube.motivation.targetX.toFixed(0)}, ${hiddenCube.motivation.targetY.toFixed(0)})`);
        }
        
        // Gradually reduce motivation strength over time
        hiddenCube.motivation.strength *= 0.998;
        
        // If we're close to the target, reduce motivation faster
        const distanceToTarget = Math.hypot(
            hiddenCube.motivation.targetX - hiddenCube.x,
            hiddenCube.motivation.targetY - hiddenCube.y
        );
        
        if (distanceToTarget < 300) {
            hiddenCube.motivation.strength *= 0.95; // Faster decay when near target
        }
    }

    // Advanced pathfinding algorithm
    function findOptimalPath(startX, startY, startZ, targetX, targetY, maxDistance = 800) {
        const path = [];
        const stepSize = 150; // Distance between path nodes
        const maxSteps = Math.floor(maxDistance / stepSize);
        
        // Find suitable boxes for path nodes
        const availableBoxes = boxes.filter(box => {
            const distance = Math.hypot(box.x - startX, box.y - startY);
            return distance < maxDistance && box.z + box.height > startZ - 200;
        });
        
        if (availableBoxes.length === 0) return path;
        
        // Sort boxes by a combination of distance to target and accessibility
        availableBoxes.sort((a, b) => {
            const distToTargetA = Math.hypot(a.x - targetX, a.y - targetY);
            const distToTargetB = Math.hypot(b.x - targetX, b.y - targetY);
            const distFromStartA = Math.hypot(a.x - startX, a.y - startY);
            const distFromStartB = Math.hypot(b.x - startX, b.y - startY);
            
            // Prefer boxes that are closer to target but not too far from current position
            const scoreA = distToTargetA + distFromStartA * 0.3;
            const scoreB = distToTargetB + distFromStartB * 0.3;
            
            return scoreA - scoreB;
        });
        
        // Build path using A* inspired algorithm
        let currentPos = { x: startX, y: startY, z: startZ };
        
        for (let step = 0; step < maxSteps && availableBoxes.length > 0; step++) {
            let bestBox = null;
            let bestScore = Infinity;
            
            for (let i = 0; i < Math.min(5, availableBoxes.length); i++) {
                const box = availableBoxes[i];
                const distFromCurrent = Math.hypot(box.x - currentPos.x, box.y - currentPos.y);
                const distToTarget = Math.hypot(box.x - targetX, box.y - targetY);
                const heightDiff = Math.abs(box.z + box.height - currentPos.z);
                
                // Score based on progress toward target and accessibility
                const score = distToTarget + heightDiff * 0.5 + distFromCurrent * 0.2;
                
                if (score < bestScore && distFromCurrent < stepSize * 2) {
                    bestScore = score;
                    bestBox = box;
                }
            }
            
            if (bestBox) {
                path.push({
                    x: bestBox.x + (Math.random() - 0.5) * bestBox.width * 0.6,
                    y: bestBox.y + (Math.random() - 0.5) * bestBox.depth * 0.6,
                    z: bestBox.z + bestBox.height + hiddenCube.size / 2,
                    box: bestBox
                });
                
                currentPos = path[path.length - 1];
                
                // Remove used box from available options
                const boxIndex = availableBoxes.indexOf(bestBox);
                availableBoxes.splice(boxIndex, 1);
            } else {
                break;
            }
        }
        
        return path;
    }

    // Behavioral AI system
    function updateBehaviorState() {
        const movement = hiddenCube.movement;
        const distanceToCamera = Math.hypot(camera.x - hiddenCube.x, camera.y - hiddenCube.y);
        
        movement.behaviorTimer++;
        
        // Check for behavior transitions
        switch (movement.behaviorState) {
            case 'exploring':
                // Switch to escaping if camera gets too close
                if (distanceToCamera < hiddenCube.escapeRadius) {
                    movement.behaviorState = 'escaping';
                    movement.behaviorTimer = 0;
                    movement.behaviorDuration = 180 + Math.random() * 120; // 3-5 seconds
                    console.log('Cube behavior: ESCAPING');
                }
                // Occasionally switch to investigating
                else if (Math.random() < 0.003 && movement.behaviorTimer > 300) {
                    movement.behaviorState = 'investigating';
                    movement.behaviorTimer = 0;
                    movement.behaviorDuration = 240 + Math.random() * 180; // 4-7 seconds
                    console.log('Cube behavior: INVESTIGATING');
                }
                break;
                
            case 'escaping':
                // Return to exploring when far enough or time runs out
                if (distanceToCamera > hiddenCube.escapeRadius * 1.5 || movement.behaviorTimer > movement.behaviorDuration) {
                    movement.behaviorState = 'exploring';
                    movement.behaviorTimer = 0;
                    console.log('Cube behavior: EXPLORING');
                }
                break;
                
            case 'investigating':
                // Return to exploring after investigation time
                if (movement.behaviorTimer > movement.behaviorDuration) {
                    movement.behaviorState = 'exploring';
                    movement.behaviorTimer = 0;
                    console.log('Cube behavior: EXPLORING');
                }
                // Switch to escaping if camera approaches during investigation
                else if (distanceToCamera < hiddenCube.escapeRadius * 0.7) {
                    movement.behaviorState = 'escaping';
                    movement.behaviorTimer = 0;
                    movement.behaviorDuration = 120 + Math.random() * 60;
                    console.log('Cube behavior: ESCAPING (interrupted investigation)');
                }
                break;
                
            case 'resting':
                // Return to exploring after rest
                if (movement.behaviorTimer > movement.behaviorDuration) {
                    movement.behaviorState = 'exploring';
                    movement.behaviorTimer = 0;
                    console.log('Cube behavior: EXPLORING');
                }
                break;
        }
    }

    // Smooth movement with momentum
    function applySmoothMovement() {
        const movement = hiddenCube.movement;
        
        // Calculate desired movement based on behavior
        let desiredVelX = 0, desiredVelY = 0, desiredVelZ = 0;
        
        switch (movement.behaviorState) {
            case 'exploring':
                // Move toward motivation target with path following
                if (movement.currentPath.length > 0 && movement.pathIndex < movement.currentPath.length) {
                    const targetNode = movement.currentPath[movement.pathIndex];
                    const distToNode = Math.hypot(targetNode.x - hiddenCube.x, targetNode.y - hiddenCube.y);
                    
                    if (distToNode < 50) {
                        movement.pathIndex++;
                    }
                    
                    if (movement.pathIndex < movement.currentPath.length) {
                        const currentTarget = movement.currentPath[movement.pathIndex];
                        const dirX = currentTarget.x - hiddenCube.x;
                        const dirY = currentTarget.y - hiddenCube.y;
                        const dirZ = currentTarget.z - hiddenCube.z;
                        const distance = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ);
                        
                        if (distance > 0) {
                            const speed = 0.8;
                            desiredVelX = (dirX / distance) * speed;
                            desiredVelY = (dirY / distance) * speed;
                            desiredVelZ = (dirZ / distance) * speed * 0.3; // Slower Z movement
                        }
                    }
                } else {
                    // Direct movement toward motivation target
                    const dirX = hiddenCube.motivation.targetX - hiddenCube.x;
                    const dirY = hiddenCube.motivation.targetY - hiddenCube.y;
                    const distance = Math.sqrt(dirX*dirX + dirY*dirY);
                    
                    if (distance > 0) {
                        const speed = 0.5 * hiddenCube.motivation.strength;
                        desiredVelX = (dirX / distance) * speed;
                        desiredVelY = (dirY / distance) * speed;
                    }
                }
                break;
                
            case 'escaping':
                // Move away from camera with urgency
                const escapeAngle = Math.atan2(hiddenCube.y - camera.y, hiddenCube.x - camera.x);
                const escapeSpeed = 1.2;
                desiredVelX = Math.cos(escapeAngle) * escapeSpeed;
                desiredVelY = Math.sin(escapeAngle) * escapeSpeed;
                
                // Add some randomness to escape direction
                desiredVelX += (Math.random() - 0.5) * 0.4;
                desiredVelY += (Math.random() - 0.5) * 0.4;
                break;
                
            case 'investigating':
                // Slow, careful movement with pauses
                if (movement.behaviorTimer % 60 < 30) { // Move for half the time
                    const investigateAngle = Math.random() * Math.PI * 2;
                    const investigateSpeed = 0.2;
                    desiredVelX = Math.cos(investigateAngle) * investigateSpeed;
                    desiredVelY = Math.sin(investigateAngle) * investigateSpeed;
                }
                break;
                
            case 'resting':
                // Minimal movement
                desiredVelX = (Math.random() - 0.5) * 0.1;
                desiredVelY = (Math.random() - 0.5) * 0.1;
                break;
        }
        
        // Apply momentum-based movement
        movement.momentum.x += (desiredVelX - movement.momentum.x) * 0.15;
        movement.momentum.y += (desiredVelY - movement.momentum.y) * 0.15;
        movement.momentum.z += (desiredVelZ - movement.momentum.z) * 0.1;
        
        // Apply friction
        movement.momentum.x *= movement.friction;
        movement.momentum.y *= movement.friction;
        movement.momentum.z *= movement.friction;
        
        // Limit maximum momentum
        const momentumMagnitude = Math.sqrt(
            movement.momentum.x * movement.momentum.x + 
            movement.momentum.y * movement.momentum.y
        );
        
        if (momentumMagnitude > movement.maxMomentum) {
            const scale = movement.maxMomentum / momentumMagnitude;
            movement.momentum.x *= scale;
            movement.momentum.y *= scale;
        }
        
        // Apply movement to cube position
        hiddenCube.velocityX = movement.momentum.x;
        hiddenCube.velocityY = movement.momentum.y;
        hiddenCube.velocityZ = movement.momentum.z;
    }

    // Update exploration history
    function updateExplorationHistory() {
        const movement = hiddenCube.movement;
        
        // Add current position to history every few frames
        if (movement.behaviorTimer % 30 === 0) {
            movement.explorationHistory.push({
                x: hiddenCube.x,
                y: hiddenCube.y,
                z: hiddenCube.z,
                time: Date.now()
            });
            
            // Limit history length
            if (movement.explorationHistory.length > movement.historyMaxLength) {
                movement.explorationHistory.shift();
            }
        }
    }

    function updateHiddenCube() {
        // Update all AI systems
        updateCubeMotivation();
        updateBehaviorState();
        updateExplorationHistory();
        
        const movement = hiddenCube.movement;
        
        // Check if cube is stuck by comparing current position to last position
        const movementDelta = Math.hypot(
            hiddenCube.x - hiddenCube.lastPosition.x,
            hiddenCube.y - hiddenCube.lastPosition.y,
            hiddenCube.z - hiddenCube.lastPosition.z
        );
        
        // Advanced stuck detection
        if (movementDelta < 0.05 && !hiddenCube.isHopping) {
            hiddenCube.stuckTimer++;
            if (hiddenCube.stuckTimer > 20) { // Faster response to being stuck
                console.log("Cube stuck, initiating emergency pathfinding");
                // Clear current path and force new pathfinding
                movement.currentPath = [];
                movement.pathIndex = 0;
                movement.pathUpdateTimer = movement.pathUpdateInterval;
                hiddenCube.stuckTimer = 0;
                
                // Switch to escaping behavior temporarily
                movement.behaviorState = 'escaping';
                movement.behaviorTimer = 0;
                movement.behaviorDuration = 120;
            }
        } else {
            hiddenCube.stuckTimer = 0;
        }
        
        // Update last position
        hiddenCube.lastPosition = { 
            x: hiddenCube.x, 
            y: hiddenCube.y, 
            z: hiddenCube.z 
        };
        
        // Handle hopping animation if in progress
        if (hiddenCube.isHopping) {
            hiddenCube.hopProgress += 0.06; // Slightly faster hop animation
            
            if (hiddenCube.hopProgress >= 1) {
                // Hop complete
                hiddenCube.x = hiddenCube.hopTarget.x;
                hiddenCube.y = hiddenCube.hopTarget.y;
                hiddenCube.z = hiddenCube.hopTarget.z;
                hiddenCube.isHopping = false;
                hiddenCube.hopProgress = 0;
                hiddenCube.timeSinceLastHop = 0;
                
                // Reset momentum after hop
                movement.momentum = { x: 0, y: 0, z: 0 };
                return;
            }
            
            // Smooth easing for hop animation with overshoot
            const t = hiddenCube.hopProgress;
            const ease = 1 - Math.pow(1 - t, 3); // Cubic ease-out
            
            // Dynamic hop height based on distance
            const hopDistance = Math.hypot(
                hiddenCube.hopTarget.x - hiddenCube.hopOrigin.x,
                hiddenCube.hopTarget.y - hiddenCube.hopOrigin.y
            );
            const hopHeight = Math.sin(t * Math.PI) * Math.min(100, hopDistance * 0.3);
            
            // Interpolate position with smooth curves
            hiddenCube.x = hiddenCube.hopOrigin.x + (hiddenCube.hopTarget.x - hiddenCube.hopOrigin.x) * ease;
            hiddenCube.y = hiddenCube.hopOrigin.y + (hiddenCube.hopTarget.y - hiddenCube.hopOrigin.y) * ease;
            hiddenCube.z = hiddenCube.hopOrigin.z + (hiddenCube.hopTarget.z - hiddenCube.hopOrigin.z) * ease + hopHeight;
            
            return; // Skip normal movement while hopping
        }
        
        // Increment time since last hop
        hiddenCube.timeSinceLastHop++;
        
        // Update pathfinding
        movement.pathUpdateTimer++;
        if (movement.pathUpdateTimer >= movement.pathUpdateInterval || movement.currentPath.length === 0) {
            movement.pathUpdateTimer = 0;
            
            // Generate new path toward motivation target
            const newPath = findOptimalPath(
                hiddenCube.x, hiddenCube.y, hiddenCube.z,
                hiddenCube.motivation.targetX, hiddenCube.motivation.targetY
            );
            
            if (newPath.length > 0) {
                movement.currentPath = newPath;
                movement.pathIndex = 0;
                console.log(`Generated new path with ${newPath.length} nodes`);
            }
        }
        
        // Find current surface for physics
        let currentStructure = null;
        let minDistance = Infinity;
        
        const nearbyBoxes = boxes.filter(box => {
            const distance = Math.hypot(box.x - hiddenCube.x, box.y - hiddenCube.y);
            return distance < 500; // Larger search radius for better surface detection
        });
        
        // Advanced surface detection
        for (const box of nearbyBoxes) {
            const boxLeft = box.x - box.width / 2;
            const boxRight = box.x + box.width / 2;
            const boxTop = box.y - box.depth / 2;
            const boxBottom = box.y + box.depth / 2;
            const boxZTop = box.z + box.height;
            
            // More lenient surface detection
            if (hiddenCube.x >= boxLeft - 30 && hiddenCube.x <= boxRight + 30 &&
                hiddenCube.y >= boxTop - 30 && hiddenCube.y <= boxBottom + 30) {
                const distanceToTop = Math.abs(hiddenCube.z - boxZTop);
                if (distanceToTop < minDistance && distanceToTop < 50) {
                    minDistance = distanceToTop;
                    currentStructure = {
                        box: box,
                        surface: 'top',
                        targetZ: boxZTop + hiddenCube.size / 2
                    };
                }
            }
        }
        
        movement.currentSurface = currentStructure;
        
        // Intelligent hopping decision
        const shouldHop = (
            (movement.currentPath.length === 0 && Math.random() < 0.01) || // Random exploration hop
            (hiddenCube.timeSinceLastHop > 300 && Math.random() < 0.02) || // Time-based hop
            (movement.behaviorState === 'escaping' && Math.random() < 0.03) || // Escape hop
            (!currentStructure && hiddenCube.z < -100) // Emergency hop if falling
        );
        
        if (shouldHop && !hiddenCube.isHopping) {
            // Find suitable hop target
            const availableBoxes = boxes.filter(box => {
                const distance = Math.hypot(box.x - hiddenCube.x, box.y - hiddenCube.y);
                return distance < 1200 && box.z + box.height > hiddenCube.z - 200;
            });
            
            if (availableBoxes.length > 0) {
                // Smart target selection based on behavior
                let targetBox;
                
                if (movement.behaviorState === 'escaping') {
                    // Choose box furthest from camera
                    availableBoxes.sort((a, b) => {
                        const distA = Math.hypot(a.x - camera.x, a.y - camera.y);
                        const distB = Math.hypot(b.x - camera.x, b.y - camera.y);
                        return distB - distA;
                    });
                    targetBox = availableBoxes[Math.floor(Math.random() * Math.min(3, availableBoxes.length))];
                } else {
                    // Choose box closer to motivation target
                    availableBoxes.sort((a, b) => {
                        const distA = Math.hypot(a.x - hiddenCube.motivation.targetX, a.y - hiddenCube.motivation.targetY);
                        const distB = Math.hypot(b.x - hiddenCube.motivation.targetX, b.y - hiddenCube.motivation.targetY);
                        return distA - distB;
                    });
                    targetBox = availableBoxes[Math.floor(Math.random() * Math.min(5, availableBoxes.length))];
                }
                
                // Initiate smooth hop
                hiddenCube.isHopping = true;
                hiddenCube.hopProgress = 0;
                hiddenCube.hopOrigin = {
                    x: hiddenCube.x,
                    y: hiddenCube.y,
                    z: hiddenCube.z
                };
                
                hiddenCube.hopTarget = {
                    x: targetBox.x + (Math.random() - 0.5) * (targetBox.width * 0.8),
                    y: targetBox.y + (Math.random() - 0.5) * (targetBox.depth * 0.8),
                    z: targetBox.z + targetBox.height + hiddenCube.size / 2
                };
                
                console.log(`Smart hop to: ${hiddenCube.hopTarget.x.toFixed(0)}, ${hiddenCube.hopTarget.y.toFixed(0)} (${movement.behaviorState})`);
                return;
            }
        }
        
        // Apply physics
        if (!currentStructure && !hiddenCube.isHopping) {
            // Gravity with air resistance
            hiddenCube.velocityZ -= 0.12;
            hiddenCube.velocityZ *= 0.98; // Air resistance
            
            if (hiddenCube.z < -500) {
                console.log("Cube fell below world, emergency relocation");
                placeHiddenCube();
                return;
            }
        } else if (currentStructure) {
            // Smooth surface snapping
            const snapSpeed = 0.2;
            const targetZ = currentStructure.targetZ;
            hiddenCube.z += (targetZ - hiddenCube.z) * snapSpeed;
            hiddenCube.velocityZ *= 0.7; // Dampen Z velocity on surface
        }
        
        // Apply the new smooth movement system
        applySmoothMovement();
        
        // Apply velocities with smooth interpolation
        hiddenCube.x += hiddenCube.velocityX;
        hiddenCube.y += hiddenCube.velocityY;
        hiddenCube.z += hiddenCube.velocityZ;
        
        // World bounds with smooth wrapping
        const worldSize = canvas.width * 6;
        if (Math.abs(hiddenCube.x) > worldSize) {
            hiddenCube.x = Math.sign(hiddenCube.x) * worldSize * 0.95;
            movement.momentum.x *= -0.5; // Bounce back with reduced momentum
        }
        if (Math.abs(hiddenCube.y) > worldSize) {
            hiddenCube.y = Math.sign(hiddenCube.y) * worldSize * 0.95;
            movement.momentum.y *= -0.5; // Bounce back with reduced momentum
        }
        
        // Update pulse animation with behavior-based variation
        const pulseSpeed = movement.behaviorState === 'escaping' ? 0.08 : 
                          movement.behaviorState === 'investigating' ? 0.03 : 0.05;
        hiddenCube.pulseTime += pulseSpeed;
    }

    function updateCamera() {
        // Handle touch-based camera movement
        if (touch.isActive) {
            updateCameraWithTouch();
            return;
        }
        
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

    // Setup touch controls
    function setupTouchControls() {
        // Touch events for mobile
        canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Mouse events for desktop
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        // Pinch zoom for mobile
        canvas.addEventListener('gesturestart', handleGestureStart, { passive: true });
        canvas.addEventListener('gesturechange', handleGestureChange, { passive: true });
        canvas.addEventListener('gestureend', handleGestureEnd, { passive: true });
    }
    
    function handleTouchStart(event) {
        if (event.touches.length === 1) {
            touch.isActive = true;
            touch.startX = event.touches[0].clientX;
            touch.startY = event.touches[0].clientY;
            touch.currentX = touch.startX;
            touch.currentY = touch.startY;
        }
    }
    
    function handleTouchMove(event) {
        if (!touch.isActive || event.touches.length !== 1) return;
        
        touch.currentX = event.touches[0].clientX;
        touch.currentY = event.touches[0].clientY;
        
        // Calculate delta from last position
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        
        // Update camera offset
        touch.targetOffset.x += deltaX * 0.5;
        touch.targetOffset.y += deltaY * 0.5;
        
        // Update start position for next delta calculation
        touch.startX = touch.currentX;
        touch.startY = touch.currentY;
    }
    
    function handleTouchEnd() {
        touch.isActive = false;
    }
    
    function handleMouseDown(event) {
        touch.isActive = true;
        touch.startX = event.clientX;
        touch.startY = event.clientY;
        touch.currentX = touch.startX;
        touch.currentY = touch.startY;
    }
    
    function handleMouseMove(event) {
        if (!touch.isActive) return;
        
        touch.currentX = event.clientX;
        touch.currentY = event.clientY;
        
        // Calculate delta from last position
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        
        // Update camera offset
        touch.targetOffset.x += deltaX * 0.5;
        touch.targetOffset.y += deltaY * 0.5;
        
        // Update start position for next delta calculation
        touch.startX = touch.currentX;
        touch.startY = touch.currentY;
    }
    
    function handleMouseUp() {
        touch.isActive = false;
    }
    
    function handleGestureStart(event) {
        event.preventDefault();
        // Store initial zoom level
        touch.initialZoom = camera.zoom;
    }
    
    function handleGestureChange(event) {
        event.preventDefault();
        // Update zoom based on gesture scale
        camera.targetZoom = touch.initialZoom * event.scale;
        // Clamp zoom to reasonable values
        camera.targetZoom = Math.max(0.3, Math.min(1.5, camera.targetZoom));
    }
    
    function handleGestureEnd(event) {
        event.preventDefault();
    }
    
    // Update camera with touch controls
    function updateCameraWithTouch() {
        // Smooth camera offset
        touch.cameraOffset.x += (touch.targetOffset.x - touch.cameraOffset.x) * 0.1;
        touch.cameraOffset.y += (touch.targetOffset.y - touch.cameraOffset.y) * 0.1;
        
        // Apply offset to camera position
        camera.x += touch.cameraOffset.x;
        camera.y += touch.cameraOffset.y;
        
        // Reset target offset after applying
        touch.targetOffset.x = 0;
        touch.targetOffset.y = 0;
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
        
        ctx.fillText('CUBE EXPLORING WITH PURPOSE', 10, 80);
        
        // Show cube status
        const cubeSpeed = Math.hypot(hiddenCube.velocityX, hiddenCube.velocityY);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillText(`Cube Speed: ${cubeSpeed.toFixed(2)}`, 10, 95);
        ctx.fillText(`Cube Z: ${hiddenCube.z.toFixed(0)}`, 10, 110);
        
        // Show motivation info
        const motivationDirection = (hiddenCube.motivation.currentDirection * 180 / Math.PI).toFixed(0);
        const motivationDistance = Math.hypot(
            hiddenCube.motivation.targetX - hiddenCube.x,
            hiddenCube.motivation.targetY - hiddenCube.y
        ).toFixed(0);
        ctx.fillText(`Motivation: ${motivationDirection}° (${(hiddenCube.motivation.strength * 100).toFixed(0)}%)`, 10, 125);
        ctx.fillText(`Target Distance: ${motivationDistance}`, 10, 140);
        
        // Show nearby environment interactions
        const nearbyBoxCount = boxes.filter(box => {
            const dist = Math.hypot(box.x - hiddenCube.x, box.y - hiddenCube.y);
            return dist < 200;
        }).length;
        ctx.fillText(`Nearby Structures: ${nearbyBoxCount}`, 10, 155);
    }

    function animate() {
        if (!Climber.active) return;
        
        updateHiddenCube();
        updateCamera();
        draw();
        
        // Use requestAnimationFrame or setTimeout based on device
        if (isMobileDevice) {
            // Use setTimeout for mobile to target lower framerate for better performance
            Climber.animationId = setTimeout(() => {
                requestAnimationFrame(animate);
            }, 1000 / 30); // Target 30fps for mobile
        } else {
            Climber.animationId = requestAnimationFrame(animate);
        }
    }

    function init() {
        console.log('Initializing climber visualization...');
        generateWorld();
        placeHiddenCube();
        
        // Setup touch controls
        setupTouchControls();
        
        Climber.active = true;
        animate();
    }

    function stopAnimation() {
        console.log('Stopping climber animation...');
        Climber.active = false;
        if (Climber.animationId) {
            if (isMobileDevice) {
                clearTimeout(Climber.animationId);
            } else {
                cancelAnimationFrame(Climber.animationId);
            }
            Climber.animationId = null;
        }
        
        // Remove event listeners
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('gesturestart', handleGestureStart);
        canvas.removeEventListener('gesturechange', handleGestureChange);
        canvas.removeEventListener('gestureend', handleGestureEnd);
    }

    function clearMemory() {
        console.log('Clearing climber memory...');
        stopAnimation();
        boxes.length = 0;
        
        // Reset touch interaction variables
        touch.isActive = false;
        touch.startX = 0;
        touch.startY = 0;
        touch.currentX = 0;
        touch.currentY = 0;
        touch.cameraOffset = { x: 0, y: 0 };
        touch.targetOffset = { x: 0, y: 0 };
    }

    if (canvas.classList.contains('active')) {
        init();
    }
})(); 