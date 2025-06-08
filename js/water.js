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
        
        // Enhanced color palette
        const COLORS = {
            primary: 'rgba(220, 220, 240, 0.7)',
            secondary: 'rgba(160, 180, 200, 0.5)',
            background: 'rgb(5, 6, 10)',
            accent: 'rgba(120, 140, 160, 0.4)',
            dark: 'rgba(30, 35, 40, 0.6)',
            highlights: 'rgba(200, 220, 255, 0.8)'
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
            
            // Draw reality-warping background patterns
            drawRealityWarp();
            
            // Draw warp effect background (subtle waves)
            if (warpIntensity > 0.3) {
                drawWarpBackground();
            }
            
            // Draw particles with mind-bending effects
            drawParticles();
            
            // Draw cycle indicator
            drawCycleIndicator();
            
            // Apply visual distortions at higher warp intensities
            if (warpIntensity > 1.0) {
                applyVisualDistortion();
            }
        }
        
        function drawParticles() {
            // Draw particles with trail effects for mind-bending visuals
            particles.forEach((p, index) => {
                // Calculate color based on cycle and position with extreme color shifts
                const hue = (210 + colorShift * 40 * Math.sin(p.phase + time)) % 360;
                const saturation = 70 + colorShift * 30;
                const lightness = 70 + colorShift * 20 * Math.sin(time * 0.5 + p.phase);
                
                // Draw trails for higher intensity
                if (warpIntensity > 0.8 && index % 3 === 0) {
                    for (let i = 1; i <= 5; i++) {
                        const trailSize = p.size * (1 - i/6);
                        const trailOpacity = p.opacity * (1 - i/5) * 0.6;
                        
                        // Calculate trail position with spiral effect
                        const angle = time * 2 + p.phase + i * 0.2;
                        const trailX = p.x + Math.cos(angle) * i * warpIntensity * 3;
                        const trailY = p.y + Math.sin(angle) * i * warpIntensity * 3;
                        
                        ctx.fillStyle = `hsla(${(hue + i * 15) % 360}, ${saturation}%, ${lightness}%, ${trailOpacity})`;
                        ctx.beginPath();
                        ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                
                // Draw main particle
                ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${p.opacity})`;
                ctx.beginPath();
                
                // Draw distorted shapes instead of circles at higher intensities
                if (warpIntensity > 1.2 && p.size > 1.5) {
                    const sides = 3 + Math.floor(Math.sin(time + p.phase) * 3);
                    drawPolygon(p.x, p.y, p.size * (1 + Math.sin(time + p.phase) * 0.3), sides, time + p.phase);
                } else {
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                }
                
                ctx.fill();
                
                // Add extreme glow effects
                if (warpIntensity > 0.5) {
                    const glowSize = p.size * (2 + warpIntensity * 0.5);
                    const glowColor = `hsla(${(hue + 30) % 360}, ${saturation}%, ${lightness + 10}%, ${0.1 + warpIntensity * 0.1})`;
                    
                    ctx.shadowBlur = glowSize;
                    ctx.shadowColor = glowColor;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    
                    // Add secondary glow for extreme intensity
                    if (warpIntensity > 1.3 && index % 5 === 0) {
                        ctx.shadowBlur = glowSize * 2;
                        ctx.shadowColor = `hsla(${(hue + 180) % 360}, ${saturation}%, ${lightness + 20}%, 0.2)`;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
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
        
        // Draw reality-warping background effects
        function drawRealityWarp() {
            // Skip if warp intensity is low
            if (warpIntensity < 0.7) return;
            
            // Create fractal-like patterns
            const fractals = Math.floor(3 + warpIntensity * 5);
            
            for (let f = 0; f < fractals; f++) {
                const centerX = canvas.width * (0.3 + Math.sin(time * 0.2 + f) * 0.4);
                const centerY = canvas.height * (0.3 + Math.cos(time * 0.3 + f) * 0.4);
                const radius = (50 + Math.sin(time * 0.1 + f) * 30) * warpIntensity;
                
                // Draw spiraling fractal patterns
                const arms = 3 + Math.floor(warpIntensity * 3);
                const hue = (40 * f + time * 20) % 360;
                
                for (let a = 0; a < arms; a++) {
                    const baseAngle = (Math.PI * 2 * a / arms) + time * (0.1 + f * 0.05);
                    
                    ctx.beginPath();
                    ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${0.03 + warpIntensity * 0.02})`;
                    ctx.lineWidth = 0.5 + warpIntensity * 0.5;
                    
                    for (let i = 0; i < 30; i++) {
                        const spiralRadius = i * radius / 30;
                        const spiralAngle = baseAngle + i * 0.2 * Math.sin(time * 0.2 + f);
                        
                        const x = centerX + Math.cos(spiralAngle) * spiralRadius;
                        const y = centerY + Math.sin(spiralAngle) * spiralRadius;
                        
                        if (i === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();
                }
            }
        }
        
        // Draw subtle wave patterns in background
        function drawWarpBackground() {
            const lineCount = Math.floor(5 + warpIntensity * 10);
            const opacity = 0.05 + warpIntensity * 0.05;
            
            ctx.strokeStyle = `rgba(120, 140, 180, ${opacity})`;
            ctx.lineWidth = 0.5;
            
            for (let i = 0; i < lineCount; i++) {
                const y = (canvas.height / lineCount) * i;
                
                ctx.beginPath();
                ctx.moveTo(0, y);
                
                for (let x = 0; x < canvas.width; x += 10) {
                    const waveHeight = Math.sin(x * 0.01 + time + i * 0.5) * 
                                      waveAmplitude * 10 * (1 + Math.sin(time * 0.2));
                    ctx.lineTo(x, y + waveHeight);
                }
                
                ctx.stroke();
            }
        }
        
        // Draw cycle indicator
        function drawCycleIndicator() {
            const progress = (Date.now() - cycleStartTime) / CYCLE_DURATION;
            
            // Position in top right corner
            const x = canvas.width - 100;
            const y = 20;
            
            // Get cycle name
            let cycleName;
            switch(currentCycle) {
                case 1: cycleName = "REALITY RIPPLES"; break;
                case 2: cycleName = "FRACTAL CONVERGENCE"; break;
                case 3: cycleName = "DIMENSION COLLAPSE"; break;
                case 4: cycleName = "NEURAL PULSE"; break;
                case 5: cycleName = "REALITY UNBOUND"; break;
                default: cycleName = `CYCLE ${currentCycle}`;
            }
            
            // Draw cycle text with glitch effect
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            
            // Draw glitched text shadows for high intensity
            if (warpIntensity > 1.0) {
                const glitchAmount = warpIntensity * 3;
                const hueShift = Math.floor(time * 30) % 360;
                
                ctx.fillStyle = `hsla(${hueShift}, 70%, 60%, 0.5)`;
                ctx.fillText(cycleName, x + 50 + Math.sin(time * 10) * glitchAmount, y + Math.cos(time * 15) * glitchAmount);
                
                ctx.fillStyle = `hsla(${(hueShift + 180) % 360}, 70%, 60%, 0.5)`;
                ctx.fillText(cycleName, x + 50 + Math.cos(time * 12) * glitchAmount, y + Math.sin(time * 8) * glitchAmount);
            }
            
            // Draw main text
            ctx.fillStyle = 'rgba(180, 200, 220, 0.7)';
            ctx.fillText(cycleName, x + 50, y);
            
            // Draw progress bar
            ctx.fillStyle = 'rgba(50, 60, 80, 0.4)';
            ctx.fillRect(x, y + 5, 50, 3);
            
            // Draw progress with color based on cycle
            const progressHue = (currentCycle * 70 + time * 20) % 360;
            ctx.fillStyle = `hsla(${progressHue}, 70%, 60%, 0.8)`;
            ctx.fillRect(x, y + 5, 50 * progress, 3);
        }
        
        // Apply visual distortion post-processing effect
        function applyVisualDistortion() {
            // Apply only at very high warp intensities
            if (warpIntensity < 1.3) return;
            
            // Create a screen-wide distortion
            const strength = (warpIntensity - 1.3) * 0.8;
            const frequency = 0.01 + Math.sin(time * 0.3) * 0.005;
            
            // Copy current canvas
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 0.4;
            
            // Apply distortion
            for (let i = 0; i < 3; i++) {
                const offsetX = Math.sin(time * (0.5 + i * 0.2)) * strength * 15;
                const offsetY = Math.cos(time * (0.7 + i * 0.3)) * strength * 15;
                
                // Draw shifted copies
                ctx.drawImage(
                    canvas, 
                    0, 0, canvas.width, canvas.height,
                    offsetX, offsetY, canvas.width, canvas.height
                );
            }
            
            // Reset alpha
            ctx.globalAlpha = 1.0;
            
            // Apply color shift
            ctx.globalCompositeOperation = 'hue';
            ctx.fillStyle = `hsla(${(time * 50) % 360}, 100%, 50%, ${strength * 0.4})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Reset composite operation
            ctx.globalCompositeOperation = 'source-over';
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
