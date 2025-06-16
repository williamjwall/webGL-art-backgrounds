(function() {
    try {
        console.log('Water script loaded');
        
        // Simple namespace for this visualization
        window.Water = {
            active: false,
            animationId: null,
            init: init,
            stop: stopAnimation,
            clearMemory: clearMemory,
            version: '1.0.1',
            lastError: null
        };
        
        const canvas = document.getElementById('water-canvas');
        if (!canvas) {
            console.error('Canvas not found: water-canvas');
            return;
        }
        
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
            console.error('Could not get canvas context');
            return;
        }
        
        // Core variables
        const particles = [];
        const PARTICLE_COUNT = 500;
        let MAX_VISIBLE_PARTICLES = 400;
        
        // Enhanced color palette - simplified and monotone
        const COLORS = {
            primary: 'rgba(240, 245, 250, 0.8)',
            secondary: 'rgba(200, 210, 220, 0.6)',
            background: 'rgb(8, 12, 16)',
            accent: 'rgba(180, 190, 200, 0.4)',
            dark: 'rgba(40, 45, 50, 0.3)',
            highlights: 'rgba(220, 230, 240, 0.9)'
        };
        
        // Animation variables
        let time = 0;
        let lastFrameTime = 0;
        const frameInterval = 1000 / 60;
        
        // Cycle system
        const MAX_CYCLE = 5;
        let currentCycle = 1;
        let cycleStartTime = Date.now();
        const CYCLE_DURATION = 6000; // 6 seconds per cycle - faster for more intense transitions
        
        // Warping parameters
        let warpIntensity = 0;
        let flowDirection = 0;
        let waveAmplitude = 0;
        let colorShift = 0;
        
        // Initialize function
        function init() {
            console.log('Initializing water visualization');
            
            // Reset everything
            particles.length = 0;
            time = 0;
            currentCycle = 1;
            cycleStartTime = Date.now();
            
            // Create particles with more properties
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(createParticle());
            }
            
            if (!window.Water.active) {
                window.Water.active = true;
                console.log('Starting animation with cycle warping');
                animate(0);
            }
        }
        
        function createParticle() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                baseSize: Math.random() * 2 + 1, // Store original size
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.8 + 0.2,
                phase: Math.random() * Math.PI * 2, // For wave motion
                waveFreq: Math.random() * 0.02 + 0.01 // Individual wave frequency
            };
        }
        
        // Update cycle parameters
        function updateCycle() {
            const now = Date.now();
            const elapsed = now - cycleStartTime;
            
            // Move to next cycle if time elapsed
            if (elapsed >= CYCLE_DURATION) {
                currentCycle = (currentCycle % MAX_CYCLE) + 1;
                console.log(`Water cycle: ${currentCycle}`);
                cycleStartTime = now;
            }
            
            // Calculate progress within current cycle (0 to 1)
            const progress = elapsed / CYCLE_DURATION;
            
            // Mind-bending effects with extreme warping and reality distortion
            switch(currentCycle) {
                case 1: // Reality ripples
                    warpIntensity = 0.3 + Math.sin(progress * Math.PI * 6) * 0.3;
                    flowDirection = time * 0.2 + Math.sin(time * 0.5) * Math.cos(time * 0.3) * 3;
                    waveAmplitude = 1.2 + Math.sin(progress * Math.PI * 4) * 0.8;
                    colorShift = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
                    break;
                case 2: // Fractal convergence
                    warpIntensity = 0.8 + Math.sin(time * 0.3) * 0.4;
                    flowDirection = time * 0.5 + Math.cos(time * 0.2) * 5;
                    waveAmplitude = 1.5 + Math.cos(progress * Math.PI * 3) * 1.0;
                    colorShift = 1.0 + Math.sin(time * 2) * 0.5;
                    break;
                case 3: // Dimension collapse
                    warpIntensity = 1.2 + Math.sin(progress * Math.PI * 2) * 0.8;
                    flowDirection = time * 0.8 + Math.sin(time) * Math.cos(time * 0.4) * 10;
                    waveAmplitude = 2.2 + Math.sin(time * 0.6) * 1.5;
                    colorShift = 1.5 + Math.cos(time) * Math.sin(time * 2) * 0.8;
                    break;
                case 4: // Neural pulse
                    warpIntensity = 1.5 - Math.cos(progress * Math.PI * 7) * 0.7;
                    flowDirection = time * 1.2 + Math.sin(time * 2) * 8;
                    waveAmplitude = 2.5 - Math.cos(time * 0.4) * 1.8;
                    colorShift = 2.0 + Math.sin(time * 3) * 1.0;
                    break;
                case 5: // Reality unbound
                    warpIntensity = 1.8 * Math.pow(Math.sin(progress * Math.PI * 3), 2);
                    flowDirection = time * 1.5 + Math.sin(time * 0.8) * Math.cos(time * 0.2) * 15;
                    waveAmplitude = 3.0 * Math.pow(Math.sin(time * 0.3), 2);
                    colorShift = 2.5 * Math.abs(Math.sin(time));
                    break;
            }
        }
        
        // Animation loop
        function animate(timestamp) {
            if (!window.Water.active) return;
            
            const elapsed = timestamp - lastFrameTime;
            
            if (elapsed > frameInterval) {
                lastFrameTime = timestamp;
                time += 0.01;
                
                updateCycle();
                update();
                draw();
            }
            
            window.Water.animationId = requestAnimationFrame(animate);
        }
        
        function update() {
            particles.forEach(p => {
                // Apply mind-bending warping motion
                const waveX = Math.sin(time * p.waveFreq + p.phase) * waveAmplitude * 2;
                const waveY = Math.cos(time * p.waveFreq + p.phase) * waveAmplitude;
                
                // Calculate flow direction based on position and time with chaotic patterns
                const flowX = Math.sin(flowDirection + p.phase) * warpIntensity * 
                             (1 + Math.cos(time * 0.3 + p.phase * 2) * 0.5);
                const flowY = Math.cos(flowDirection + p.phase * 0.5) * warpIntensity * 
                             (1 + Math.sin(time * 0.4 + p.phase) * 0.5);
                
                // Apply vortex effect at high warp
                let vortexX = 0, vortexY = 0;
                if (warpIntensity > 1.0) {
                    const dx = p.x - canvas.width/2;
                    const dy = p.y - canvas.height/2;
                    const dist = Math.sqrt(dx*dx + dy*dy) + 0.1;
                    const angle = Math.atan2(dy, dx) + warpIntensity * 0.05;
                    
                    vortexX = -dy / dist * warpIntensity * 0.5;
                    vortexY = dx / dist * warpIntensity * 0.5;
                }
                
                // Apply movement with warping and vortex
                p.x += p.speed * 0.5 + waveX + flowX + vortexX;
                p.y += p.speed + waveY + flowY + vortexY;
                
                // Apply dimensional distortion at high intensities
                if (warpIntensity > 1.3 && Math.random() < 0.02) {
                    p.x = canvas.width * Math.random();
                    p.y = canvas.height * Math.random();
                }
                
                // Apply nonlinear size distortion
                p.size = p.baseSize * (1 + Math.sin(time + p.phase) * 0.3 * warpIntensity);
                
                // Randomly scale up some particles for "quantum leaps"
                if (warpIntensity > 1.0 && Math.random() < 0.001) {
                    p.size = p.baseSize * (3 + Math.random() * 2);
                }
                
                // Wrap around edges with variation
                if (p.x < -p.size * 2) p.x = canvas.width + p.size;
                if (p.x > canvas.width + p.size * 2) p.x = -p.size;
                if (p.y < -p.size * 2) p.y = canvas.height + p.size;
                if (p.y > canvas.height + p.size * 2) p.y = -p.size;
            });
        }
        
        function draw() {
            // Clear canvas
            ctx.fillStyle = COLORS.background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw subtle flowing background waves
            drawFlowingBackground();
            
            // Draw particles with abstract effects
            drawParticles();
            
            // Apply subtle visual distortions at higher warp intensities
            if (warpIntensity > 1.2) {
                applySubtleDistortion();
            }
        }
        
        function drawParticles() {
            // Draw particles with subtle monotone effects
            particles.forEach((p, index) => {
                // Simple monotone color calculation with subtle variations
                const baseOpacity = p.opacity * (0.6 + Math.sin(time * 0.3 + p.phase) * 0.2);
                const brightness = 200 + Math.sin(p.phase + time * 0.5) * 30;
                
                // Draw subtle trails for flowing effect
                if (warpIntensity > 0.8 && index % 4 === 0) {
                    for (let i = 1; i <= 3; i++) {
                        const trailSize = p.size * (1 - i/4);
                        const trailOpacity = baseOpacity * (1 - i/3) * 0.4;
                        
                        // Simple trail position
                        const trailX = p.x - p.speed * i * 2;
                        const trailY = p.y - p.speed * i * 0.5;
                        
                        ctx.fillStyle = `rgba(${brightness}, ${brightness + 10}, ${brightness + 20}, ${trailOpacity})`;
                        ctx.beginPath();
                        ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                
                // Draw main particle with monotone color
                ctx.fillStyle = `rgba(${brightness}, ${brightness + 15}, ${brightness + 25}, ${baseOpacity})`;
                ctx.beginPath();
                
                // Simple circular particles with subtle size variation
                const dynamicSize = p.size * (1 + Math.sin(time * 0.4 + p.phase) * 0.2 * warpIntensity);
                ctx.arc(p.x, p.y, dynamicSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Add subtle glow for depth
                if (warpIntensity > 0.5 && p.size > 1.2) {
                    const glowSize = dynamicSize * 2;
                    const glowOpacity = baseOpacity * 0.15 * warpIntensity;
                    
                    ctx.shadowBlur = glowSize;
                    ctx.shadowColor = `rgba(${brightness + 20}, ${brightness + 30}, ${brightness + 40}, ${glowOpacity})`;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });
        }
        
        // Draw a polygon with rotation for distorted shapes
        function drawPolygon(x, y, radius, sides, rotation) {
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
                const angle = rotation + i * (Math.PI * 2) / sides;
                const vertexRadius = radius * (1 + Math.sin(time * 2 + angle) * 0.3 * warpIntensity);
                
                const px = x + Math.cos(angle) * vertexRadius;
                const py = y + Math.sin(angle) * vertexRadius;
                
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    // Use bezier curves for even more distortion
                    const prevAngle = rotation + (i - 1) * (Math.PI * 2) / sides;
                    const midAngle = (prevAngle + angle) / 2;
                    const controlRadius = radius * 1.5 * (1 + Math.sin(time + midAngle) * 0.5 * warpIntensity);
                    
                    const cx = x + Math.cos(midAngle) * controlRadius;
                    const cy = y + Math.sin(midAngle) * controlRadius;
                    
                    ctx.quadraticCurveTo(cx, cy, px, py);
                }
            }
            ctx.closePath();
        }
        
        // Draw subtle flowing background with minimal abstract lines
        function drawFlowingBackground() {
            if (warpIntensity < 0.4) return;
            
            const lineCount = Math.floor(3 + warpIntensity * 4);
            const opacity = 0.02 + warpIntensity * 0.03;
            
            ctx.strokeStyle = `rgba(160, 170, 180, ${opacity})`;
            ctx.lineWidth = 0.5;
            
            // Draw horizontal flowing lines
            for (let i = 0; i < lineCount; i++) {
                const y = (canvas.height / (lineCount + 1)) * (i + 1);
                
                ctx.beginPath();
                ctx.moveTo(0, y);
                
                for (let x = 0; x < canvas.width; x += 8) {
                    const waveHeight = Math.sin(x * 0.008 + time * 0.5 + i * 0.3) * 
                                      waveAmplitude * 3 * (1 + Math.sin(time * 0.1));
                    ctx.lineTo(x, y + waveHeight);
                }
                
                ctx.stroke();
            }
            
            // Add vertical flowing lines for depth
            if (warpIntensity > 0.8) {
                const verticalCount = Math.floor(2 + warpIntensity * 2);
                ctx.strokeStyle = `rgba(140, 150, 160, ${opacity * 0.7})`;
                
                for (let i = 0; i < verticalCount; i++) {
                    const x = (canvas.width / (verticalCount + 1)) * (i + 1);
                    
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    
                    for (let y = 0; y < canvas.height; y += 8) {
                        const waveOffset = Math.cos(y * 0.006 + time * 0.4 + i * 0.5) * 
                                          waveAmplitude * 2;
                        ctx.lineTo(x + waveOffset, y);
                    }
                    
                    ctx.stroke();
                }
            }
        }
        
        // Apply subtle visual distortion post-processing effect
        function applySubtleDistortion() {
            // Apply only at very high warp intensities
            if (warpIntensity < 1.3) return;
            
            // Create a subtle screen-wide distortion
            const strength = (warpIntensity - 1.3) * 0.3;
            
            // Apply subtle offset for flowing effect
            const offsetX = Math.sin(time * 0.3) * strength * 8;
            const offsetY = Math.cos(time * 0.2) * strength * 6;
            
            // Store current state
            ctx.globalAlpha = 0.15;
            
            // Draw a subtle shifted copy for depth
            ctx.drawImage(
                canvas, 
                0, 0, canvas.width, canvas.height,
                offsetX, offsetY, canvas.width, canvas.height
            );
            
            // Reset alpha
            ctx.globalAlpha = 1.0;
        }
        
        function stopAnimation() {
            console.log('Stopping animation');
            window.Water.active = false;
            if (window.Water.animationId) {
                cancelAnimationFrame(window.Water.animationId);
                window.Water.animationId = null;
            }
        }
        
        function clearMemory() {
            console.log('Clearing memory');
            particles.length = 0;
        }
        
        // Auto-start if canvas is active
        if (canvas.classList.contains('active')) {
            setTimeout(init, 100);
        }
        
        // Handle page visibility
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                if (window.Water.active) {
                    window.Water._wasActive = true;
                    stopAnimation();
                }
            } else {
                if (window.Water._wasActive) {
                    window.Water._wasActive = false;
                    init();
                }
            }
        });
        
        // Clean up on unload
        window.addEventListener('beforeunload', function() {
            stopAnimation();
            clearMemory();
        });
        
        console.log('Water module loaded');
    } catch (error) {
        console.error('Critical error in Water module initialization:', error);
        window.Water = window.Water || {
            active: false,
            init: function() { console.error('Water module failed to initialize'); },
            stop: function() {},
            clearMemory: function() {},
            lastError: error
        };
    }
})(); 
