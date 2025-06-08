(function() {
    console.log('LifesArrival script loaded');
    // Simple namespace for this visualization
    window.LifesArrival = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        symbols: []
    };
    
    const canvas = document.getElementById('lifesarrival-canvas');
    if (!canvas) {
        console.error('Canvas not found: lifesarrival-canvas');
        return; // Exit if canvas doesn't exist
    }
    
    console.log('LifesArrival canvas found:', canvas);
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        console.log('Canvas resized:', canvas.width, 'x', canvas.height);
    }
    
    // Listen for resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Core data
    const symbols = window.LifesArrival.symbols;
    const MAX_SYMBOLS = 2000; // More symbols for immersion
    const MAX_CONNECTIONS = 3;
    
    // IPA (International Phonetic Alphabet) symbols
    const ipaSymbols = "ɑæɐɒʌəɚɛɜɝɪɨɔɵʊʉeɘɤøɶœɶʏiɪɨʉuʊyʋɹɻʀɽɾrɺɥjɰwʍʎʟɫɬɮɱmɯɰɲnɳŋɴβbɓƀɕcçɗdðɖɟfɡɠɢhɦħɧʜʝkɬɭɮlɫʟɱmɲnɳŋɴɸpɹɺɻʁɽɾʀʃʂsʃtθʈʧʦʋvʌɣxχʒʐzʑʔʕʡʢ";
    
    // Animation variables
    let time = 0;
    const breatheCycle = 500; // Longer breathing cycle for slower feel
    let breathePhase = 0;
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    
    // Camera motion - 3D rotation and drift
    let cameraX = 0;
    let cameraY = 0;
    let cameraZ = 0;
    let globalRotationAngle = 0;
    let fallAcceleration = 0.001;
    const cameraDriftSpeed = 0.04; // Very slow camera drift
    const globalRotationSpeed = 0.0005; // Very slow global rotation
    
    // Depth range - for full immersion
    const DEPTH_RANGE = 2000; // Deeper Z range for a wider field of view
    const MIN_DEPTH = -1000; // Further behind
    const MAX_DEPTH = 1000;  // Further in front
    
    // Space dimensions - larger than viewport for immersion
    const SPACE_WIDTH = canvas.width * 4;
    const SPACE_HEIGHT = canvas.height * 4;
    const SPACE_DEPTH = DEPTH_RANGE;
    
    // Center point for perspective
    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2;
    
    // Perspective settings
    const FOCAL_LENGTH = 800; // Increased focal length for wider perspective
    
    // Check if we should auto-start
    console.log('Canvas active:', canvas.classList.contains('active'));
    if (canvas.classList.contains('active')) {
        console.log('Auto-initializing LifesArrival');
        setTimeout(init, 100); // Small delay to ensure DOM is ready
    }
    
    function init() {
        console.log('Initializing LifesArrival');
        
        // Reset camera - start further back
        cameraX = 0;
        cameraY = 0;
        cameraZ = -400; // Start with a more distant view
        globalRotationAngle = 0;
        
        // Clear existing symbols
        symbols.length = 0;
        
        // Create initial symbols
        const initialCount = Math.min(MAX_SYMBOLS, Math.floor(canvas.width * canvas.height / 6000));
        console.log('Creating', initialCount, 'symbols');
        
        // Distribute symbols in 3D space
        for (let i = 0; i < initialCount; i++) {
            // Create random position in 3D space - not in a sphere but throughout the volume
            const x = (Math.random() * SPACE_WIDTH) - (SPACE_WIDTH / 2);
            const y = (Math.random() * SPACE_HEIGHT) - (SPACE_HEIGHT / 2);
            const z = (Math.random() * SPACE_DEPTH) + MIN_DEPTH;
            
            const symbol = createSymbol();
            symbol.x3D = x;
            symbol.y3D = y;
            symbol.z3D = z;
            
            // Project to 2D for initial position (with perspective)
            const scale = FOCAL_LENGTH / (FOCAL_LENGTH + symbol.z3D);
            symbol.x = centerX + symbol.x3D * scale;
            symbol.y = centerY + symbol.y3D * scale;
            
            symbols.push(symbol);
        }
        
        // Start animation
        if (!window.LifesArrival.active) {
            window.LifesArrival.active = true;
            console.log('Starting animation');
            animate(0);
        }
    }
    
    function createSymbol() {
        // Random IPA symbol
        const char = ipaSymbols.charAt(Math.floor(Math.random() * ipaSymbols.length));
        const fontSize = 18 + Math.random() * 32; // Larger font size range
        
        return {
            x: 0, // Will be set during initialization
            y: 0, // Will be set during initialization
            x3D: 0, // 3D coordinates
            y3D: 0,
            z3D: 0,
            character: char,
            fontSize: fontSize,
            baseFontSize: fontSize,
            vx: (Math.random() - 0.5) * 0.2, // Slow natural drift
            vy: (Math.random() - 0.5) * 0.2,
            vz: (Math.random() - 0.5) * 0.05, // Very slow z drift
            alpha: 0.5 + Math.random() * 0.5, // Higher minimum alpha
            consciousness: 0,
            awakening: Math.random() < 0.5, // More symbols awaken
            awakeningSpeed: 0.0002 + Math.random() * 0.0005, // Faster awakening
            rotationAngle: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.001, // Very slow rotation
            meaning: Math.random(),
            connected: [],
            brightness: 0.5 + Math.random() * 0.5 // Higher brightness
        };
    }
    
    function update() {
        if (!window.LifesArrival.active) return;
        
        time++;
        
        // Update breathing phase - slower cycle
        breathePhase = (breathePhase + 1) % breatheCycle;
        const breatheFactor = Math.sin((breathePhase / breatheCycle) * Math.PI);
        
        // More stable, wider camera motion
        cameraX = Math.sin(time * 0.0001) * 100;
        cameraY = Math.cos(time * 0.00015) * 70;
        
        // Slower forward movement for a more stable view
        fallAcceleration = Math.min(0.02, fallAcceleration * 1.0005);
        cameraZ += 0.3 + fallAcceleration;
        
        // Occasional gentle camera sway
        if (time % 800 < 200) {
            cameraX += Math.sin(time * 0.003) * 5;
            cameraY += Math.cos(time * 0.004) * 5;
        }
        
        // Reset camera position periodically to continue falling,
        // but keep it further back for a wider view
        if (cameraZ > 300) {
            cameraZ = -400;
            fallAcceleration = 0.001; // Reset acceleration when recycling
        }
        
        // Update global rotation for 3D immersion
        globalRotationAngle += globalRotationSpeed;
        
        // Occasionally create new symbols if under limit - create more symbols more frequently
        if (time % 10 === 0 && symbols.length < MAX_SYMBOLS) {
            const newSymbolCount = Math.min(15, MAX_SYMBOLS - symbols.length);
            for (let i = 0; i < newSymbolCount; i++) {
                const symbol = createSymbol();
                
                // Create new symbols in front of camera direction
                symbol.x3D = (Math.random() * SPACE_WIDTH) - (SPACE_WIDTH / 2);
                symbol.y3D = (Math.random() * SPACE_HEIGHT) - (SPACE_HEIGHT / 2);
                symbol.z3D = MAX_DEPTH; // Create far away, will move toward viewer
                
                symbols.push(symbol);
            }
        }
        
        // Clear connections to rebuild
        symbols.forEach(symbol => {
            symbol.connected = [];
        });
        
        // Update all symbols
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            
            // Very slow drift movement in 3D
            symbol.x3D += symbol.vx;
            symbol.y3D += symbol.vy;
            // Restore natural drift in z dimension
            symbol.z3D += symbol.vz;
            
            // When symbols go out of range in any direction, wrap them around
            if (symbol.z3D < MIN_DEPTH) symbol.z3D = MAX_DEPTH;
            if (symbol.z3D > MAX_DEPTH) symbol.z3D = MIN_DEPTH;
            
            // Calculate relative position to camera
            let relX = symbol.x3D - cameraX;
            let relY = symbol.y3D - cameraY;
            const relZ = symbol.z3D - cameraZ;
            
            // Apply global rotation to create 3D world effect
            const cosAngle = Math.cos(globalRotationAngle);
            const sinAngle = Math.sin(globalRotationAngle);
            const rotatedX = relX * cosAngle - relY * sinAngle;
            const rotatedY = relX * sinAngle + relY * cosAngle;
            relX = rotatedX;
            relY = rotatedY;
            
            // Perspective projection
            if (relZ <= 0) {
                // Symbol is behind camera, make it loop around
                symbol.z3D = MAX_DEPTH;
                continue;
            }
            
            const scale = FOCAL_LENGTH / (FOCAL_LENGTH + relZ);
            
            // Project 3D to 2D with perspective
            symbol.x = centerX + relX * scale;
            symbol.y = centerY + relY * scale;
            
            // Keep scale for rendering
            symbol.scale = scale;
            
            // Very slow rotation
            symbol.rotationAngle += symbol.rotationSpeed;
            
            // Breathing effect on size
            symbol.fontSize = symbol.baseFontSize * (1 + (breatheFactor * 0.05));
            
            // Update consciousness
            if (symbol.awakening && symbol.consciousness < 1) {
                symbol.consciousness += symbol.awakeningSpeed;
                if (symbol.consciousness > 1) symbol.consciousness = 1;
                
                // As consciousness increases, alpha increases
                symbol.alpha = 0.2 + (symbol.consciousness * 0.7);
                symbol.brightness = 0.2 + (symbol.consciousness * 0.6);
            }
            
            // Wrap around if outside space boundaries
            if (symbol.x3D < -SPACE_WIDTH/2) symbol.x3D = SPACE_WIDTH/2;
            if (symbol.x3D > SPACE_WIDTH/2) symbol.x3D = -SPACE_WIDTH/2;
            if (symbol.y3D < -SPACE_HEIGHT/2) symbol.y3D = SPACE_HEIGHT/2;
            if (symbol.y3D > SPACE_HEIGHT/2) symbol.y3D = -SPACE_HEIGHT/2;
            
            // Small organic drift adjustment inspired by plankton advice
            if (Math.random() < 0.005) {
                symbol.vx += (Math.random() - 0.5) * 0.005;
                symbol.vy += (Math.random() - 0.5) * 0.005;
                symbol.vz += (Math.random() - 0.5) * 0.0025;
                
                // Enhanced damping for smoother motion
                symbol.vx *= 0.98;
                symbol.vy *= 0.98;
                symbol.vz *= 0.98;
            }
        }
        
        // Sort symbols by Z distance from camera for proper rendering
        symbols.sort((a, b) => (b.z3D - cameraZ) - (a.z3D - cameraZ));
        
        // Find connections between conscious symbols in 3D space
        // Limit connections to nearby symbols to reduce visual clutter
        const connectionRange = 200;
        
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            if (symbol.consciousness < 0.6) continue;
            if (symbol.connected.length >= MAX_CONNECTIONS) continue;
            
            // Only process a subset of symbols for efficiency
            const startIndex = Math.max(0, i - 20);
            const endIndex = Math.min(symbols.length, i + 20);
            
            for (let j = startIndex; j < endIndex; j++) {
                if (i === j) continue;
                
                const otherSymbol = symbols[j];
                if (otherSymbol.consciousness < 0.6 || 
                    otherSymbol.connected.length >= MAX_CONNECTIONS) continue;
                
                // Calculate 3D distance
                const dx = symbol.x3D - otherSymbol.x3D;
                const dy = symbol.y3D - otherSymbol.y3D;
                const dz = symbol.z3D - otherSymbol.z3D;
                const distance3D = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (distance3D < connectionRange) {
                    // Only connect symbols with similar meaning
                    const meaningDiff = Math.abs(symbol.meaning - otherSymbol.meaning);
                    if (meaningDiff < 0.2) {
                        // Avoid duplicate connections
                        if (!symbol.connected.find(c => c.index === j)) {
                            symbol.connected.push({
                                index: j,
                                strength: 1 - meaningDiff
                            });
                        }
                    }
                }
            }
        }
    }
    
    function draw() {
        if (!window.LifesArrival.active) return;
        
        // Clear canvas with solid black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw connections first (back to front)
        ctx.lineWidth = 0.4;
        
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            
            if (symbol.consciousness < 0.6) continue;
            
            // Connection opacity based on distance
            const distanceFactor = Math.min(1, (MAX_DEPTH / (symbol.z3D - cameraZ)));
            
            // Draw connections
            for (let j = 0; j < symbol.connected.length; j++) {
                const connection = symbol.connected[j];
                if (connection.index >= symbols.length) continue;
                
                const otherSymbol = symbols[connection.index];
                
                // Skip if either symbol is behind camera
                if ((symbol.z3D - cameraZ) <= 0 || (otherSymbol.z3D - cameraZ) <= 0) continue;
                
                // Calculate opacity based on distance and connection strength - make more visible
                const opacity = Math.min(1.0, connection.strength * 0.5 * distanceFactor);
                
                // Mellow yellow and blue components based on distance - brighter colors
                const blueComponent = 150 + Math.floor(distanceFactor * 80);
                const yellowComponent = 220 - Math.floor(distanceFactor * 50);
                
                // Connection color - yellow instead of green, brighter
                ctx.strokeStyle = `rgba(${yellowComponent}, ${yellowComponent-30}, ${blueComponent}, ${opacity})`;
                ctx.beginPath();
                ctx.moveTo(symbol.x, symbol.y);
                ctx.lineTo(otherSymbol.x, otherSymbol.y);
                ctx.stroke();
            }
        }
        
        // Draw symbols (back to front)
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            
            // Skip if behind camera
            if ((symbol.z3D - cameraZ) <= 0) continue;
            
            // Calculate distance factor
            const distanceFactor = Math.min(1, (MAX_DEPTH / (symbol.z3D - cameraZ)));
            
            // Skip very far or very transparent symbols - allow closer to camera
            if (distanceFactor < 0.03 || symbol.alpha < 0.05) continue;
            
            // Size based on perspective and base size; increase by 50% to make symbols appear bigger
            const displaySize = Math.floor(symbol.fontSize * symbol.scale * 1.5);
            if (displaySize < 1) continue; // Skip if too small
            
            ctx.font = `bold ${displaySize}px Arial`; // Make font bold
            
            // Start as shadow, become vivid as they approach - always bright
            const shadowFactor = Math.max(0, 1 - distanceFactor);
            const brightness = Math.floor(255 * distanceFactor); // Full brightness
            const blueIntensity = brightness + Math.floor(shadowFactor * 70);
            const yellowIntensity = 240 - Math.floor(distanceFactor * 30); // Brighter yellow
            
            // Apply alpha based on distance and consciousness - higher baseline
            const displayAlpha = Math.max(0.5, symbol.alpha * distanceFactor);
            
            // Color with distance effect - bright yellow and white
            ctx.fillStyle = `rgba(${yellowIntensity}, ${yellowIntensity - 10}, ${blueIntensity}, ${displayAlpha})`;
            ctx.globalAlpha = displayAlpha;
            
            // Draw with rotation
            ctx.save();
            ctx.translate(symbol.x, symbol.y);
            ctx.rotate(symbol.rotationAngle);
            
            // Draw the symbol
            ctx.fillText(symbol.character, -displaySize/2, displaySize/3);
            
            // Reset
            ctx.restore();
        }
        
        // Reset global alpha
        ctx.globalAlpha = 1;
    }
    
    function animate(timestamp) {
        if (!window.LifesArrival.active) {
            console.log('LifesArrival not active, stopping animation');
            return;
        }
        
        const elapsed = timestamp - lastFrameTime;
        
        if (elapsed > frameInterval) {
            lastFrameTime = timestamp - (elapsed % frameInterval);
            
            update();
            draw();
            console.log('LifesArrival animation frame rendered');
        }
        
        window.LifesArrival.animationId = requestAnimationFrame(animate);
    }
    
    function stopAnimation() {
        console.log('Stopping LifesArrival animation');
        window.LifesArrival.active = false;
        if (window.LifesArrival.animationId) {
            cancelAnimationFrame(window.LifesArrival.animationId);
            window.LifesArrival.animationId = null;
        }
    }
    
    // Handle resize with throttling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeCanvas();
            if (window.LifesArrival.active) {
                // Update center point - fix declaration
                centerX = window.innerWidth / 2;
                centerY = window.innerHeight / 2;
                init();
            }
        }, 500);
    });
    
    // Export for debugging
    window.LifesArrival.debug = {
        canvas: canvas,
        ctx: ctx,
        symbols: symbols
    };
    
    console.log('LifesArrival module loaded');
})(); 

