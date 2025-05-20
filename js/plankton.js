/**
 * Plankton Visualization
 * 
 * A 3D aquatic ecosystem visualization using Three.js
 */
(function() {
    // Create a namespace for this visualization
    window.Plankton = {
        active: false,
        animationId: null,
        init: initialize,
        stop: stopAnimation
    };

    // Constants
    const BOUNDS = 40;
    const COLORS = {
        background: 0x001a2e,
        ambient: 0x003060,
        directional: 0x005080,
        particles: 0x6699bb,
        jellyfishDome: 0x4477aa,
        jellyfishEmissive: 0x002244,
        jellyfishTentacle: 0x336688,
        trunk: 0x4477aa,
        branchEmissive: 0x002244,
        fishColors: [0xaa5533, 0x447788, 0xaa9944, 0x884466, 0x55aa88],
        schoolColors: [0x5588aa, 0xaa7744, 0x886677]
    };

    // Device detection for performance optimization
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Scene elements
    let scene, camera, renderer;
    let particleGroup, animalGroup;
    
    /**
     * Initialize the scene and all elements
     */
    function initialize() {
        // Skip if already active
        if (window.Plankton.active) return;
        
        // Set up initial state
        window.Plankton.active = true;
        setupScene();
        createEnvironment();
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
     * Set up the Three.js scene, camera, and renderer
     */
    function setupScene() {
        const canvas = document.getElementById('plankton-canvas');
        if (!canvas) return; // Exit gracefully if canvas doesn't exist
        
        // Initialize scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(COLORS.background);
        scene.fog = new THREE.FogExp2(COLORS.background, 0.02);
        
        // Set up renderer
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Set up camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(COLORS.ambient, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(COLORS.directional, 0.8);
        directionalLight.position.set(0, 10, 10);
        scene.add(directionalLight);
        
        // Create groups for different elements
        particleGroup = new THREE.Group();
        animalGroup = new THREE.Group();
        scene.add(particleGroup);
        scene.add(animalGroup);
    }
    
    /**
     * Create all environment elements
     */
    function createEnvironment() {
        createParticles();
        createAquaticLife();
    }
    
    /**
     * Add event listeners for window resize
     */
    function addEventListeners() {
        window.addEventListener('resize', () => {
            if (!window.Plankton.active) return;
            
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    /**
     * Create particles representing plankton/microbial life
     */
    function createParticles() {
        const particleCount = isMobile ? 1000 : 3000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * BOUNDS * 1.5;
            positions[i * 3 + 1] = (Math.random() - 0.5) * BOUNDS * 1.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * BOUNDS * 1.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: COLORS.particles,
            size: 0.3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        particleGroup.add(particles);
    }
    
    /**
     * Create all aquatic life forms
     */
    function createAquaticLife() {
        // Create jellyfish
        const jellyfishCount = isMobile ? 3 : 7;
        for (let i = 0; i < jellyfishCount; i++) {
            createJellyfish(
                (Math.random() - 0.5) * BOUNDS,
                (Math.random() - 0.5) * BOUNDS,
                (Math.random() - 0.5) * BOUNDS,
                1 + Math.random() * 2
            );
        }
        
        // Create individual fish
        const fishCount = isMobile ? 5 : 15;
        for (let i = 0; i < fishCount; i++) {
            const color = COLORS.fishColors[Math.floor(Math.random() * COLORS.fishColors.length)];
            createFish(
                (Math.random() - 0.5) * BOUNDS,
                (Math.random() - 0.5) * BOUNDS,
                (Math.random() - 0.5) * BOUNDS,
                0.5 + Math.random() * 0.5,
                color
            );
        }
        
        // Create fish schools
        const schoolCount = isMobile ? 2 : 5;
        for (let i = 0; i < schoolCount; i++) {
            const color = COLORS.schoolColors[Math.floor(Math.random() * COLORS.schoolColors.length)];
            createFishSchool(
                (Math.random() - 0.5) * BOUNDS,
                (Math.random() - 0.5) * BOUNDS,
                (Math.random() - 0.5) * BOUNDS,
                isMobile ? 10 : 20,
                color
            );
        }
    }
    
    /**
     * Create a jellyfish entity
     */
    function createJellyfish(x, y, z, size) {
        const jellyfish = new THREE.Group();
        
        // Create dome
        const domeGeometry = new THREE.SphereGeometry(size, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMaterial = new THREE.MeshPhongMaterial({
            color: COLORS.jellyfishDome,
            transparent: true,
            opacity: 0.7,
            emissive: COLORS.jellyfishEmissive,
            shininess: 100
        });
        
        const dome = new THREE.Mesh(domeGeometry, domeMaterial);
        dome.rotation.x = Math.PI; // Flip dome to face downward
        jellyfish.add(dome);
        
        // Add tentacles
        const tentacleCount = 8;
        for (let i = 0; i < tentacleCount; i++) {
            const angle = (i / tentacleCount) * Math.PI * 2;
            const radius = size * 0.8;
            
            const tentacleGeometry = new THREE.BoxGeometry(0.1 * size, size * 2, 0.1 * size);
            const tentacleMaterial = new THREE.MeshPhongMaterial({
                color: COLORS.jellyfishTentacle,
                transparent: true,
                opacity: 0.6
            });
            
            const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);
            tentacle.position.set(
                Math.cos(angle) * radius,
                -size,
                Math.sin(angle) * radius
            );
            tentacle.rotation.x = Math.PI / 2;
            
            // Store original position and rotation for animation
            tentacle.userData = {
                angle: angle,
                radius: radius
            };
            
            jellyfish.add(tentacle);
        }
        
        // Set position and animation data
        jellyfish.position.set(x, y, z);
        jellyfish.userData = {
            speed: 0.1 + Math.random() * 0.15,
            phase: Math.random() * Math.PI * 2,
            type: 'jellyfish'
        };
        
        animalGroup.add(jellyfish);
    }
    
    /**
     * Create an individual fish
     */
    function createFish(x, y, z, size, color) {
        const fish = new THREE.Group();
        
        // Create fish body
        const bodyGeometry = new THREE.ConeGeometry(size, size * 2, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 80
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.y = Math.PI; // Face forward
        fish.add(body);
        
        // Create tail
        const tailGeometry = new THREE.ConeGeometry(size * 1.2, size, 8);
        const tailMaterial = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 80
        });
        
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.z = size;
        tail.rotation.y = Math.PI;
        fish.add(tail);
        
        // Set position and animation data
        fish.position.set(x, y, z);
        fish.userData = {
            speed: 0.02 + Math.random() * 0.04,
            turnSpeed: 0.01,
            targetX: x + (Math.random() - 0.5) * BOUNDS,
            targetY: y + (Math.random() - 0.5) * BOUNDS,
            targetZ: z + (Math.random() - 0.5) * BOUNDS,
            type: 'fish'
        };
        
        animalGroup.add(fish);
    }
    
    /**
     * Create a school of fish
     */
    function createFishSchool(x, y, z, count, color) {
        const school = new THREE.Group();
        
        for (let i = 0; i < count; i++) {
            const fishSize = 0.3 + Math.random() * 0.2;
            
            // Create simple fish shape
            const fishGeometry = new THREE.ConeGeometry(fishSize, fishSize * 2, 8);
            const fishMaterial = new THREE.MeshPhongMaterial({
                color: color,
                shininess: 80
            });
            
            const fish = new THREE.Mesh(fishGeometry, fishMaterial);
            fish.rotation.y = Math.PI; // Face forward
            
            // Position fish within school
            fish.position.set(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5
            );
            
            // Store original position for animation
            fish.userData = {
                originalX: fish.position.x,
                originalY: fish.position.y,
                originalZ: fish.position.z,
                speed: 0.2 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2
            };
            
            school.add(fish);
        }
        
        // Set school position and animation data
        school.position.set(x, y, z);
        school.userData = {
            speed: 0.01 + Math.random() * 0.01,
            turnSpeed: 0.003,
            targetX: x + (Math.random() - 0.5) * BOUNDS,
            targetY: y + (Math.random() - 0.5) * BOUNDS,
            targetZ: z + (Math.random() - 0.5) * BOUNDS,
            type: 'school'
        };
        
        animalGroup.add(school);
    }
    
    /**
     * Main animation loop
     */
    function animate() {
        if (!window.Plankton.active) return;
        
        window.Plankton.animationId = requestAnimationFrame(animate);
        
        const time = Date.now() * 0.001;
        
        animateParticles(time);
        animateAquaticLife(time);
        animateCamera(time);
        
        renderer.render(scene, camera);
    }
    
    /**
     * Animate the plankton particles
     */
    function animateParticles(time) {
        particleGroup.children.forEach(particles => {
            particles.rotation.y = time * 0.02;
            particles.rotation.x = time * 0.01;
        });
    }
    
    /**
     * Animate all aquatic life forms
     */
    function animateAquaticLife(time) {
        animalGroup.children.forEach(animal => {
            const type = animal.userData.type;
            
            if (type === 'jellyfish') {
                animateJellyfish(animal, time);
            } else if (type === 'fish') {
                animateFish(animal, time);
            } else if (type === 'school') {
                animateFishSchool(animal, time);
            }
        });
    }
    
    /**
     * Animate jellyfish entity
     */
    function animateJellyfish(jellyfish, time) {
        // Pulse animation
        const pulse = Math.sin(time * jellyfish.userData.speed * 0.5 + jellyfish.userData.phase) * 0.1 + 1;
        jellyfish.scale.y = pulse;
        
        // Move upward slowly
        jellyfish.position.y += 0.005;
        
        // Wrap around when reaching the top
        if (jellyfish.position.y > BOUNDS * 0.75) {
            jellyfish.position.y = -BOUNDS * 0.75;
            jellyfish.position.x = (Math.random() - 0.5) * BOUNDS;
            jellyfish.position.z = (Math.random() - 0.5) * BOUNDS;
        }
        
        // Animate tentacles
        for (let i = 1; i < jellyfish.children.length; i++) {
            const tentacle = jellyfish.children[i];
            const swayAmount = 0.05;
            tentacle.rotation.z = Math.sin(time * 0.7 + i) * swayAmount;
        }
    }
    
    /**
     * Animate individual fish
     */
    function animateFish(fish, time) {
        const data = fish.userData;
        
        // Move toward target
        const dx = data.targetX - fish.position.x;
        const dy = data.targetY - fish.position.y;
        const dz = data.targetZ - fish.position.z;
        
        fish.position.x += dx * data.speed * 0.3;
        fish.position.y += dy * data.speed * 0.3;
        fish.position.z += dz * data.speed * 0.3;
        
        // Rotate to face direction of movement
        if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
            const targetRotation = Math.atan2(dx, dz);
            fish.rotation.y += (targetRotation - fish.rotation.y) * data.turnSpeed * 0.5;
        }
        
        // Wag tail
        fish.children[1].rotation.x = Math.sin(time * 3) * 0.2;
        
        // Set new target if reached
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dz) < 1) {
            data.targetX = (Math.random() - 0.5) * BOUNDS;
            data.targetY = (Math.random() - 0.5) * BOUNDS;
            data.targetZ = (Math.random() - 0.5) * BOUNDS;
        }
        
        // Ensure fish stays within bounds
        keepEntityInBounds(fish);
    }
    
    /**
     * Animate fish school
     */
    function animateFishSchool(school, time) {
        const data = school.userData;
        
        // Move school toward target
        const dx = data.targetX - school.position.x;
        const dy = data.targetY - school.position.y;
        const dz = data.targetZ - school.position.z;
        
        school.position.x += dx * data.speed * 0.3;
        school.position.y += dy * data.speed * 0.3;
        school.position.z += dz * data.speed * 0.3;
        
        // Rotate to face direction of movement
        if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
            const targetRotation = Math.atan2(dx, dz);
            school.rotation.y += (targetRotation - school.rotation.y) * data.turnSpeed * 0.5;
        }
        
        // Animate individual fish in school
        for (let i = 0; i < school.children.length; i++) {
            const fish = school.children[i];
            const fishData = fish.userData;
            
            // Oscillating movement within school
            fish.position.x = fishData.originalX + Math.sin(time * fishData.speed * 0.3 + fishData.phase) * 0.2;
            fish.position.y = fishData.originalY + Math.cos(time * fishData.speed * 0.2 + fishData.phase) * 0.15;
            fish.position.z = fishData.originalZ + Math.sin(time * fishData.speed * 0.15 + fishData.phase + Math.PI/2) * 0.2;
            
            // Wag tail (rotate slightly)
            fish.rotation.z = Math.sin(time * 3 + i) * 0.07;
        }
        
        // Set new target if reached
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dz) < 1) {
            data.targetX = (Math.random() - 0.5) * BOUNDS;
            data.targetY = (Math.random() - 0.5) * BOUNDS;
            data.targetZ = (Math.random() - 0.5) * BOUNDS;
        }
        
        // Ensure school stays within bounds
        keepEntityInBounds(school);
    }
    
    /**
     * Keep entities within scene boundaries
     */
    function keepEntityInBounds(entity) {
        const halfBounds = BOUNDS * 0.5;
        
        if (Math.abs(entity.position.x) > halfBounds) {
            entity.position.x = Math.sign(entity.position.x) * halfBounds;
            if (entity.userData.targetX) {
                entity.userData.targetX = -entity.position.x * 0.8;
            }
        }
        
        if (Math.abs(entity.position.y) > halfBounds) {
            entity.position.y = Math.sign(entity.position.y) * halfBounds;
            if (entity.userData.targetY) {
                entity.userData.targetY = -entity.position.y * 0.8;
            }
        }
        
        if (Math.abs(entity.position.z) > halfBounds) {
            entity.position.z = Math.sign(entity.position.z) * halfBounds;
            if (entity.userData.targetZ) {
                entity.userData.targetZ = -entity.position.z * 0.8;
            }
        }
    }
    
    /**
     * Animate camera movement
     */
    function animateCamera(time) {
        camera.position.x = Math.sin(time * 0.03) * 5;
        camera.position.y = Math.sin(time * 0.015) * 5;
        camera.lookAt(0, 0, 0);
    }
    
    // Initialize if this is the active canvas
    const canvas = document.getElementById('plankton-canvas');
    if (canvas && canvas.classList.contains('active')) {
        initialize();
    }
})();