// Binary Trees - 90-Degree Growth Visualization 
(function() {
    // Create a namespace for this visualization
    window.BinaryTrees = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        clearMemory: clearMemory
    };

    const canvas = document.getElementById('binary-trees-canvas');
    if (!canvas) {
        console.error("Canvas not found!");
        return;
    }

    const ctx = canvas.getContext('2d');
    
    // Create background gradient once
    let backgroundGradient = null;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Also update background gradient when resizing
        backgroundGradient = null;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Brown and yellow color palette
    const COLORS = {
        background: '#0a0e05', // Deep green-black background
        backgroundGradientTop: '#080a03', // Darker top gradient
        backgroundGradientBottom: '#101505', // Slightly lighter bottom gradient
        branchColor: '#5E4125', // Brown for main branches
        tipColor: '#D9A566', // Light brown for branch tips
        highlightColor: '#F7CA45', // Yellow highlight
        accentColor: '#8C6D3F', // Medium brown accent
        newGrowthColor: '#FFD700' // Gold for new growth
    };

    // Pre-compute RGB values to avoid parsing hex during animation
    const BRANCH_RGB = {
        r: parseInt(COLORS.branchColor.slice(1, 3), 16),
        g: parseInt(COLORS.branchColor.slice(3, 5), 16),
        b: parseInt(COLORS.branchColor.slice(5, 7), 16)
    };
    
    const TIP_RGB = {
        r: parseInt(COLORS.tipColor.slice(1, 3), 16),
        g: parseInt(COLORS.tipColor.slice(3, 5), 16),
        b: parseInt(COLORS.tipColor.slice(5, 7), 16)
    };
    
    const HIGHLIGHT_RGB = {
        r: parseInt(COLORS.highlightColor.slice(1, 3), 16),
        g: parseInt(COLORS.highlightColor.slice(3, 5), 16),
        b: parseInt(COLORS.highlightColor.slice(5, 7), 16)
    };
    
    const GROWTH_RGB = {
        r: parseInt(COLORS.newGrowthColor.slice(1, 3), 16),
        g: parseInt(COLORS.newGrowthColor.slice(3, 5), 16),
        b: parseInt(COLORS.newGrowthColor.slice(5, 7), 16)
    };

    // Binary tree settings
    const MAX_TREES = 6;
    const MIN_VERTICAL_SPACING = 150;
    
    // Calculate optimal spacing based on canvas height
    function calculateSpacing() {
        const spacing = Math.max(MIN_VERTICAL_SPACING, canvas.height / (MAX_TREES + 1));
        return spacing;
    }
    
    let activeTrees = [];
    let time = 0;
    let frameCount = 0;
    
    // 90-degree directions - only right, up, down (never back toward root)
    const DIRECTIONS = [
        { dx: 1, dy: 0 },  // right
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 }   // down
    ];
    
    // Growth state tracking
    let totalGrowthPerSecond = 0;
    let lastGrowthCheck = 0;
    let growthPulseTimer = 0;
    
    // Binary Tree class
    class BinaryTree {
        constructor(index) {
            this.index = index;
            this.reset();
        }
        
        reset() {
            // Position calculation - evenly space trees vertically
            const spacing = calculateSpacing();
            const verticalPos = spacing * (this.index + 1);
            
            // Start at left edge of screen
            this.x = -50;
            this.y = verticalPos;
            
            this.segments = [];
            this.activeSegments = new Set();
            this.terminalNodes = new Set();
            this.pendingSegments = [];
            
            // Growth parameters
            this.growthSpeed = 2.0 + Math.random() * 5;
            this.branchingChance = 0.1 + Math.random() * 0.25;
            this.rightwardBias = 0.4 + Math.random() * 0.4;
            this.thickness = 2.5 + Math.random() * 2.5;
            
            // Growth bursts
            this.burstMode = false;
            this.burstTimer = 0;
            this.burstDuration = 0;
            
            // Add initial segment
            this.addInitialSegment();
            
            return this;
        }
        
        addInitialSegment() {
            // More variable initial length
            const length = 70 + Math.random() * 60;
            
            this.segments.push({
                startX: this.x,
                startY: this.y,
                endX: this.x + length,
                endY: this.y,
                length: length,
                angle: 0,
                direction: { dx: 1, dy: 0 },
                branchCount: 0,
                depth: 0,
                progress: 0,
                age: 0,
                isGrowing: true,
                thickness: this.thickness,
                id: 0
            });
            
            this.activeSegments.add(0);
        }
        
        getNextDirection(parentDirection) {
            // Can't go back toward the root
            const invalidDirection = { dx: -parentDirection.dx, dy: -parentDirection.dy };
            
            // Filter valid directions
            const validDirections = DIRECTIONS.filter(dir => 
                !(dir.dx === invalidDirection.dx && dir.dy === invalidDirection.dy)
            );
            
            // More chaotic direction selection
            if (Math.random() < this.rightwardBias) {
                // Sometimes continue in same direction regardless of rightward bias
                if (Math.random() < 0.3) {
                    return parentDirection;
                }
                return { dx: 1, dy: 0 };
            }
            
            // Random choice between valid directions
            return validDirections[Math.floor(Math.random() * validDirections.length)];
        }
        
        addSegment(parentIndex) {
            const parent = this.segments[parentIndex];
            if (!parent) return;
            
            const lastX = parent.endX;
            const lastY = parent.endY;
            const depth = parent.depth + 1;
            
            // Get next direction
            const nextDirection = this.getNextDirection(parent.direction);
            
            // More variable segment lengths
            const baseLength = 35 + Math.random() * 45;
            const depthReduction = Math.min(20, depth * Math.random() * 2);
            const length = Math.max(12, baseLength - depthReduction);
            
            // Calculate endpoints
            const endX = lastX + (nextDirection.dx * length);
            const endY = lastY + (nextDirection.dy * length);
            
            // Calculate angle for drawing
            let angle = 0;
            if (nextDirection.dx === 1) angle = 0;
            else if (nextDirection.dx === -1) angle = Math.PI;
            else if (nextDirection.dy === 1) angle = Math.PI/2;
            else if (nextDirection.dy === -1) angle = -Math.PI/2;
            
            // More variable thickness reduction
            const thicknessFactor = Math.max(0.15, 1 - (depth * Math.random() * 0.08));
            
            // Create the new segment
            const segmentIndex = this.segments.length;
            const segmentId = segmentIndex;
            
            this.segments.push({
                startX: lastX,
                startY: lastY,
                endX: endX,
                endY: endY,
                length: length,
                angle: angle,
                direction: nextDirection,
                branchCount: 0,
                depth: depth,
                progress: 0,
                age: 0,
                isGrowing: true,
                thickness: this.thickness * thicknessFactor,
                id: segmentId,
                parentIndex: parentIndex
            });
            
            this.activeSegments.add(segmentIndex);
            parent.branchCount++;
            
            if (parent.branchCount === 1) {
                this.terminalNodes.delete(parentIndex);
            }
            
            return segmentIndex;
        }
        
        update() {
            this.processQueuedSegments();
            
            if (this.burstMode) {
                this.burstTimer++;
                if (this.burstTimer >= this.burstDuration) {
                    this.endGrowthBurst();
                }
            }
            
            // More frequent but shorter bursts
            if (!this.burstMode && Math.random() < 0.015) {
                this.triggerGrowthBurst();
            }
            
            let newSegmentsThisFrame = 0;
            let completedSegmentsThisFrame = new Set();
            
            const activeSegmentsArray = Array.from(this.activeSegments);
            const maxSegmentsPerFrame = 60;
            const segmentsToProcess = activeSegmentsArray.length <= maxSegmentsPerFrame ? 
                activeSegmentsArray : 
                activeSegmentsArray.slice(0, maxSegmentsPerFrame);
            
            // Update growing segments
            for (const segmentIndex of segmentsToProcess) {
                const segment = this.segments[segmentIndex];
                if (!segment || !segment.isGrowing) continue;
                
                segment.age++;
                
                if (segment.progress < 1) {
                    // More variable growth speed
                    const speedFactor = this.burstMode ? 2 : (0.7 + Math.random() * 0.6);
                    segment.progress += (this.growthSpeed * speedFactor) / Math.max(20, segment.length);
                    
                    if (segment.progress >= 1) {
                        segment.progress = 1;
                        completedSegmentsThisFrame.add(segmentIndex);
                        this.terminalNodes.add(segmentIndex);
                    }
                }
            }
            
            let branchingAttempts = 0;
            const maxBranchingAttempts = 18;
            
            // Process newly completed segments
            for (const segmentIndex of completedSegmentsThisFrame) {
                if (branchingAttempts >= maxBranchingAttempts) break;
                
                const segment = this.segments[segmentIndex];
                
                if (segment.branchCount === 0) {
                    // More variable branching chance
                    const branchRoll = Math.random();
                    if (branchRoll < this.branchingChance) {
                        this.queueSegment(segmentIndex);
                        newSegmentsThisFrame++;
                        branchingAttempts++;
                        
                        // Random chance for multiple branches
                        if (branchRoll < this.branchingChance * 0.3) {
                            this.queueSegment(segmentIndex);
                            newSegmentsThisFrame++;
                            branchingAttempts++;
                            
                            // Rare chance for triple branching
                            if (branchRoll < this.branchingChance * 0.1) {
                                this.queueSegment(segmentIndex);
                                newSegmentsThisFrame++;
                                branchingAttempts++;
                            }
                        }
                    }
                }
            }
            
            for (const segmentIndex of completedSegmentsThisFrame) {
                this.activeSegments.delete(segmentIndex);
            }
            
            // Additional random branching
            if (branchingAttempts < maxBranchingAttempts) {
                const terminalNodesArray = Array.from(this.terminalNodes);
                const shuffledNodes = terminalNodesArray.sort(() => Math.random() - 0.5);
                const nodesToProcess = shuffledNodes.slice(0, maxBranchingAttempts - branchingAttempts);
                
                for (const nodeIndex of nodesToProcess) {
                    if (branchingAttempts >= maxBranchingAttempts) break;
                    
                    const segment = this.segments[nodeIndex];
                    
                    if (!segment || segment.depth > 25 || segment.branchCount >= 2) continue;
                    
                    // More variable branching chance
                    let branchChance = this.branchingChance * (0.3 + Math.random() * 0.4);
                    
                    if (segment.direction.dx === 1) {
                        branchChance *= (0.8 + Math.random() * 0.4);
                    }
                    
                    branchChance *= Math.max(0.15, 1 - (segment.depth * 0.03));
                    
                    if (Math.random() < branchChance) {
                        this.queueSegment(nodeIndex);
                        newSegmentsThisFrame++;
                        branchingAttempts++;
                    }
                }
            }
            
            // Force growth if stalled
            if (this.activeSegments.size === 0 && this.pendingSegments.length === 0) {
                const terminalNodesArray = Array.from(this.terminalNodes);
                if (terminalNodesArray.length > 0) {
                    const randomNode = terminalNodesArray[Math.floor(Math.random() * terminalNodesArray.length)];
                    this.queueSegment(randomNode);
                }
            }
            
            return true;
        }
        
        draw(ctx) {
            // Skip drawing segments that are off-screen for performance
            const viewportMargin = 100; // pixels
            const minX = -viewportMargin;
            const maxX = canvas.width + viewportMargin;
            const minY = -viewportMargin;
            const maxY = canvas.height + viewportMargin;
            
            // Draw segments
            for (let i = 0; i < this.segments.length; i++) {
                const segment = this.segments[i];
                
                // Skip segments that haven't started growing
                if (segment.progress <= 0) continue;
                
                // Calculate actual drawing endpoints based on progress
                const drawEndX = segment.startX + (segment.endX - segment.startX) * segment.progress;
                const drawEndY = segment.startY + (segment.endY - segment.startY) * segment.progress;
                
                // Skip off-screen segments
                if (
                    (segment.startX < minX && drawEndX < minX) || 
                    (segment.startX > maxX && drawEndX > maxX) || 
                    (segment.startY < minY && drawEndY < minY) || 
                    (segment.startY > maxY && drawEndY > maxY)
                ) {
                    continue;
                }
                
                // Calculate line thickness with pulsing effect
                let thickness = segment.thickness;
                
                // Add pulse effect during burst mode
                if (this.burstMode) {
                    const pulseSpeed = 0.2;
                    const pulseAmount = 0.15;
                    const pulseFactor = 1.0 + Math.sin(segment.age * pulseSpeed) * pulseAmount;
                    thickness *= pulseFactor;
                } else {
                    // Smaller pulse during normal growth
                    const pulseSpeed = 0.01;
                    const pulseAmount = 0.05;
                    const pulseFactor = 1.0 + Math.sin(segment.age * pulseSpeed) * pulseAmount;
                    thickness *= pulseFactor;
                }
                
                // Determine color based on segment properties
                let r, g, b;
                let alpha = 0.95;
                
                if (segment.progress < 1) {
                    // Growing segments - use growth color (yellow)
                    const growthFactor = 1 - segment.progress;
                    r = GROWTH_RGB.r * growthFactor + TIP_RGB.r * (1 - growthFactor);
                    g = GROWTH_RGB.g * growthFactor + TIP_RGB.g * (1 - growthFactor);
                    b = GROWTH_RGB.b * growthFactor + TIP_RGB.b * (1 - growthFactor);
                    
                    // Brighter during burst mode
                    if (this.burstMode) {
                        r = Math.min(255, r * 1.2);
                        g = Math.min(255, g * 1.2);
                        b = Math.min(255, b * 1.2);
                    }
                } else if (segment.branchCount === 0) {
                    // Terminal branches (tips) - use tip color (light brown)
                    r = TIP_RGB.r;
                    g = TIP_RGB.g;
                    b = TIP_RGB.b;
                    
                    // Highlight tips that can grow
                    if (this.terminalNodes.has(i)) {
                        const highlightFactor = 0.2 + Math.sin(segment.age * 0.05) * 0.1;
                        r = r * (1 - highlightFactor) + HIGHLIGHT_RGB.r * highlightFactor;
                        g = g * (1 - highlightFactor) + HIGHLIGHT_RGB.g * highlightFactor;
                        b = b * (1 - highlightFactor) + HIGHLIGHT_RGB.b * highlightFactor;
                    }
                } else {
                    // Regular branches - use branch color (brown)
                    r = BRANCH_RGB.r;
                    g = BRANCH_RGB.g;
                    b = BRANCH_RGB.b;
                    
                    // Add occasional highlights for visual interest (yellow glow)
                    if (Math.random() < 0.02) {
                        const highlightFactor = 0.15 + Math.random() * 0.15;
                        r = r * (1 - highlightFactor) + HIGHLIGHT_RGB.r * highlightFactor;
                        g = g * (1 - highlightFactor) + HIGHLIGHT_RGB.g * highlightFactor;
                        b = b * (1 - highlightFactor) + HIGHLIGHT_RGB.b * highlightFactor;
                    }
                    
                    // Burst mode coloring
                    if (this.burstMode) {
                        const burstFactor = 0.1 + Math.random() * 0.1;
                        r = r * (1 - burstFactor) + HIGHLIGHT_RGB.r * burstFactor;
                        g = g * (1 - burstFactor) + HIGHLIGHT_RGB.g * burstFactor;
                        b = b * (1 - burstFactor) + HIGHLIGHT_RGB.b * burstFactor;
                    }
                }
                
                // Set line style
                ctx.strokeStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`;
                ctx.lineWidth = thickness;
                ctx.lineCap = 'square'; // Square caps for 90-degree tree aesthetic
                
                // Draw the segment
                ctx.beginPath();
                ctx.moveTo(segment.startX, segment.startY);
                ctx.lineTo(drawEndX, drawEndY);
                ctx.stroke();
                
                // Add a glow to growing tips
                if (segment.progress < 1) {
                    // Draw glowing tip
                    const glowRadius = thickness * 2.5;
                    const gradient = ctx.createRadialGradient(
                        drawEndX, drawEndY, 0,
                        drawEndX, drawEndY, glowRadius
                    );
                    
                    gradient.addColorStop(0, `rgba(${GROWTH_RGB.r}, ${GROWTH_RGB.g}, ${GROWTH_RGB.b}, 0.8)`);
                    gradient.addColorStop(1, `rgba(${GROWTH_RGB.r}, ${GROWTH_RGB.g}, ${GROWTH_RGB.b}, 0)`);
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(drawEndX, drawEndY, glowRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Queue a new segment to be added
        queueSegment(parentIndex) {
            this.pendingSegments.push(parentIndex);
        }
        
        // Process all queued segments
        processQueuedSegments() {
            // Process a limited number of segments per frame for performance
            const segmentsToProcess = Math.min(this.pendingSegments.length, 10);
            
            for (let i = 0; i < segmentsToProcess; i++) {
                const parentIndex = this.pendingSegments.shift();
                this.addSegment(parentIndex);
            }
        }

        // Add the missing method
        triggerGrowthBurst() {
            if (!this.burstMode) {
                this.burstMode = true;
                this.burstTimer = 0;
                this.burstDuration = 30 + Math.floor(Math.random() * 60);
            }
        }
        
        endGrowthBurst() {
            this.burstMode = false;
            this.burstTimer = 0;
        }
    }

    function init() {
        resizeCanvas();
        
        // Reset variables
        time = 0;
        frameCount = 0;
        activeTrees = [];
        totalGrowthPerSecond = 0;
        lastGrowthCheck = 0;
        growthPulseTimer = 0;
        
        // Create initial trees, evenly spaced
        for (let i = 0; i < MAX_TREES; i++) {
            activeTrees.push(new BinaryTree(i));
        }

        if (!window.BinaryTrees.active) {
            window.BinaryTrees.active = true;
            requestAnimationFrame(animate);
        }
    }

    function update() {
        time++;
        frameCount++;
        growthPulseTimer++;
        
        // Global growth metrics tracking
        if (frameCount % 60 === 0) {
            // Reset growth counter every second
            totalGrowthPerSecond = 0;
        }
        
        // Synchronize growth bursts occasionally
        if (growthPulseTimer > 500 && Math.random() < 0.01) {
            growthPulseTimer = 0;
            // Trigger growth burst in all trees
            for (const tree of activeTrees) {
                if (Math.random() < 0.7) {
                    tree.triggerGrowthBurst();
                }
            }
        }
        
        // Update all active trees
        for (let i = 0; i < activeTrees.length; i++) {
            activeTrees[i].update();
        }
    }

    function createBackgroundGradient() {
        if (!backgroundGradient || canvas.height !== backgroundGradient._height) {
            backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            backgroundGradient._height = canvas.height;
            backgroundGradient.addColorStop(0, COLORS.backgroundGradientTop);
            backgroundGradient.addColorStop(1, COLORS.backgroundGradientBottom);
        }
        return backgroundGradient;
    }

    function draw() {
        // Clear with gradient background
        ctx.fillStyle = createBackgroundGradient();
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw all active trees
        for (let i = 0; i < activeTrees.length; i++) {
            activeTrees[i].draw(ctx);
        }
    }

    function animate() {
        if (!window.BinaryTrees.active) return;
        
        window.BinaryTrees.animationId = requestAnimationFrame(animate);
        
        update();
        draw();
    }

    function stopAnimation() {
        window.BinaryTrees.active = false;
        if (window.BinaryTrees.animationId) {
            cancelAnimationFrame(window.BinaryTrees.animationId);
            window.BinaryTrees.animationId = null;
        }
        
        // Clear arrays to help garbage collection
        activeTrees = [];
        backgroundGradient = null;
    }
    
    function clearMemory() {
        // Stop animation first
        stopAnimation();
        
        // Clear canvas
        if (canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Remove event listeners
            window.removeEventListener('resize', resizeCanvas);
        }
        
        // Explicitly null out references
        activeTrees = null;
        backgroundGradient = null;
        
        console.log('BinaryTrees: Memory cleared');
    }

    // Auto-initialize if the canvas is active
    if (canvas.classList.contains('active')) {
        init();
    }
})(); 