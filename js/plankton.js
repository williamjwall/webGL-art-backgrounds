(function() {
    // Device detection for performance optimization
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001a2e); // Deep blue background
    
    const canvas = document.getElementById('plankton-canvas');
    if (!canvas) return; // Exit gracefully if canvas doesn't exist
    
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    
    // Set initial size to match the window
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    camera.position.y = 0;
    
    // Add fog for depth
    scene.fog = new THREE.FogExp2(0x001a2e, 0.02);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x004080, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x0080ff, 0.8);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);
    
    // Create groups for different elements
    const particleGroup = new THREE.Group();
    const animalGroup = new THREE.Group();
    scene.add(particleGroup);
    scene.add(animalGroup);
    
    // Create particles (plankton/bubbles)
    function createParticles() {
        const particleCount = isMobile ? 1000 : 3000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        particleGroup.add(particles);
    }
    
    // Create jellyfish
    function createJellyfish(x, y, z, size) {
        const jellyfish = new THREE.Group();
        
        // Create dome
        const domeGeometry = new THREE.SphereGeometry(size, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMaterial = new THREE.MeshPhongMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.7,
            emissive: 0x0044aa,
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
                color: 0x0088cc,
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
        
        // Set position and add to scene
        jellyfish.position.set(x, y, z);
        
        // Add animation data
        jellyfish.userData = {
            speed: 0.2 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2
        };
        
        animalGroup.add(jellyfish);
    }
    
    // Create fish
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
        
        // Set position and add to scene
        fish.position.set(x, y, z);
        
        // Add animation data
        fish.userData = {
            speed: 0.05 + Math.random() * 0.1,
            turnSpeed: 0.02,
            targetX: x + (Math.random() - 0.5) * 40,
            targetY: y + (Math.random() - 0.5) * 40,
            targetZ: z + (Math.random() - 0.5) * 40
        };
        
        animalGroup.add(fish);
    }
    
    // Create fish school
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
                speed: 0.5 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            };
            
            school.add(fish);
        }
        
        // Set school position
        school.position.set(x, y, z);
        
        // Add animation data
        school.userData = {
            speed: 0.02 + Math.random() * 0.02,
            turnSpeed: 0.005,
            targetX: x + (Math.random() - 0.5) * 40,
            targetY: y + (Math.random() - 0.5) * 40,
            targetZ: z + (Math.random() - 0.5) * 40
        };
        
        animalGroup.add(school);
    }
    
    // Create a simple phylogenetic tree
    function createPhylogeneticTree() {
        const treeGroup = new THREE.Group();
        scene.add(treeGroup);
        
        const trunkHeight = 20;
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.5, trunkHeight, 8);
        const trunkMaterial = new THREE.MeshPhongMaterial({
            color: 0x00aaff,
            emissive: 0x0044aa,
            emissiveIntensity: 0.5
        });
        
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(0, -10, -20); // Position at bottom of scene
        treeGroup.add(trunk);
        
        // Create branches
        createBranch(trunk, trunkHeight / 2, 0, 0, 5, 0);
        
        return treeGroup;
    }
    
    // Create branch recursively
    function createBranch(parentBranch, x, y, z, length, depth) {
        if (depth > 3) return; // Limit recursion depth
        
        const branchGeometry = new THREE.CylinderGeometry(0.1, 0.2, length, 6);
        const branchMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ccff,
            emissive: 0x0044aa,
            emissiveIntensity: 0.3
        });
        
        const branch = new THREE.Mesh(branchGeometry, branchMaterial);
        branch.position.set(x, y, z);
        branch.rotation.z = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
        parentBranch.add(branch);
        
        const endX = 0;
        const endY = length / 2;
        const endZ = 0;
        
        // Create two branches at the end of this branch
        for (let i = 0; i < 2; i++) {
            const newLength = length * 0.7;
            const offsetX = Math.random() * 0.5;
            const offsetY = newLength * 0.5;
            const offsetZ = Math.random() * 0.5;
            
            createBranch(branch, endX + offsetX, endY + offsetY, endZ + offsetZ, newLength, depth + 1);
        }
    }
    
    // Initialize scene
    function init() {
        createParticles();
        
        // Create phylogenetic tree
        const tree = createPhylogeneticTree();
        
        // Create jellyfish
        for (let i = 0; i < (isMobile ? 3 : 7); i++) {
            createJellyfish(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                1 + Math.random() * 2
            );
        }
        
        // Create individual fish
        for (let i = 0; i < (isMobile ? 5 : 15); i++) {
            const fishColors = [0xff6600, 0x00aaff, 0xffcc00, 0xff00cc, 0x00ffaa];
            const color = fishColors[Math.floor(Math.random() * fishColors.length)];
            
            createFish(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                0.5 + Math.random() * 0.5,
                color
            );
        }
        
        // Create fish schools
        for (let i = 0; i < (isMobile ? 2 : 5); i++) {
            const schoolColors = [0x66ccff, 0xffaa00, 0xff6677];
            const color = schoolColors[Math.floor(Math.random() * schoolColors.length)];
            
            createFishSchool(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 40,
                isMobile ? 10 : 20,
                color
            );
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        const time = Date.now() * 0.001;
        
        // Animate particles
        particleGroup.children.forEach(particles => {
            particles.rotation.y = time * 0.02; // Slower rotation
            particles.rotation.x = time * 0.01; // Slower rotation
        });
        
        // Animate animals
        animalGroup.children.forEach(animal => {
            // Jellyfish animation
            if (animal.children[0] && animal.children[0].geometry.type === 'SphereGeometry') {
                // Pulse animation
                const pulse = Math.sin(time * animal.userData.speed * 0.5 + animal.userData.phase) * 0.1 + 1;
                animal.scale.y = pulse;
                
                // Move upward slowly
                animal.position.y += 0.01; // Slower upward movement
                
                // Wrap around when reaching the top
                if (animal.position.y > 30) {
                    animal.position.y = -30;
                    animal.position.x = (Math.random() - 0.5) * 40;
                    animal.position.z = (Math.random() - 0.5) * 40;
                }
                
                // Animate tentacles
                for (let i = 1; i < animal.children.length; i++) {
                    const tentacle = animal.children[i];
                    const swayAmount = 0.1; // Reduced sway
                    tentacle.rotation.z = Math.sin(time * 1 + i) * swayAmount;
                }
            }
            // Individual fish animation
            else if (animal.children.length === 2) { // Body + tail
                // Move toward target
                const dx = animal.userData.targetX - animal.position.x;
                const dy = animal.userData.targetY - animal.position.y;
                const dz = animal.userData.targetZ - animal.position.z;
                
                animal.position.x += dx * animal.userData.speed * 0.5; // Slower movement
                animal.position.y += dy * animal.userData.speed * 0.5; // Slower movement
                animal.position.z += dz * animal.userData.speed * 0.5; // Slower movement
                
                // Rotate to face direction of movement
                if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
                    const targetRotation = Math.atan2(dx, dz);
                    animal.rotation.y += (targetRotation - animal.rotation.y) * animal.userData.turnSpeed * 0.5; // Slower turning
                }
                
                // Wag tail
                animal.children[1].rotation.x = Math.sin(time * 5) * 0.3; // Slower wagging
                
                // Set new target if reached
                if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dz) < 1) {
                    animal.userData.targetX = (Math.random() - 0.5) * 40;
                    animal.userData.targetY = (Math.random() - 0.5) * 40;
                    animal.userData.targetZ = (Math.random() - 0.5) * 40;
                }
            }
            // Fish school animation
            else if (animal.children.length > 2) {
                // Move school toward target
                const dx = animal.userData.targetX - animal.position.x;
                const dy = animal.userData.targetY - animal.position.y;
                const dz = animal.userData.targetZ - animal.position.z;
                
                animal.position.x += dx * animal.userData.speed * 0.5; // Slower movement
                animal.position.y += dy * animal.userData.speed * 0.5; // Slower movement
                animal.position.z += dz * animal.userData.speed * 0.5; // Slower movement
                
                // Rotate to face direction of movement
                if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
                    const targetRotation = Math.atan2(dx, dz);
                    animal.rotation.y += (targetRotation - animal.rotation.y) * animal.userData.turnSpeed * 0.5; // Slower turning
                }
                
                // Animate individual fish in school
                for (let i = 0; i < animal.children.length; i++) {
                    const fish = animal.children[i];
                    const data = fish.userData;
                    
                    // Oscillating movement within school
                    fish.position.x = data.originalX + Math.sin(time * data.speed * 0.5 + data.phase) * 0.3;
                    fish.position.y = data.originalY + Math.cos(time * data.speed * 0.35 + data.phase) * 0.2;
                    fish.position.z = data.originalZ + Math.sin(time * data.speed * 0.25 + data.phase + Math.PI/2) * 0.3;
                    
                    // Wag tail (rotate slightly)
                    fish.rotation.z = Math.sin(time * 5 + i) * 0.1; // Slower wagging
                }
                
                // Set new target if reached
                if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dz) < 1) {
                    animal.userData.targetX = (Math.random() - 0.5) * 40;
                    animal.userData.targetY = (Math.random() - 0.5) * 40;
                    animal.userData.targetZ = (Math.random() - 0.5) * 40;
                }
            }
        });
        
        // Slowly rotate camera for more dynamic view
        camera.position.x = Math.sin(time * 0.05) * 5; // Slower camera movement
        camera.position.y = Math.sin(time * 0.025) * 5; // Slower camera movement
        camera.lookAt(0, 0, 0);
        
        // Animate phylogenetic tree
        scene.children.forEach(child => {
            if (child.userData && child.userData.growthState !== undefined) {
                // Grow the tree gradually
                if (child.userData.growthState < 1) {
                    child.userData.growthState += child.userData.growthSpeed;
                    const growth = THREE.MathUtils.smoothstep(child.userData.growthState, 0, 1);
                    child.scale.set(growth, growth, growth);
                }
                
                // Animate branches to grow and shrink
                child.traverse(object => {
                    if (object.geometry && object.geometry.type === 'CylinderGeometry') {
                        const scale = 1 + Math.sin(time * 0.5 + object.position.y) * 0.1;
                        object.scale.set(scale, scale, scale);
                    }
                });
            }
        });
        
        renderer.render(scene, camera);
    }
    
    // Start the animation
    init();
    animate();
})();