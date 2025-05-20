// Roots - A Poetic Visualization of Life's Growth and Connection
(function() {
    // Create a namespace for this visualization
    window.DecisionTrees = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation
    };

    const canvas = document.getElementById('decision-trees-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Earthy color palette suitable for roots
    const baseColors = [
        { r: 150, g: 120, b: 90 },  // Sandy brown
        { r: 120, g: 100, b: 70 },  // Earthy brown
        { r: 100, g: 80, b: 60 },   // Deep earthy brown
        { r: 130, g: 110, b: 80 },  // Light brown
        { r: 90, g: 70, b: 50 }     // Dark soil brown
    ];

    let particles = [];

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 2 + 0.5;
            this.life = 1;
            this.maxLife = Math.random() * 40 + 20; // Shorter life
            this.vx = (Math.random() - 0.5) * 1.5; // Slower movement
            this.vy = (Math.random() - 0.5) * 1.5;
            this.color = color;
            this.opacity = 0.6;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.98; // More friction
            this.vy *= 0.98;
            this.life++;
            this.opacity = Math.max(0, 0.6 * (1 - this.life / this.maxLife));
        }

        draw() {
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    class Branch {
        constructor(startX, startY, angle, length, depth, parent = null) {
            this.startX = startX;
            this.startY = startY;
            this.angle = angle;
            this.length = length;
            this.depth = depth;
            this.parent = parent;
            this.growth = 0;
            this.maxGrowth = 1;
            this.children = [];
            this.color = this.generateColor();
            this.curve = (Math.random() - 0.5) * 0.4; // Organic curve
            this.pulse = Math.random() * Math.PI * 2; 
            this.waviness = Math.random() * 0.04; // Slightly increased waviness
            this.growthSpeed = 0.01 + Math.random() * 0.01; // Individual growth speed
            this.thicknessFactor = 0.8 + Math.random() * 0.4; // Varied thickness
            this.segments = Math.floor(Math.random() * 3) + 4; // Varied number of segments (4-6)
            
            // Add random variations in growth rate
            this.growthVariation = 0.7 + Math.random() * 0.6; // 0.7-1.3
            
            // Root tip characteristics
            this.tipSize = 1 + Math.random() * 1.5;
            this.tipColor = {
                r: Math.min(255, this.color.r + 20),
                g: Math.min(255, this.color.g + 15),
                b: Math.min(255, this.color.b + 10)
            };
            
            // Tiny root hairs appear when growth is advanced
            this.rootHairs = [];
            this.hasGeneratedHairs = false;
        }

        generateColor() {
            if (this.parent) {
                const parentColor = this.parent.color;
                // More subtle color variations for children
                return {
                    r: Math.max(0, Math.min(255, parentColor.r + (Math.random() - 0.5) * 15)),
                    g: Math.max(0, Math.min(255, parentColor.g + (Math.random() - 0.5) * 15)),
                    b: Math.max(0, Math.min(255, parentColor.b + (Math.random() - 0.5) * 15))
                };
            }
            const base = baseColors[Math.floor(Math.random() * baseColors.length)];
            return {
                r: Math.max(0, Math.min(255, base.r + (Math.random() - 0.5) * 15)),
                g: Math.max(0, Math.min(255, base.g + (Math.random() - 0.5) * 15)),
                b: Math.max(0, Math.min(255, base.b + (Math.random() - 0.5) * 15))
            };
        }

        grow() {
            if (this.growth < this.maxGrowth) {
                // Growth increases, but with slight natural variations
                const growthIncrease = this.growthSpeed * (1 + Math.sin(time * 0.8 + this.pulse) * 0.1);
                this.growth += growthIncrease * this.growthVariation;
                
                // Generate root hairs once growth reaches 70%
                if (this.growth > 0.7 && !this.hasGeneratedHairs && this.depth > 0 && Math.random() < 0.6) {
                    this.generateRootHairs();
                    this.hasGeneratedHairs = true;
                }
                
                return true;
            }
            return false;
        }
        
        generateRootHairs() {
            // Only generate root hairs on smaller branches
            if (this.depth < 3) return;
            
            const numHairs = Math.floor(Math.random() * 5) + 2; // 2-6 hairs
            
            for (let i = 0; i < numHairs; i++) {
                const position = Math.random(); // Position along branch (0-1)
                const length = (0.5 + Math.random() * 1.0) * (5 - this.depth); // Length based on depth
                const angle = this.angle + (Math.random() - 0.5) * Math.PI; // Random angle
                
                this.rootHairs.push({
                    position: position,
                    length: Math.max(1, length),
                    angle: angle
                });
            }
        }

        draw() {
            if (this.growth <= 0) return;

            const currentLength = this.length * this.growth;
            
            let lastX = this.startX;
            let lastY = this.startY;
            
            // Draw the branch as multiple segments with organic deviations
            for (let i = 1; i <= this.segments; i++) {
                const t = i / this.segments;
                // Add slight variations in the angle with time for subtle movement
                const wobble = Math.sin(time * 0.3 + this.pulse + t * 2) * 0.01;
                const angle = this.angle + Math.sin(time * 0.4 + this.pulse + t * Math.PI) * this.waviness + wobble;
                
                const segEndX = this.startX + Math.cos(this.angle) * currentLength * t;
                const segEndY = this.startY + Math.sin(this.angle) * currentLength * t;
                
                // Add some curve - different for each segment
                const curveVariation = this.curve * (1 - t * 0.3); // Curve decreases toward tip
                const midX = (lastX + segEndX) / 2 + Math.cos(angle + Math.PI/2) * curveVariation * (currentLength / this.segments);
                const midY = (lastY + segEndY) / 2 + Math.sin(angle + Math.PI/2) * curveVariation * (currentLength / this.segments);
                
                // Tapered width based on depth, segment, and individual variation
                const baseWidth = (1 - this.depth * 0.18) * this.thicknessFactor;
                const taperFactor = Math.pow(1 - t, 0.7); // More gradual taper
                const width = Math.max(0.6, baseWidth * (2.2 - t * 1.2) * taperFactor);
                
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.quadraticCurveTo(midX, midY, segEndX, segEndY);
                
                // Color with slight environmental response
                const environmentalFactor = Math.sin(time * 0.2 + segEndX * 0.01 + segEndY * 0.01) * 0.05;
                const r = Math.min(255, Math.max(0, this.color.r + environmentalFactor * 10));
                const g = Math.min(255, Math.max(0, this.color.g + environmentalFactor * 10));
                const b = Math.min(255, Math.max(0, this.color.b + environmentalFactor * 5));
                
                // Opacity based on depth and segment
                const alpha = Math.min(0.95, Math.max(0.4, (0.7 - this.depth * 0.05) * (1 - t * 0.1)));
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.lineWidth = width;
                ctx.stroke();
                
                lastX = segEndX;
                lastY = segEndY;
            }
            
            // Draw root tip if still growing
            if (this.growth < 0.95) {
                ctx.beginPath();
                ctx.arc(lastX, lastY, this.tipSize * (1 - this.depth * 0.1), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${this.tipColor.r}, ${this.tipColor.g}, ${this.tipColor.b}, 0.7)`;
                ctx.fill();
            }
            
            // Draw root hairs
            this.rootHairs.forEach(hair => {
                const hairPos = hair.position;
                // Calculate position along the branch
                const hairX = this.startX + Math.cos(this.angle) * currentLength * hairPos;
                const hairY = this.startY + Math.sin(this.angle) * currentLength * hairPos;
                
                // Add slight movement to the hairs
                const hairWobble = Math.sin(time * 0.5 + hairPos * 10) * 0.1;
                const hairAngle = hair.angle + hairWobble;
                
                const hairEndX = hairX + Math.cos(hairAngle) * hair.length;
                const hairEndY = hairY + Math.sin(hairAngle) * hair.length;
                
                ctx.beginPath();
                ctx.moveTo(hairX, hairY);
                ctx.lineTo(hairEndX, hairEndY);
                ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.4)`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            });

            this.children.forEach(child => child.draw());
        }
    }

    let branches = [];
    let time = 0;
    const MAX_DEPTH = 7; // Deep branching

    function init() {
        branches = [];
        particles = [];
        time = 0;
        
        // Create initial branches starting from top
        const numInitialBranches = 4;
        for (let i = 0; i < numInitialBranches; i++) {
            const x = canvas.width * (0.2 + Math.random() * 0.6); // Wider spread
            const angle = Math.PI/2 + (Math.random() - 0.5) * 0.5; // Wider angle variation
            const initialLength = canvas.height * 0.2 + Math.random() * 80; // Long initial branches
            branches.push(new Branch(x, -20, angle, initialLength, 0)); 
        }

        if (!window.DecisionTrees.active) {
            window.DecisionTrees.active = true;
            animate();
        }
    }

    function update() {
        time += 0.016; 

        let currentBranches = [...branches]; // Iterate over a copy for safe modification
        currentBranches.forEach(branch => {
            if (branch.grow()) { // grow returns true if still growing
                // Natural branching based on growth stage, with randomness
                const branchProb = 0.02 + branch.growth * 0.05;
                if (branch.growth >= 0.3 && branch.children.length === 0 && branch.depth < MAX_DEPTH && Math.random() < branchProb) {
                    // More natural branch patterns
                    const numChildren = Math.random() < 0.5 ? 1 : (Math.random() < 0.8 ? 2 : 3);
                    
                    // Create main and secondary branches with different characteristics
                    for (let i = 0; i < numChildren; i++) {
                        let angleVariation;
                        let lengthFactor;
                        
                        if (i === 0 && numChildren > 1) {
                            // Main continuation branch - smaller angle, longer
                            angleVariation = (Math.random() - 0.5) * Math.PI * 0.3;
                            lengthFactor = 0.75 + Math.random() * 0.3;
                        } else {
                            // Secondary branches - wider angle, shorter
                            angleVariation = (Math.random() - 0.5) * Math.PI * 0.6;
                            // Add downward bias for lateral roots
                            if (branch.angle < 0 || branch.angle > Math.PI) {
                                angleVariation += 0.3; // Push more toward downward
                            }
                            lengthFactor = 0.5 + Math.random() * 0.4;
                        }
                        
                        const newLength = branch.length * lengthFactor;
                        const childStartX = branch.startX + Math.cos(branch.angle) * branch.length * branch.growth;
                        const childStartY = branch.startY + Math.sin(branch.angle) * branch.length * branch.growth;

                        const newBranch = new Branch( 
                            childStartX, 
                            childStartY, 
                            branch.angle + angleVariation, 
                            newLength, 
                            branch.depth + 1, 
                            branch
                        );
                        branches.push(newBranch);
                        branch.children.push(newBranch); 
                    }
                }
            } 
        });
        
        // Keep branches around - only remove completely invisible ones if needed
        branches = branches.filter(branch => branch.growth < 1.2);
        
        // Prevent excessive branch accumulation while allowing for continuous growth
        if (branches.length > 1000) { // Allow more branches for density
            // Remove branches that are deep in the hierarchy and fully grown
            const deepBranches = branches.filter(b => b.depth > 4 && b.growth >= 1);
            if (deepBranches.length > 100) { // Only if we have plenty of deep branches
                // Remove 5% of the deep branches to maintain performance
                const toRemove = Math.ceil(deepBranches.length * 0.05);
                const branchesToRemove = new Set(deepBranches.slice(0, toRemove));
                branches = branches.filter(b => !branchesToRemove.has(b));
            }
        }

        // Update particles
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.opacity > 0);

        // Add new branches occasionally to ensure continuous growth
        if (Math.random() < 0.015 || (branches.length < 15 && Math.random() < 0.04)) { 
            const x = canvas.width * (0.2 + Math.random() * 0.6);  // Spread across the screen
            const angle = Math.PI/2 + (Math.random() - 0.5) * 0.5; // Downward with variation
            branches.push(new Branch(x, -20, angle, canvas.height * 0.2 + Math.random() * 80, 0));
        }
    }

    function draw() {
        // Dark soil background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a1209'); // Dark earthy top
        gradient.addColorStop(1, '#0a0804'); // Deeper dark soil bottom
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.globalCompositeOperation = 'source-over';

        // Sort branches by depth so deeper ones are drawn on top
        const sortedBranches = [...branches].sort((a, b) => a.depth - b.depth);
        sortedBranches.forEach(branch => branch.draw());
        particles.forEach(p => p.draw());
    }

    function animate() {
        if (!window.DecisionTrees.active) return;
        update();
        draw();
        window.DecisionTrees.animationId = requestAnimationFrame(animate);
    }

    function stopAnimation() {
        window.DecisionTrees.active = false;
        if (window.DecisionTrees.animationId) {
            cancelAnimationFrame(window.DecisionTrees.animationId);
            window.DecisionTrees.animationId = null;
        }
    }

    if (canvas.classList.contains('active')) {
        init();
    }
})(); 