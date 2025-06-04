(function() {
    // Create a namespace for this visualization
    const PhylogeneticTrees = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        clearMemory: clearMemory
    };
    
    // Expose to global scope
    window.PhylogeneticTrees = PhylogeneticTrees;
    
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001a2e); // Deep blue background
    
    const canvas = document.getElementById('phylogenetic-canvas');
    if (!canvas) return; // Exit gracefully if canvas doesn't exist
    
    // Set canvas to be fixed position and cover the viewport
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1'; // Place behind other content
    
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true // Allow transparency
    });
    
    // Set initial size to match the window
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Create camera with wider view
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 70;
    
    // Enhanced lighting for artistic effect
    const ambientLight = new THREE.AmbientLight(0x004080, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x0080ff, 1.0);
    directionalLight.position.set(1, 10, 10);
    scene.add(directionalLight);
    
    const backLight = new THREE.DirectionalLight(0x00aaff, 0.5);
    backLight.position.set(-5, -10, -10);
    scene.add(backLight);
    
    // Tree system properties - increased depth and capacity
    let branches = []; // Changed from const to let to allow reassignment during cleanup
    const maxBranchDepth = 40; // Much deeper for longer reach
    const maxBranches = 2000; // More branches
    
    // Global growth state - optimized for faster, more dynamic cycles with shorter growth phases
    let growthState = {
        phase: 'growing', // 'growing' or 'receding'
        timer: 0,
        // Shorter growth, more frequent recessions
        growthDuration: 2000 + Math.random() * 4000, // Shorter growth periods
        recessDuration: 100 + Math.random() * 250,  // Slightly longer recessions
        maxRecedeDistance: 10 + Math.random() * 25,   // More aggressive recession
        recedeDownwardBias: 0.7 // Strong downward bias when receding
    };
    
    // Enhanced colors for more vibrant appearance
    const branchColors = [
        0x0066cc, 0x0088ff, 0x00aaff, 0x00ccff, 0x00ddff, 0x66ffff
    ];
    
    // Create a branch segment
    function createBranchSegment(startX, startY, startZ, length, thickness, direction, depth = 0, parent = null) {
        if (branches.length >= maxBranches || depth >= maxBranchDepth) return null;
        
        // Create branch geometry - use curved segments for more natural look
        const points = [];
        const segments = 12; // More segments for smoother curves
        const curveAmount = 0.1 + Math.random() * 0.7; // More dramatic curves
        
        // Create points for the curved path
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = startX + direction.x * length * t + (Math.random() - 0.5) * curveAmount * t;
            const y = startY + direction.y * length * t + (Math.random() - 0.5) * curveAmount * t;
            const z = startZ + direction.z * length * t + (Math.random() - 0.5) * curveAmount * t;
            points.push(new THREE.Vector3(x, y, z));
        }
        
        // Create a smooth curve from the points
        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, 8, thickness, 8, false);
        
        // Enhanced material with more visual interest
        const colorIndex = Math.min(Math.floor(Math.random() * 2) + depth, branchColors.length - 1);
        const material = new THREE.MeshPhongMaterial({
            color: branchColors[colorIndex],
            emissive: branchColors[colorIndex],
            emissiveIntensity: 0.4 + Math.random() * 0.3,
            transparent: true,
            opacity: 0.6 + Math.random() * 0.4,
            shininess: 50 + Math.random() * 50
        });
        
        const branchMesh = new THREE.Mesh(geometry, material);
        scene.add(branchMesh);
        
        // Calculate end position
        const endPoint = points[points.length - 1];
        
        // Store branch data with random growth properties
        const branch = {
            mesh: branchMesh,
            x: endPoint.x,
            y: endPoint.y,
            z: endPoint.z,
            depth: depth,
            thickness: thickness,
            direction: direction,
            children: [],
            parent: parent,
            createTime: Date.now(),
            branchDelay: 20 + Math.random() * 80, // Much faster branching
            hasBranched: false,
            originalLength: length, // Store original length for receding
            growthFactor: 0.7 + Math.random() * 0.6, // More variable growth
            recedeChance: Math.random(),  // Random chance this branch will recede more/less
            pulseRate: 0.3 + Math.random() * 0.7, // Variable pulse rate
            startY: startY // Remember start Y position for recession
        };
        
        branches.push(branch);
        
        if (parent) {
            parent.children.push(branch);
        }
        
        return branch;
    }
    
    // Create the initial branches at a lower position
    function createInitialBranches() {
        // Start with branches from the bottom spreading upward
        const baseY = -50; // Start from an even lower position
        
        // Random number of initial branches for more variety
        const initialBranchCount = 3 + Math.floor(Math.random() * 5);
        
        // Create initial branches in multiple directions
        for (let i = 0; i < initialBranchCount; i++) {
            const angle = (i / initialBranchCount) * Math.PI * 2;
            
            // More random direction with stronger upward tendency
            const direction = {
                x: Math.cos(angle) * (0.3 + Math.random() * 0.5),
                y: 0.8 + Math.random() * 0.2, // Stronger upward bias
                z: Math.sin(angle) * (0.3 + Math.random() * 0.5)
            };
            
            // Normalize direction
            const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
            direction.x /= len;
            direction.y /= len;
            direction.z /= len;
            
            // Longer initial branches
            createBranchSegment(
                (Math.random() - 0.5) * 15, // Wider starting spread
                baseY + (Math.random() - 0.5) * 5, 
                (Math.random() - 0.5) * 15,
                8 + Math.random() * 8, // Much longer initial branches
                0.3 + Math.random() * 0.4,
                direction,
                0
            );
        }
    }
    
    // Generate new branches from existing branches
    function growBranches() {
        if (growthState.phase === 'receding') return; // Don't grow during recession
        
        const now = Date.now();
        
        // Get branches that haven't branched yet
        const unbranched = branches.filter(branch => 
            !branch.hasBranched && 
            now - branch.createTime > branch.branchDelay &&
            branch.depth < maxBranchDepth
        );
        
        // Process more branches at once for faster growth
        const toProcess = Math.min(unbranched.length, 20);
        
        for (let i = 0; i < toProcess; i++) {
            const branch = unbranched[i];
            
            // Number of branches varies with depth and random factors
            const branchCount = Math.max(1, Math.floor(branch.growthFactor * 3 * Math.pow(0.9, branch.depth)) + Math.floor(Math.random() * 3));
            
            for (let j = 0; j < branchCount; j++) {
                // Calculate new direction with more randomness
                const newDir = {
                    x: branch.direction.x + (Math.random() - 0.5) * 0.8,
                    y: branch.direction.y + (Math.random() - 0.5) * 0.6 + 0.2, // Bias upward
                    z: branch.direction.z + (Math.random() - 0.5) * 0.8
                };
                
                // Normalize direction vector
                const len = Math.sqrt(newDir.x * newDir.x + newDir.y * newDir.y + newDir.z * newDir.z);
                newDir.x /= len;
                newDir.y /= len;
                newDir.z /= len;
                
                // Make thinner with depth, but with randomness
                const newThickness = branch.thickness * (0.6 + Math.random() * 0.3);
                
                // Length varies significantly per branch - some much longer
                const lengthFactor = (branch.growthFactor > 1.1) ? 2.0 : 1.2; // Longer branches
                const newLength = lengthFactor * (5 + Math.random() * 10) * Math.pow(0.97, branch.depth);
                
                createBranchSegment(
                    branch.x, branch.y, branch.z,
                    newLength,
                    newThickness,
                    newDir,
                    branch.depth + 1,
                    branch
                );
            }
            
            branch.hasBranched = true;
        }
    }
    
    // Recede branches from the ends with stronger downward movement
    function recedeBranches() {
        if (growthState.phase === 'growing') return; // Don't recede during growth
        
        // Find leaf branches (those with no children) AND some non-leaf branches too
        const leafBranches = branches.filter(branch => branch.children.length === 0);
        const nonLeafBranches = branches.filter(branch => 
            branch.children.length > 0 && 
            Math.random() < 0.1 // 10% chance to also recede non-leaf branches for more dramatic effect
        );
        
        const branchesToProcess = [...leafBranches, ...nonLeafBranches];
        
        // Process more branches at once for faster recession
        const toProcess = Math.min(branchesToProcess.length, 40); // Process more branches at once
        
        for (let i = 0; i < toProcess; i++) {
            const index = Math.floor(Math.random() * branchesToProcess.length);
            const branchToProcess = branchesToProcess[index];
            
            // More dramatic receding effects
            const recedeDistanceFactor = branchToProcess.recedeChance > 0.5 ? 2.5 : 1.5; // More aggressive recession
            const recedeDistance = recedeDistanceFactor * Math.random() * growthState.maxRecedeDistance;
            
            // Higher chance to completely remove
            const completelyRemove = Math.random() < 0.5; // 50% chance to remove
            
            if (completelyRemove) {
                // For non-leaf branches, recursively remove all children
                if (branchToProcess.children.length > 0) {
                    const removeChildrenRecursively = (branch) => {
                        for (let j = branch.children.length - 1; j >= 0; j--) {
                            removeChildrenRecursively(branch.children[j]);
                        }
                        scene.remove(branch.mesh);
                        const branchIndex = branches.indexOf(branch);
                        if (branchIndex >= 0) {
                            branches.splice(branchIndex, 1);
                        }
                    };
                    
                    for (let j = branchToProcess.children.length - 1; j >= 0; j--) {
                        removeChildrenRecursively(branchToProcess.children[j]);
                    }
                    branchToProcess.children = [];
                }
                
                // Remove from parents' children list
                if (branchToProcess.parent) {
                    const parentChildren = branchToProcess.parent.children;
                    const childIndex = parentChildren.indexOf(branchToProcess);
                    if (childIndex >= 0) {
                        parentChildren.splice(childIndex, 1);
                    }
                }
                
                // Remove from scene
                scene.remove(branchToProcess.mesh);
                
                // Remove from branches array
                const branchIndex = branches.indexOf(branchToProcess);
                if (branchIndex >= 0) {
                    branches.splice(branchIndex, 1);
                }
            } else {
                // Just shrink the branch with downward movement
                const newLength = Math.max(0.1, branchToProcess.originalLength - recedeDistance);
                
                // Update the branch's length 
                branchToProcess.mesh.scale.set(1, newLength / branchToProcess.originalLength, 1);
                
                // Move the branch downward with a stronger bias
                const downwardMovement = recedeDistance * growthState.recedeDownwardBias;
                branchToProcess.mesh.position.y -= downwardMovement;
                
                // If receded too much, remove it
                if (newLength < 0.5) {
                    // Remove from parents' children list
                    if (branchToProcess.parent) {
                        const parentChildren = branchToProcess.parent.children;
                        const childIndex = parentChildren.indexOf(branchToProcess);
                        if (childIndex >= 0) {
                            parentChildren.splice(childIndex, 1);
                        }
                    }
                    
                    // Remove from scene
                    scene.remove(branchToProcess.mesh);
                    
                    // Remove from branches array
                    const branchIndex = branches.indexOf(branchToProcess);
                    if (branchIndex >= 0) {
                        branches.splice(branchIndex, 1);
                    }
                }
            }
            
            // Remove from branchesToProcess to avoid duplicate removal
            branchesToProcess.splice(index, 1);
        }
    }
    
    // Check if we should switch to recession phase - with random early recession chance
    function checkForRecession() {
        // Random chance to start receding early
        if (growthState.phase === 'growing' && 
            growthState.timer > growthState.growthDuration * 0.3 && // At least 30% into growth
            Math.random() < 0.002) { // Small random chance each frame
            
            growthState.phase = 'receding';
            growthState.timer = 0;
            // Randomize recede duration for next cycle
            growthState.recessDuration = 100 + Math.random() * 250;
            growthState.maxRecedeDistance = 10 + Math.random() * 25;
        }
    }
    
    // Update branches system - grow or recede based on the current phase
    function updateBranches() {
        const now = Date.now();
        
        // Update growth state
        growthState.timer += 16; // Approximate for requestAnimationFrame
        
        // Check for random early recession
        checkForRecession();
        
        if (growthState.phase === 'growing' && growthState.timer >= growthState.growthDuration) {
            growthState.phase = 'receding';
            growthState.timer = 0;
            // Randomize recede duration for next cycle
            growthState.recessDuration = 100 + Math.random() * 250;
            growthState.maxRecedeDistance = 10 + Math.random() * 25;
        } else if (growthState.phase === 'receding' && growthState.timer >= growthState.recessDuration) {
            growthState.phase = 'growing';
            growthState.timer = 0;
            // Randomize growth duration for next cycle
            growthState.growthDuration = 2000 + Math.random() * 4000;
            
            // More frequent restarts for variety
            if (branches.length < 10 || Math.random() < 0.2) { // 20% chance to completely restart
                // Remove any remaining branches
                while (branches.length > 0) {
                    const branch = branches.pop();
                    scene.remove(branch.mesh);
                }
                createInitialBranches();
            }
        }
        
        // Grow or recede based on current phase
        if (growthState.phase === 'growing') {
            growBranches();
        } else {
            recedeBranches();
        }
        
        // Animate branches with more artistic motion
        const time = Date.now() * 0.001;
        branches.forEach((branch, index) => {
            // More dynamic pulse effect
            const pulse = 0.92 + Math.sin(time * branch.pulseRate + branch.depth + index * 0.1) * 0.08;
            
            // Update scale in all directions for more organic feel
            const xScale = pulse * (1 + Math.sin(time * 0.3 + index) * 0.05);
            const yScale = branch.mesh.scale.y; // Preserve y scale (length)
            const zScale = pulse * (1 + Math.cos(time * 0.3 + index) * 0.05);
            
            branch.mesh.scale.set(xScale, yScale, zScale);
            
            // More dramatic color shifts
            if (branch.mesh.material) {
                branch.mesh.material.emissiveIntensity = 0.2 + Math.sin(time * 0.7 + branch.depth) * 0.3;
                
                // Occasionally change color completely
                if (Math.random() < 0.001) {
                    const newColorIndex = Math.floor(Math.random() * branchColors.length);
                    branch.mesh.material.color.setHex(branchColors[newColorIndex]);
                    branch.mesh.material.emissive.setHex(branchColors[newColorIndex]);
                }
            }
        });
    }
    
    // Initialize scene
    function init() {
        console.log('Initializing PhylogeneticTrees visualization...');
        const canvas = document.getElementById('phylogenetic-canvas');
        if (!canvas) {
            console.error('Canvas not found!');
            return;
        }
        
        // Ensure we're starting fresh
        PhylogeneticTrees.active = true;
        
        // Clear any existing animation
        if (PhylogeneticTrees.animationId) {
            cancelAnimationFrame(PhylogeneticTrees.animationId);
            PhylogeneticTrees.animationId = null;
        }
        
        // Reset growth state
        growthState = {
            phase: 'growing',
            timer: 0,
            growthDuration: 2000 + Math.random() * 4000,
            recessDuration: 100 + Math.random() * 250,
            maxRecedeDistance: 10 + Math.random() * 25,
            recedeDownwardBias: 0.7
        };
        
        // Create initial branches if none exist
        if (branches.length === 0) {
            createInitialBranches();
        }
        
        // Start the animation loop
        animate();
        
        console.log('PhylogeneticTrees initialization complete');
    }
    
    // Animation loop
    function animate() {
        if (!PhylogeneticTrees.active) return;
        
        PhylogeneticTrees.animationId = requestAnimationFrame(animate);
        
        updateBranches();
        
        // More dynamic camera movement
        camera.position.y = Math.sin(Date.now() * 0.0001) * 5;
        camera.lookAt(0, 0, 0);
        
        // Gentle scene rotation
        scene.rotation.y = Math.sin(Date.now() * 0.00008) * 0.1;
        
        renderer.render(scene, camera);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    function stopAnimation() {
        console.log('Stopping PhylogeneticTrees animation...');
        PhylogeneticTrees.active = false;
        if (PhylogeneticTrees.animationId) {
            cancelAnimationFrame(PhylogeneticTrees.animationId);
            PhylogeneticTrees.animationId = null;
        }
    }
    
    function clearMemory() {
        console.log('Clearing PhylogeneticTrees memory...');
        stopAnimation();
        
        // Dispose of WebGL resources
        if (scene) {
            // Clear all branches from the scene
            while (branches.length > 0) {
                const branch = branches.pop();
                if (branch && branch.mesh) {
                    scene.remove(branch.mesh);
                    if (branch.mesh.material) {
                        branch.mesh.material.dispose();
                    }
                    if (branch.mesh.geometry) {
                        branch.mesh.geometry.dispose();
                    }
                }
            }
            
            // Clear the scene - safely remove remaining objects
            const objectsToRemove = [...scene.children]; // Create a copy of the array
            objectsToRemove.forEach(object => {
                if (object !== ambientLight && object !== directionalLight && object !== backLight) {
                    scene.remove(object);
                    // Dispose of materials and geometries if available
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                    if (object.geometry) object.geometry.dispose();
                }
            });
        }
        
        // Clear branches array
        branches = [];
        
        // Reset growth state
        growthState = {
            phase: 'growing',
            timer: 0,
            growthDuration: 2000 + Math.random() * 4000,
            recessDuration: 100 + Math.random() * 250,
            maxRecedeDistance: 10 + Math.random() * 25,
            recedeDownwardBias: 0.7
        };
    }

    // Initialize on load but don't start animation until explicitly called
    createInitialBranches();
})(); 