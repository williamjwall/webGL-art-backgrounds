// Birds - Minimalist One-Line Birds for Web Background
(function() {
    // Create a namespace for this visualization
    window.Birds = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation
    };

    const canvas = document.getElementById('birds-canvas');
    if (!canvas) {
        console.error("Birds canvas not found!");
        return;
    }

    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Darker, subtle color palette
    const COLORS = {
        background: '#111927', // Dark blue-gray
        backgroundGradientTop: '#0c1220',
        backgroundGradientBottom: '#1a2433',
        birdColor: '#aabbcc', // Soft gray-blue
        cloudColor: '#223344'  // Dark cloud color
    };

    let birds = [];
    let time = 0;

    class Bird {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = 2 + Math.random() * 2; // Smaller birds
            this.speed = 0.4 + Math.random() * 0.5; // Slower speed for background
            this.angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed * 0.2; // Less vertical movement
            this.turnSpeed = 0.002 + Math.random() * 0.002; // Very gentle turning
            this.targetAngle = this.angle;
            
            // For graceful movement
            this.sinOffset = Math.random() * Math.PI * 2;
            this.sinAmplitude = 0.3 + Math.random() * 0.2;
            this.sinFrequency = 0.005 + Math.random() * 0.005;
            
            // Subtle opacity variation
            this.opacity = 0.4 + Math.random() * 0.2;
            
            // Bird shape parameters
            this.wingWidth = 15 + Math.random() * 10;
            this.waveAmplitude = 4 + Math.random() * 3;
        }

        update() {
            // Occasionally change direction with smooth transitions
            if (Math.random() < 0.002) {
                this.targetAngle = Math.random() * Math.PI * 2;
            }
            
            // Gracefully turn toward target angle
            const angleDiff = this.targetAngle - this.angle;
            
            // Ensure we take the shortest path to the target angle
            const wrappedAngleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
            
            this.angle += wrappedAngleDiff * this.turnSpeed;
            
            // Add gentle sine wave to movement for gracefulness
            const sinMotion = Math.sin(time * this.sinFrequency + this.sinOffset) * this.sinAmplitude;
            
            // Calculate new velocity
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed * 0.2 + sinMotion * 0.05;
            
            // Update position
            this.x += this.vx;
            this.y += this.vy;
            
            // Keep birds within bounds
            if (this.x > canvas.width + 100) this.x = -100;
            if (this.x < -100) this.x = canvas.width + 100;
            if (this.y > canvas.height + 100) this.y = -100;
            if (this.y < -100) this.y = canvas.height + 100;
            
            // Keep birds mostly in the upper half of the screen
            if (this.y > canvas.height * 0.7 && Math.random() < 0.02) {
                this.targetAngle = -Math.PI/4 + (Math.random() - 0.5) * Math.PI/2;
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            // Simple one-line bird - classic "M" or gull shape
            ctx.beginPath();
            ctx.moveTo(0, 0); // Center point
            
            // Enhanced wing flapping - more pronounced for the "M" shape
            const wingFlap = Math.sin(time * 0.5 + this.sinOffset) * this.waveAmplitude;
            const wingTipFlap = Math.sin(time * 0.5 + this.sinOffset) * (this.waveAmplitude * 1.5);
            
            // Left wing - simple curved line with more dynamic tip
            ctx.lineTo(-this.wingWidth/2, wingFlap/2); // Wing midpoint
            ctx.lineTo(-this.wingWidth, wingTipFlap); // Wing tip
            
            // Right wing - simple curved line with more dynamic tip
            ctx.moveTo(0, 0); // Back to center
            ctx.lineTo(this.wingWidth/2, wingFlap/2); // Wing midpoint
            ctx.lineTo(this.wingWidth, wingTipFlap); // Wing tip
            
            ctx.strokeStyle = `rgba(${hexToRgb(COLORS.birdColor).r}, ${hexToRgb(COLORS.birdColor).g}, ${hexToRgb(COLORS.birdColor).b}, ${this.opacity})`;
            ctx.lineWidth = this.size * 0.5;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            ctx.restore();
        }
    }

    function init() {
        resizeCanvas();
        birds = [];
        time = 0;
        
        // Create birds - more birds but very subtle
        const numBirds = 25 + Math.floor(Math.random() * 15);
        for (let i = 0; i < numBirds; i++) {
            birds.push(new Bird(
                Math.random() * canvas.width,
                Math.random() * canvas.height * 0.8
            ));
        }

        if (!window.Birds.active) {
            window.Birds.active = true;
            animate();
        }
    }

    function update() {
        time += 0.016;
        birds.forEach(bird => bird.update());
    }

    function draw() {
        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, COLORS.backgroundGradientTop);
        gradient.addColorStop(1, COLORS.backgroundGradientBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add very subtle star-like dots
        drawStars();
        
        // Draw birds
        birds.forEach(bird => bird.draw());
    }
    
    function drawStars() {
        const numStars = 100;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        
        for (let i = 0; i < numStars; i++) {
            // Use a deterministic pattern based on time and index
            const x = (Math.sin(i * 0.33 + time * 0.01) * 0.5 + 0.5) * canvas.width;
            const y = (Math.cos(i * 0.74 + time * 0.005) * 0.5 + 0.5) * canvas.height;
            const size = (Math.sin(i * 0.92 + time * 0.02) * 0.5 + 0.5) * 1.5;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function animate() {
        if (!window.Birds.active) return;
        update();
        draw();
        window.Birds.animationId = requestAnimationFrame(animate);
    }

    function stopAnimation() {
        window.Birds.active = false;
        if (window.Birds.animationId) {
            cancelAnimationFrame(window.Birds.animationId);
            window.Birds.animationId = null;
        }
    }
    
    // Helper to convert hex to RGB
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }

    // Auto-initialize if the canvas is active
    if (canvas.classList.contains('active')) {
        init();
    }
})(); 
