/**
 * Plankton Visualization
 * 
 * Artistic particle system with dynamic traveling particles for art website background
 */
(function() {
    // Create a namespace for this visualization
    window.Plankton = {
        active: false,
        animationId: null,
        init: initialize,
        stop: stopAnimation,
        clearMemory: clearMemory
    };

    // Constants
    const BOUNDS = 40;
    // Enhanced color palette for artistic effect
    const COLORS = {
        // Deep dark background with slight blue tint
        background: 0x08090d,
        // Very subtle ambient light
        ambient: 0x1a1e24,
        // Gentle directional light
        directional: 0x2c3138,
        // Traveling particle colors
        particleColors: [
            0xffffff, // White
            0xe0e0ff, // Light blue
            0xffe0e0, // Light pink
            0xe0ffe0  // Light green
        ],
        // Main particle colors - muted monochrome with subtle tints
        mainParticleColors: [
            0xced3df, 0xb0b6c4, 0x8a92a5, 
            0x646d82, 0x4e5871
        ]
    };

    // Device detection for performance optimization
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Scene elements
    let scene, camera, renderer;
    let mainParticleSystem;
    let mainParticlePositions;
    let travelingParticles = [];
    let currentParticleIndex = 0;
    let targetParticleIndex = 1;
    
    // Traveling particle settings
    const MAX_TRAVELING_PARTICLES = isMobile ? 20 : 40;
    const TRAVELING_PARTICLE_SIZE = 0.12;
    const TRAVELING_PARTICLE_SPEED = 0.002;
    
    // Artistic parameters
    const MAX_CONNECTIONS = 1; // Only one connection at a time
    const CONNECTION_DISTANCE = 25; // Increased for more spread
    const MIN_CONNECTIONS_DISTANCE = 10; // Increased minimum distance
    
    /**
     * Initialize the scene and all elements
     */
    function initialize() {
        if (window.Plankton.active) return;
        
        window.Plankton.active = true;
        setupScene();
        createMainParticles();
        addEventListeners();
        animate();
    }
    
    /**
     * Stop the animation and clean up
     */
    function stopAnimation() {
        window.Plankton.active = false;
        if (window.Plankton.animationId) {
            cancelAnimationFrame(window.Plankton.animationId);
            window.Plankton.animationId = null;
        }
    }
    
    /**
     * Clear memory and resources
     */
    function clearMemory() {
        stopAnimation();
        
        // Dispose of geometries and materials
        if (scene) {
            scene.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            
            scene = null;
            camera = null;
            renderer = null;
            mainParticleSystem = null;
            mainParticlePositions = null;
            travelingParticles = [];
        }
        
        // Remove event listeners
        window.removeEventListener('resize', handleResize);
    }
    
    // Event handler for window resize
    function handleResize() {
        if (!window.Plankton.active) return;
        
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Set up the Three.js scene, camera, and renderer
     */
    function setupScene() {
        const canvas = document.getElementById('plankton-canvas');
        if (!canvas) return; // Exit gracefully if canvas doesn't exist
        
        // Initialize scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(COLORS.background);
        // Subtle fog for depth
        scene.fog = new THREE.FogExp2(COLORS.background, 0.01);
        
        // Set up renderer with higher quality
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance
        
        // Set up camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 35;
        
        // Subtle lighting
        const ambientLight = new THREE.AmbientLight(COLORS.ambient, 0.8);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(COLORS.directional, 0.6);
        directionalLight.position.set(0, 10, 10);
        scene.add(directionalLight);
    }
    
    /**
     * Add event listeners for window resize
     */
    function addEventListeners() {
        window.addEventListener('resize', handleResize);
    }
    
    /**
     * Create main particles
     */
    function createMainParticles() {
        const particleCount = isMobile ? 300 : 800;
        
        const geometry = new THREE.BufferGeometry();
        mainParticlePositions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            const x = (Math.random() - 0.5) * BOUNDS;
            const y = (Math.random() - 0.5) * BOUNDS;
            const z = (Math.random() - 0.5) * BOUNDS;
            
            mainParticlePositions[i * 3] = x;
            mainParticlePositions[i * 3 + 1] = y;
            mainParticlePositions[i * 3 + 2] = z;
            
            const color = new THREE.Color(COLORS.mainParticleColors[
                Math.floor(Math.random() * COLORS.mainParticleColors.length)
            ]);
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            sizes[i] = 0.5 + Math.random() * 1.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(mainParticlePositions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            transparent: true,
            opacity: 0.7,
            vertexColors: true,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });
        
        mainParticleSystem = new THREE.Points(geometry, material);
        scene.add(mainParticleSystem);
        
        currentParticleIndex = Math.floor(Math.random() * particleCount);
        targetParticleIndex = Math.floor(Math.random() * particleCount);
        while (targetParticleIndex === currentParticleIndex) {
            targetParticleIndex = Math.floor(Math.random() * particleCount);
        }
    }

    /**
     * Create a traveling particle
     */
    function createTravelingParticle() {
        const geometry = new THREE.SphereGeometry(TRAVELING_PARTICLE_SIZE, 8, 8);
        const color = COLORS.particleColors[Math.floor(Math.random() * COLORS.particleColors.length)];
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Choose random starting particle
        const startIndex = Math.floor(Math.random() * (mainParticlePositions.length / 3));
        const startPos = new THREE.Vector3(
            mainParticlePositions[startIndex * 3],
            mainParticlePositions[startIndex * 3 + 1],
            mainParticlePositions[startIndex * 3 + 2]
        );
        particle.position.copy(startPos);
        
        // Choose random target particle
        let targetIndex;
        do {
            targetIndex = Math.floor(Math.random() * (mainParticlePositions.length / 3));
        } while (targetIndex === startIndex);
        
        const targetPos = new THREE.Vector3(
            mainParticlePositions[targetIndex * 3],
            mainParticlePositions[targetIndex * 3 + 1],
            mainParticlePositions[targetIndex * 3 + 2]
        );
        
        particle.userData.targetPos = targetPos;
        particle.userData.progress = 0;
        particle.userData.speed = TRAVELING_PARTICLE_SPEED * (0.9 + Math.random() * 0.2);
        particle.userData.startPos = startPos;
        
        scene.add(particle);
        travelingParticles.push(particle);
    }

    /**
     * Update traveling particles
     */
    function updateTravelingParticles() {
        // Create new particles if needed
        if (travelingParticles.length < MAX_TRAVELING_PARTICLES) {
            createTravelingParticle();
        }
        
        // Update existing particles
        for (let i = travelingParticles.length - 1; i >= 0; i--) {
            const particle = travelingParticles[i];
            
            // Smooth easing function for progress
            const easeProgress = (t) => {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            };
            
            // Update progress with individual speed
            particle.userData.progress += particle.userData.speed;
            
            if (particle.userData.progress >= 1) {
                // When particle reaches target, create a new one
                scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                travelingParticles.splice(i, 1);
                createTravelingParticle();
                continue;
            }
            
            // Update position with smooth easing
            const easedProgress = easeProgress(particle.userData.progress);
            particle.position.lerpVectors(particle.userData.startPos, particle.userData.targetPos, easedProgress);
            
            // Very subtle glow effect
            const glowIntensity = Math.sin(particle.userData.progress * Math.PI) * 0.1 + 0.4;
            particle.material.opacity = glowIntensity;
            particle.scale.setScalar(1 + glowIntensity * 0.2);
        }
    }

    /**
     * Main animation loop
     */
    function animate() {
        if (!window.Plankton.active) return;
        
        window.Plankton.animationId = requestAnimationFrame(animate);
        
        const time = Date.now() * 0.0005;
        
        updateTravelingParticles();
        animateCamera(time);
        
        renderer.render(scene, camera);
    }
    
    /**
     * Animate camera
     */
    function animateCamera(time) {
        // Slightly enhance camera movement for better depth perception
        camera.position.x = Math.sin(time * 0.15) * 2.5;
        camera.position.y = Math.cos(time * 0.15) * 2.5;
        
        // Always look at center
        camera.lookAt(0, 0, 0);
    }
    
    // Initialize if this is the active canvas
    const canvas = document.getElementById('plankton-canvas');
    if (canvas && canvas.classList.contains('active')) {
        initialize();
    }
})();