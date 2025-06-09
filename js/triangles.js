// WebGL Triangles Animation with K-Means Clustering
(function() {
    // Create a namespace for this visualization
    const Triangles = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        clearMemory: clearMemory
    };
    
    // Expose to global scope
    window.Triangles = Triangles;
    
    const canvas = document.getElementById('triangles-canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    // Mobile detection
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!gl) {
        console.warn('WebGL not supported, falling back to canvas renderer');
        return;
    }
    
    // Resize canvas to fill window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Vertex shader program
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;
        
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying lowp vec4 vColor;
        
        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;
        }
    `;
    
    // Fragment shader program
    const fsSource = `
        varying lowp vec4 vColor;
        
        void main(void) {
            gl_FragColor = vColor;
        }
    `;
    
    // Touch and interaction variables
    let touchStartX = 0;
    let touchStartY = 0;
    let isDragging = false;
    let lastDragTime = 0;
    let dragVelocity = { x: 0, y: 0 };
    let cameraOffset = { x: 0, y: 0 };
    let targetCameraOffset = { x: 0, y: 0 };
    
    // Global vars
    let shaderProgram = null;
    let programInfo = null;
    let triangles = [];
    let centroids = [];
    let then = 0;
    let startTime = 0;
    
    function init() {
        console.log('Initializing Triangles visualization...');
        
        // Initialize WebGL
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }
        
        // Resize canvas
        resizeCanvas();
        
        // Initialize shader program if needed
        if (!shaderProgram) {
            shaderProgram = initShaderProgram(gl, vsSource, fsSource);
            if (!shaderProgram) {
                console.error('Failed to initialize shader program');
                return;
            }
            
            // Collect all the info needed to use the shader program
            programInfo = {
                program: shaderProgram,
                attribLocations: {
                    vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                    vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
                },
                uniformLocations: {
                    projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                    modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                },
            };
        }
        
        // Reset animation variables with an offset to make it appear already in progress
        then = 0;
        // Start with a time offset of 60 seconds (as if it's been running for a minute)
        startTime = (Date.now() * 0.001) - 60;
        
        // Adjust number of triangles based on device type
        const triangleCount = isMobileDevice ? 80 : 150; // Fewer triangles on mobile
        
        // Initialize triangles and centroids
        initCentroids();
        triangles = initBuffers(gl, triangleCount);
        assignClusters(triangles);

        // Setup touch events for mobile interaction
        setupTouchInteraction();
        
        // Create text overlay canvas if it doesn't exist
        if (!document.getElementById('text-overlay')) {
            const textCanvas = document.createElement('canvas');
            textCanvas.id = 'text-overlay';
            textCanvas.width = window.innerWidth;
            textCanvas.height = window.innerHeight;
            textCanvas.style.position = 'absolute';
            textCanvas.style.top = '0';
            textCanvas.style.left = '0';
            textCanvas.style.pointerEvents = 'none';
            document.body.appendChild(textCanvas);
            
            window.addEventListener('resize', () => {
                textCanvas.width = window.innerWidth;
                textCanvas.height = window.innerHeight;
            });
        }
        
        // Start animation
        Triangles.active = true;
        Triangles.animationId = requestAnimationFrame(render);
        console.log('Triangles initialization complete');
    }
    
    function setupTouchInteraction() {
        // Touch events for mobile interaction
        canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Mouse events for desktop interaction
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    
    function handleTouchStart(event) {
        if (event.touches.length === 1) {
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
            isDragging = true;
            lastDragTime = Date.now();
        }
    }
    
    function handleTouchMove(event) {
        if (!isDragging || event.touches.length !== 1) return;
        
        const currentX = event.touches[0].clientX;
        const currentY = event.touches[0].clientY;
        const deltaX = currentX - touchStartX;
        const deltaY = currentY - touchStartY;
        
        // Update camera offset based on touch movement
        targetCameraOffset.x += deltaX * 0.01;
        targetCameraOffset.y -= deltaY * 0.01;
        
        // Calculate drag velocity for momentum
        const now = Date.now();
        const dt = (now - lastDragTime) / 1000;
        if (dt > 0) {
            dragVelocity.x = deltaX * 0.01 / dt;
            dragVelocity.y = -deltaY * 0.01 / dt;
        }
        
        touchStartX = currentX;
        touchStartY = currentY;
        lastDragTime = now;
    }
    
    function handleTouchEnd() {
        isDragging = false;
    }
    
    function handleMouseDown(event) {
        touchStartX = event.clientX;
        touchStartY = event.clientY;
        isDragging = true;
        lastDragTime = Date.now();
    }
    
    function handleMouseMove(event) {
        if (!isDragging) return;
        
        const currentX = event.clientX;
        const currentY = event.clientY;
        const deltaX = currentX - touchStartX;
        const deltaY = currentY - touchStartY;
        
        // Update camera offset based on mouse movement
        targetCameraOffset.x += deltaX * 0.01;
        targetCameraOffset.y -= deltaY * 0.01;
        
        // Calculate drag velocity for momentum
        const now = Date.now();
        const dt = (now - lastDragTime) / 1000;
        if (dt > 0) {
            dragVelocity.x = deltaX * 0.01 / dt;
            dragVelocity.y = -deltaY * 0.01 / dt;
        }
        
        touchStartX = currentX;
        touchStartY = currentY;
        lastDragTime = now;
    }
    
    function handleMouseUp() {
        isDragging = false;
    }
    
    function render(now) {
        if (!Triangles.active) return;
        
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        const elapsedTime = now - startTime;
        then = now;
        
        // Update camera with momentum
        updateCamera(deltaTime);
        
        drawScene(gl, programInfo, triangles, deltaTime, elapsedTime);
        
        // Use lower frame rate on mobile devices for better performance
        if (isMobileDevice) {
            Triangles.animationId = setTimeout(() => {
                requestAnimationFrame(render);
            }, 1000 / 30); // Target 30fps for mobile
        } else {
            Triangles.animationId = requestAnimationFrame(render);
        }
    }
    
    function updateCamera(deltaTime) {
        // Apply momentum if not dragging
        if (!isDragging) {
            // Apply drag velocity with decay
            targetCameraOffset.x += dragVelocity.x * deltaTime;
            targetCameraOffset.y += dragVelocity.y * deltaTime;
            
            // Decay velocity
            const decay = Math.pow(0.1, deltaTime);
            dragVelocity.x *= decay;
            dragVelocity.y *= decay;
        }
        
        // Smooth camera movement
        cameraOffset.x += (targetCameraOffset.x - cameraOffset.x) * 0.1;
        cameraOffset.y += (targetCameraOffset.y - cameraOffset.y) * 0.1;
    }
    
    function stopAnimation() {
        console.log('Stopping Triangles animation...');
        Triangles.active = false;
        if (Triangles.animationId) {
            if (isMobileDevice) {
                clearTimeout(Triangles.animationId);
            } else {
                cancelAnimationFrame(Triangles.animationId);
            }
            Triangles.animationId = null;
        }
        
        // Remove event listeners
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }
    
    function clearMemory() {
        console.log('Clearing Triangles memory...');
        stopAnimation();
        
        // Reset camera and interaction variables
        touchStartX = 0;
        touchStartY = 0;
        isDragging = false;
        dragVelocity = { x: 0, y: 0 };
        cameraOffset = { x: 0, y: 0 };
        targetCameraOffset = { x: 0, y: 0 };
        
        // Remove text overlay if it exists
        const textOverlay = document.getElementById('text-overlay');
        if (textOverlay) {
            textOverlay.parentNode.removeChild(textOverlay);
        }
        
        // Clear WebGL resources
        if (gl) {
            // Clear all buffers
            const numAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
            for (let i = 0; i < numAttribs; i++) {
                gl.disableVertexAttribArray(i);
            }
            
            // Delete buffers
            if (triangles) {
                gl.deleteBuffer(triangles.position);
                gl.deleteBuffer(triangles.color);
            }
            
            // Delete shaders
            if (shaderProgram) {
                gl.deleteProgram(shaderProgram);
                shaderProgram = null;
            }
        }
        
        // Clean up arrays
        triangles = [];
        centroids = [];
    }
    
    // K-means clustering parameters
    const K = 4;
    const clusterColors = [
        [0.2, 0.9, 0.3, 0.8],  // Brighter Green
        [0.3, 0.5, 0.95, 0.8], // Brighter Blue
        [0.95, 0.4, 0.3, 0.8], // Brighter Red-orange
        [0.95, 0.85, 0.2, 0.8] // Brighter Gold/yellow
    ];
    
    // Initialize K-means centroids with better spacing
    function initCentroids() {
        centroids = [];
        
        // Calculate the screen bounds to position centroids outside
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zAvg = -15;
        const bounds = calculateScreenBoundaries(fieldOfView, aspect, zAvg);
        
        // Use current time to create a random but consistent starting state
        const initialTime = performance.now() * 0.001;
        
        // Position all centroids outside the visible screen
        // Use 1.2x the visible bounds to ensure they're off-screen
        const visibleXMax = bounds.visibleRight * 1.2;
        const visibleYMax = bounds.visibleTop * 1.2;
        
        // Position centroids at various positions to look like they're already moving
        // First centroid - moving in from the right
        centroids.push({
            x: visibleXMax * 0.7, // Already moved 30% of the way in
            y: Math.sin(initialTime) * 3,
            vx: -0.2 + Math.sin(initialTime * 0.5) * 0.1,
            vy: Math.cos(initialTime * 0.7) * 0.15,
            targetX: visibleXMax * 0.5,
            targetY: Math.sin(initialTime + 1) * 5
        });
        
        // Second centroid - coming from top, already partially entered
        centroids.push({
            x: Math.cos(initialTime * 0.8) * 6,
            y: visibleYMax * 0.6, // Already 40% into the screen
            vx: Math.sin(initialTime * 1.2) * 0.1,
            vy: -0.25,
            targetX: Math.cos(initialTime) * 4,
            targetY: visibleYMax * 0.3
        });
        
        // Third centroid - from left side, already moving
        centroids.push({
            x: -visibleXMax * 0.8, // Already 20% into screen
            y: Math.cos(initialTime * 0.6) * 4,
            vx: 0.2,
            vy: Math.sin(initialTime * 0.9) * 0.15,
            targetX: -visibleXMax * 0.5,
            targetY: Math.cos(initialTime + 2) * 4
        });
        
        // Fourth centroid - from bottom, moving with slight oscillation
        centroids.push({
            x: Math.sin(initialTime * 1.1) * 5,
            y: -visibleYMax * 0.7, // Already 30% into screen
            vx: Math.cos(initialTime * 0.7) * 0.1,
            vy: 0.18 + Math.sin(initialTime) * 0.05,
            targetX: Math.sin(initialTime + 3) * 3,
            targetY: -visibleYMax * 0.4
        });
    }
    
    // Calculate Euclidean distance
    function distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
    
    // Assign triangles to nearest centroid
    function assignClusters(triangles) {
        triangles.forEach(triangle => {
            let minDist = Infinity;
            let clusterIndex = 0;
            
            for (let i = 0; i < K; i++) {
                const dist = distance(
                    { x: triangle.position[0], y: triangle.position[1] },
                    centroids[i]
                );
                
                if (dist < minDist) {
                    minDist = dist;
                    clusterIndex = i;
                }
            }
            
            triangle.cluster = clusterIndex;
            triangle.baseColor = clusterColors[clusterIndex];
        });
    }
    
    // Update centroids with fluid motion
    function updateCentroids(triangles) {
        const clusterSums = Array(K).fill().map(() => ({ x: 0, y: 0, count: 0 }));
        
        triangles.forEach(triangle => {
            const cluster = triangle.cluster;
            clusterSums[cluster].x += triangle.position[0];
            clusterSums[cluster].y += triangle.position[1];
            clusterSums[cluster].count++;
        });
        
        // Calculate screen boundaries to keep track of visible area
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zAvg = -15;
        const bounds = calculateScreenBoundaries(fieldOfView, aspect, zAvg);
        
        // Calculate target positions for centroids
        for (let i = 0; i < K; i++) {
            // Define region angles for the four quadrants
            const regionAngle = (i / K) * Math.PI * 2;
            
            // Position regions at the edges of the screen and just beyond
            const screenEdgeX = bounds.visibleRight * 1.05; // Just beyond visible edge
            const screenEdgeY = bounds.visibleTop * 1.05;
            
            // Create edge-based region positions rather than central ones
            const regionPositions = [
                { x: screenEdgeX, y: 0 },             // Right edge
                { x: 0, y: screenEdgeY },             // Top edge
                { x: -screenEdgeX, y: 0 },            // Left edge
                { x: 0, y: -screenEdgeY }             // Bottom edge
            ];
            
            const regionX = regionPositions[i].x;
            const regionY = regionPositions[i].y;
            
            if (clusterSums[i].count > 0) {
                // Calculate average position of triangles in this cluster
                const avgX = clusterSums[i].x / clusterSums[i].count;
                const avgY = clusterSums[i].y / clusterSums[i].count;
                
                // Create a drift toward the current average but staying near the edge
                // Move more aggressively if off-screen, more gently when visible
                const isVisible = Math.abs(centroids[i].x) < screenEdgeX && Math.abs(centroids[i].y) < screenEdgeY;
                
                if (isVisible) {
                    // Once visible, follow the triangles with some constraints
                    const maxDistance = 6;  // Reduced to keep centroids closer to edges
                    const dx = avgX - regionX * 0.5; // Only go halfway toward center
                    const dy = avgY - regionY * 0.5;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist > maxDistance) {
                        // Limit movement
                        const scale = maxDistance / dist;
                        centroids[i].targetX = regionX * 0.5 + dx * scale;
                        centroids[i].targetY = regionY * 0.5 + dy * scale;
                    } else {
                        centroids[i].targetX = avgX;
                        centroids[i].targetY = avgY;
                    }
                } else {
                    // If off-screen, move more directly toward visible area
                    centroids[i].targetX = regionX * 0.8; // Move 80% of the way to edge
                    centroids[i].targetY = regionY * 0.8;
                }
            } else {
                // For empty clusters, gradually move toward the edge
                centroids[i].targetX = regionX * 0.9; // Stay at 90% of the edge position
                centroids[i].targetY = regionY * 0.9;
            }
        }
        
        // Add more scene awareness to centroids
        const time = performance.now() * 0.0002;
        
        // Apply global scene rhythm to centroids
        for (let i = 0; i < K; i++) {
            // Add a subtle global scene influence to centroid targets
            const scenePhase = time + (i / K) * Math.PI * 2;
            const sceneInfluence = 2.0; // Global scene influence strength
            
            // Add scene influence to target positions
            if (i !== 0) { // Leave central centroid more stable
                centroids[i].targetX += Math.sin(scenePhase) * sceneInfluence * 0.5;
                centroids[i].targetY += Math.cos(scenePhase * 1.3) * sceneInfluence * 0.4;
            }
        }
        
        // Apply fluid physics to centroid movement
        const deltaTime = 1/60;
        for (let i = 0; i < K; i++) {
            // Calculate force towards target (spring-like behavior)
            const dx = centroids[i].targetX - centroids[i].x;
            const dy = centroids[i].targetY - centroids[i].y;
            
            // Add acceleration towards target
            const springFactor = 0.15;
            centroids[i].vx += dx * springFactor * deltaTime;
            centroids[i].vy += dy * springFactor * deltaTime;
            
            // Add more damping to prevent excessive movement
            const damping = 0.94; // Increased damping for smoother motion (was 0.92)
            centroids[i].vx *= damping;
            centroids[i].vy *= damping;
            
            // Update position
            centroids[i].x += centroids[i].vx;
            centroids[i].y += centroids[i].vy;
        }
    }
    
    // Calculate visible screen boundaries and setup container
    function calculateScreenBoundaries(fieldOfView, aspect, zAvg) {
        // Calculate the visible bounds (screen edges in world coordinates)
        const yMax = Math.tan(fieldOfView / 2) * Math.abs(zAvg);
        const xMax = yMax * aspect;
        
        // Make container only slightly larger than visible screen (5% margin)
        const margin = 0.05; // 5% margin beyond screen edges
        
        return {
            left: -xMax * (1 + margin),
            right: xMax * (1 + margin),
            top: yMax * (1 + margin),
            bottom: -yMax * (1 + margin),
            centerX: 0,
            centerY: 0,
            width: xMax * 2 * (1 + margin),
            height: yMax * 2 * (1 + margin),
            visibleLeft: -xMax,
            visibleRight: xMax,
            visibleTop: yMax,
            visibleBottom: -yMax
        };
    }

    // Calculate screen bounds for a triangle
    function calculateTriangleScreenBounds(position, size, angle, projectionMatrix, aspect) {
        // Calculate the three points of the triangle in model space
        const p1 = [0, size, 0];
        const p2 = [-size, -size, 0];
        const p3 = [size, -size, 0];
        
        // Apply rotation
        function rotatePoint(p, angle) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return [
                p[0] * cos - p[1] * sin,
                p[0] * sin + p[1] * cos,
                p[2]
            ];
        }
        
        const rp1 = rotatePoint(p1, angle);
        const rp2 = rotatePoint(p2, angle);
        const rp3 = rotatePoint(p3, angle);
        
        // Translate to world space
        const tp1 = [rp1[0] + position[0], rp1[1] + position[1], rp1[2] + position[2]];
        const tp2 = [rp2[0] + position[0], rp2[1] + position[1], rp2[2] + position[2]];
        const tp3 = [rp3[0] + position[0], rp3[1] + position[1], rp3[2] + position[2]];
        
        // Project to clip space
        function projectPoint(p, projMatrix) {
            // Create vector
            const vec = vec4.fromValues(p[0], p[1], p[2], 1.0);
            
            // Apply projection matrix
            vec4.transformMat4(vec, vec, projMatrix);
            
            // Perspective division
            if (vec[3] !== 0) {
                vec[0] /= vec[3];
                vec[1] /= vec[3];
                vec[2] /= vec[3];
            }
            
            return [vec[0], vec[1], vec[2]];
        }
        
        const pp1 = projectPoint(tp1, projectionMatrix);
        const pp2 = projectPoint(tp2, projectionMatrix);
        const pp3 = projectPoint(tp3, projectionMatrix);
        
        // Find min/max bounds in clip space
        const minX = Math.min(pp1[0], pp2[0], pp3[0]);
        const maxX = Math.max(pp1[0], pp2[0], pp3[0]);
        const minY = Math.min(pp1[1], pp2[1], pp3[1]);
        const maxY = Math.max(pp1[1], pp2[1], pp3[1]);
        
        return {
            minX, maxX, minY, maxY,
            vertices: [pp1, pp2, pp3]
        };
    }

    // Use a more strategic distribution across the scene with perfect spacing
    function initBuffers(gl, count = 150) {
        const triangles = [];
        
        // Calculate initial screen boundaries for proper distribution
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zAvg = -15; // Average z position of triangles
        const bounds = calculateScreenBoundaries(fieldOfView, aspect, zAvg);
        
        // Create an evenly distributed grid for triangle placement
        // First calculate how many triangles to place per row/column
        const ratio = aspect > 1 ? aspect : 1 / aspect;
        const columnsCount = Math.ceil(Math.sqrt(count * ratio));
        const rowsCount = Math.ceil(count / columnsCount);
        
        // Calculate spacing
        const xSpacing = bounds.width / (columnsCount + 1);
        const ySpacing = bounds.height / (rowsCount + 1);
        
        // Size triangles based on spacing to avoid overlap - made larger
        const baseSize = Math.min(xSpacing, ySpacing) * 0.3; // Increased from 0.2 to 0.3 (50% larger)
        
        // Place triangles in a grid with slight variation
        let count = 0;
        for (let row = 1; row <= rowsCount && count < count; row++) {
            for (let col = 1; col <= columnsCount && count < count; col++) {
                // Calculate base position in grid
                const x = bounds.left + xSpacing * col;
                const y = bounds.bottom + ySpacing * row;
                
                // Add slight random variation to avoid perfect grid appearance
                // Reduced jitter slightly to prevent overlap with larger triangles
                const jitterAmount = Math.min(xSpacing, ySpacing) * 0.12; // Reduced from 0.15
                const xJitter = (Math.random() - 0.5) * jitterAmount;
                const yJitter = (Math.random() - 0.5) * jitterAmount;
                
                // Vary z-depth slightly for visual interest
                const z = -15 - (Math.random() * 5);
                
                // Vary triangle size slightly within a reasonable range
                const size = baseSize * (0.85 + Math.random() * 0.3); // Adjusted variation range
                
                // Very slow rotation speed
                const rotationSpeed = (Math.random() - 0.5) * 0.3;
                
                // Pre-rotate triangles to different angles (makes it look like it's already running)
                const initialAngle = Math.random() * Math.PI * 2;
                
                triangles.push({
                    position: [
                        x + xJitter + (Math.random() - 0.5) * 1.5, 
                        y + yJitter + (Math.random() - 0.5) * 1.5, 
                        z + (Math.random() - 0.5) * 2
                    ],
                    velocity: [
                        ((Math.random() - 0.5) * 0.1) + 0.02 * Math.sin(initialAngle), 
                        ((Math.random() - 0.5) * 0.1) + 0.02 * Math.cos(initialAngle), 
                        (Math.random() - 0.5) * 0.03
                    ],
                    size: size,
                    color: [0.5, 0.5, 0.5, 1.0],
                    baseColor: [0.5, 0.5, 0.5, 1.0],
                    angle: initialAngle,
                    rotationSpeed: rotationSpeed,
                    initialSize: size,
                    cluster: 0,
                    vertices: [
                        {x: 0, y: 0, z: 0},
                        {x: 0, y: 0, z: 0},
                        {x: 0, y: 0, z: 0}
                    ],
                    offset: Math.random() * Math.PI * 2,
                    flowSpeed: 0.05 + Math.random() * 0.08,
                    neighbors: [],
                    neighborInfluence: 0.5 + Math.random() * 0.5,
                    sceneInteraction: 0.05 + Math.random() * 0.1,
                    row: row,
                    col: col
                });
                
                count++;
            }
        }
        
        return triangles;
    }

    // Enhanced triangle boundary checking for tighter container
    function ensureTriangleInBounds(triangle, projectionMatrix, aspect, bounds) {
        // Calculate safe bounds in normalized device coordinates (-1 to 1)
        const safeMargin = 0.0; // No safety margin inside container edges - allow triangles to reach the edge
        const minX = -1 + safeMargin;
        const maxX = 1 - safeMargin;
        const minY = -1 + safeMargin;
        const maxY = 1 - safeMargin;
        
        // Calculate screen position of triangle
        const screenBounds = calculateTriangleScreenBounds(
            triangle.position,
            triangle.size,
            triangle.angle,
            projectionMatrix,
            aspect
        );
        
        // Store the computed vertices
        triangle.screenVertices = screenBounds.vertices;
        
        // Check if any part of the triangle is outside the safe bounds
        if (screenBounds.maxX < minX || screenBounds.minX > maxX || screenBounds.maxY < minY || screenBounds.minY > maxY) {
            // Triangle is completely outside - move it back into view
            const centerX = (screenBounds.minX + screenBounds.maxX) / 2;
            const centerY = (screenBounds.minY + screenBounds.maxY) / 2;
            
            // Calculate direction to bring triangle back into view
            const dirX = centerX > 0 ? -1 : 1;
            const dirY = centerY > 0 ? -1 : 1;
            
            // Move triangle and reverse velocity with stronger correction
            triangle.position[0] += dirX * 0.7; // Increased from 0.5 for faster correction
            triangle.position[1] += dirY * 0.7;
            triangle.velocity[0] = dirX * Math.abs(triangle.velocity[0]) * 0.7;
            triangle.velocity[1] = dirY * Math.abs(triangle.velocity[1]) * 0.7;
            
            return true;
        } else if (screenBounds.minX < minX || screenBounds.maxX > maxX || screenBounds.minY < minY || screenBounds.maxY > maxY) {
            // Triangle is partially outside - nudge it inward more aggressively
            let correctionX = 0;
            let correctionY = 0;
            
            if (screenBounds.minX < minX) {
                correctionX = minX - screenBounds.minX;
            } else if (screenBounds.maxX > maxX) {
                correctionX = maxX - screenBounds.maxX;
            }
            
            if (screenBounds.minY < minY) {
                correctionY = minY - screenBounds.minY;
            } else if (screenBounds.maxY > maxY) {
                correctionY = maxY - screenBounds.maxY;
            }
            
            // Apply stronger correction and bounce velocity
            triangle.position[0] += correctionX * 0.5; // Increased from 0.3
            triangle.position[1] += correctionY * 0.5;
            
            if (correctionX !== 0) {
                triangle.velocity[0] = -triangle.velocity[0] * 0.7;
            }
            
            if (correctionY !== 0) {
                triangle.velocity[1] = -triangle.velocity[1] * 0.7;
            }
            
            return true;
        }
        
        return false;
    }
    
    // Find triangle neighbors for interaction
    function updateTriangleNeighbors(triangles) {
        // Only update periodically for performance
        const NEIGHBOR_UPDATE_INTERVAL = 30; // frames
        
        if (Math.floor(performance.now() / 16) % NEIGHBOR_UPDATE_INTERVAL !== 0) {
            return;
        }
        
        // Reset all neighbor lists
        triangles.forEach(triangle => {
            triangle.neighbors = [];
        });
        
        // Find closest neighbors for each triangle (limited to 3 neighbors)
        triangles.forEach((triangle, i) => {
            const distances = [];
            
            // Calculate distances to other triangles
            triangles.forEach((other, j) => {
                if (i !== j) {
                    const dx = triangle.position[0] - other.position[0];
                    const dy = triangle.position[1] - other.position[1];
                    const dz = triangle.position[2] - other.position[2];
                    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    
                    distances.push({ index: j, distance: distance });
                }
            });
            
            // Sort by distance and keep closest 3
            distances.sort((a, b) => a.distance - b.distance);
            triangle.neighbors = distances.slice(0, 3).map(d => d.index);
        });
    }
    
    // Draw the scene with simpler, more active movement
    function drawScene(gl, programInfo, triangles, deltaTime, elapsedTime) {
        gl.clearColor(0.04, 0.09, 0.18, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Create perspective matrix
        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        
        // Calculate container bounds - only slightly larger than screen
        const zAvg = -15;
        const bounds = calculateScreenBoundaries(fieldOfView, aspect, zAvg);
        
        // Run k-means clustering immediately on first frame and then periodically
        // This ensures clusters are assigned right away when starting
        if (elapsedTime < 0.1 || Math.floor(elapsedTime * 60) % 5 === 0) {
            assignClusters(triangles);
            updateCentroids(triangles);
        }
        
        // Update triangle neighbors periodically for interactions
        updateTriangleNeighbors(triangles);
        
        // Create global scene variables for coordinated movement
        const sceneTime = elapsedTime * 0.1;
        const scenePhase = Math.sin(sceneTime) * 0.5 + 0.5;
        const scenePulse = Math.sin(sceneTime * 0.25) * 0.5 + 0.5;
        
        triangles.forEach((triangle, index) => {
            // Update rotation - extremely gentle rotation
            triangle.angle += triangle.rotationSpeed * deltaTime * 0.05;
            
            // Base flow with scene influence
            const time = elapsedTime * triangle.flowSpeed;
            const sceneInfluence = triangle.sceneInteraction * scenePulse;
            
            // Flow influenced by global scene rhythm
            const flowX = (Math.sin(time + triangle.offset) * 0.002) * (1 + sceneInfluence);
            const flowY = (Math.cos(time * 1.2 + triangle.offset) * 0.0015) * (1 + sceneInfluence);
            
            // Add flow to velocity with scene awareness
            triangle.velocity[0] += flowX;
            triangle.velocity[1] += flowY;
            triangle.velocity[2] += (Math.random() - 0.5) * 0.002;
            
            // Neighbor influence - subtle alignment with neighbors
            if (triangle.neighbors.length > 0) {
                let avgVelX = 0, avgVelY = 0;
                
                // Get average velocity of neighbors
                triangle.neighbors.forEach(neighborIdx => {
                    const neighbor = triangles[neighborIdx];
                    avgVelX += neighbor.velocity[0];
                    avgVelY += neighbor.velocity[1];
                });
                
                avgVelX /= triangle.neighbors.length;
                avgVelY /= triangle.neighbors.length;
                
                // Apply subtle influence from neighbors
                const neighborStrength = 0.001 * triangle.neighborInfluence;
                triangle.velocity[0] += (avgVelX - triangle.velocity[0]) * neighborStrength;
                triangle.velocity[1] += (avgVelY - triangle.velocity[1]) * neighborStrength;
            }
            
            // Distance from center and borders for better scene participation
            const distFromCenter = Math.sqrt(
                triangle.position[0] * triangle.position[0] + 
                triangle.position[1] * triangle.position[1]
            );
            
            // Edge awareness - triangles react to proximity to scene borders with tighter bounds
            const distFromLeftEdge = Math.abs(triangle.position[0] - bounds.left);
            const distFromRightEdge = Math.abs(triangle.position[0] - bounds.right); 
            const distFromTopEdge = Math.abs(triangle.position[1] - bounds.top);
            const distFromBottomEdge = Math.abs(triangle.position[1] - bounds.bottom);
            
            // Find closest edge - use tighter container
            const minEdgeDist = Math.min(distFromLeftEdge, distFromRightEdge, 
                                         distFromTopEdge, distFromBottomEdge);
            
            // Apply stronger border interaction force for tighter containment
            if (minEdgeDist < 1.5) { // Reduced to allow triangles to get closer to edges
                const borderForce = 0.002 * (1 - minEdgeDist/2); // Stronger force (was 0.001)
                
                // Push away from closest edge
                if (minEdgeDist === distFromLeftEdge) {
                    triangle.velocity[0] += borderForce;
                } else if (minEdgeDist === distFromRightEdge) {
                    triangle.velocity[0] -= borderForce;
                } else if (minEdgeDist === distFromTopEdge) {
                    triangle.velocity[1] -= borderForce;
                } else if (minEdgeDist === distFromBottomEdge) {
                    triangle.velocity[1] += borderForce;
                }
            }
            
            // Extremely gentle attraction force with scene awareness
            const centerAttraction = 0.002 * (1 + scenePulse * 0.2); // Reduced attraction to allow triangles to reach edges
            const outerRadius = 13.5; // Increased to allow triangles to spread further outward
            
            if (distFromCenter > outerRadius) {
                const angle = Math.atan2(triangle.position[1], triangle.position[0]);
                // Stronger attraction for tighter container
                const attractionStrength = centerAttraction * ((distFromCenter - outerRadius) / 10); // Reduced divisor for stronger force
                triangle.velocity[0] -= Math.cos(angle) * attractionStrength;
                triangle.velocity[1] -= Math.sin(angle) * attractionStrength;
            }
            
            // Apply velocity - extremely slow movement with scene awareness
            const moveScale = 0.2 * (1 + scenePhase * 0.1);
            triangle.position[0] += triangle.velocity[0] * deltaTime * moveScale;
            triangle.position[1] += triangle.velocity[1] * deltaTime * moveScale;
            triangle.position[2] += triangle.velocity[2] * deltaTime * moveScale;
            
            // Apply extremely gentle damping for very long-lasting, slow flow
            const damping = 0.998;
            triangle.velocity[0] *= damping;
            triangle.velocity[1] *= damping;
            triangle.velocity[2] *= damping;
            
            // Size variations - extremely subtle and slow, with scene awareness
            const sizePulse = Math.sin(elapsedTime * 0.05 + triangle.offset);
            const sceneSizeInfluence = scenePulse * 0.03 * triangle.sceneInteraction;
            triangle.size = triangle.initialSize * (0.98 + sizePulse * 0.04 + sceneSizeInfluence);
            
            // Z-axis boundaries - keep triangles in a tighter z-range
            const zMin = -20; // Reduced from -26 for tighter container
            const zMax = -9; // Brought slightly closer to camera for better visibility with larger triangles
            if (triangle.position[2] < zMin || triangle.position[2] > zMax) {
                triangle.velocity[2] *= -0.7;
                triangle.position[2] = Math.max(zMin, Math.min(zMax, triangle.position[2]));
            }
            
            // Ensure triangle is in screen bounds in projected space
            ensureTriangleInBounds(triangle, projectionMatrix, aspect, bounds);
            
            // Draw triangle
            const modelViewMatrix = mat4.create();
            mat4.translate(modelViewMatrix, modelViewMatrix, triangle.position);
            mat4.rotateZ(modelViewMatrix, modelViewMatrix, triangle.angle);
            
            // Set up positions
            const positions = [
                0, triangle.size, 0,
                -triangle.size, -triangle.size, 0,
                triangle.size, -triangle.size, 0
            ];
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                3, gl.FLOAT, false, 0, 0
            );
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
            
            // Set up color
            const baseColor = triangle.baseColor;
            const colors = [
                baseColor[0], baseColor[1], baseColor[2], 1.0,
                baseColor[0], baseColor[1], baseColor[2], 1.0,
                baseColor[0], baseColor[1], baseColor[2], 1.0
            ];
            const colorBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColor,
                4, gl.FLOAT, false, 0, 0
            );
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
            
            // Use shader
            gl.useProgram(programInfo.program);
            gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            
            // Draw
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        });
        
        // Draw centroids
        for (let i = 0; i < K; i++) {
            // Keep centroids within container bounds
            centroids[i].x = Math.max(bounds.left + 1, Math.min(bounds.right - 1, centroids[i].x));
            centroids[i].y = Math.max(bounds.bottom + 1, Math.min(bounds.top - 1, centroids[i].y));
            
            drawCentroid(gl, programInfo, projectionMatrix, centroids[i], clusterColors[i]);
        }
        
        // Draw container bounds - visualize the tight container
        if (window.drawDebug) {
            drawContainerBounds(gl, programInfo, projectionMatrix, bounds);
        }
        
        // Draw text overlay
        const textCanvas = document.getElementById('text-overlay');
        if (textCanvas) {
            const ctx = textCanvas.getContext('2d');
            ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
            
            const rightEdge = textCanvas.width - 20;
            const bottomEdge = textCanvas.height - 20;
            
            ctx.font = '14px Arial';
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText('K-Means Clustering Visualization', rightEdge, bottomEdge - 30);
            
            ctx.font = '12px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText('Move cursor to interact', rightEdge, bottomEdge - 10);
        }
    }

    // Optional: Draw debug container bounds
    function drawContainerBounds(gl, programInfo, projectionMatrix, bounds) {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -15]);
        
        // Container corners
        const vertices = [
            // Left edge
            bounds.left, bounds.bottom, 0,
            bounds.left, bounds.top, 0,
            
            // Top edge
            bounds.left, bounds.top, 0,
            bounds.right, bounds.top, 0,
            
            // Right edge
            bounds.right, bounds.top, 0,
            bounds.right, bounds.bottom, 0,
            
            // Bottom edge
            bounds.right, bounds.bottom, 0,
            bounds.left, bounds.bottom, 0
        ];
        
        // White color
        const colors = new Array(vertices.length / 3 * 4).fill(0);
        for (let i = 0; i < colors.length; i += 4) {
            colors[i] = 1.0;     // R
            colors[i + 1] = 1.0; // G
            colors[i + 2] = 1.0; // B
            colors[i + 3] = 0.1; // A - very transparent
        }
        
        // Create position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            3, gl.FLOAT, false, 0, 0
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        
        // Create color buffer
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            4, gl.FLOAT, false, 0, 0
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
        
        // Use shader
        gl.useProgram(programInfo.program);
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        
        // Draw container bounds as lines
        gl.drawArrays(gl.LINES, 0, vertices.length / 3);
    }

    // Function to draw a biologically inspired centroid marker
    function drawCentroid(gl, programInfo, projectionMatrix, centroid, color) {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [centroid.x, centroid.y, -12]);
        
        // Parameters for the cell-like appearance
        const outerSize = 0.4; // Slightly larger to be visible when coming from offscreen
        const innerSize = 0.16; // Slightly larger inner nucleus
        const segments = 24; // Fewer segments for efficiency
        const vertices = [];
        const colors = [];
        
        // Draw the outer membrane
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * outerSize;
            const y = Math.sin(angle) * outerSize;
            
            vertices.push(x, y, 0);
            colors.push(color[0], color[1], color[2], 0.25); // More transparent
        }
        
        // Draw the nucleus
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * innerSize;
            const y = Math.sin(angle) * innerSize;
            
            vertices.push(x, y, 0);
            colors.push(color[0], color[1], color[2], 0.6); // More transparent
        }
        
        // Create position buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            3,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            4,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
        
        gl.useProgram(programInfo.program);
        
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix
        );
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );
        
        // Draw the outer membrane
        gl.drawArrays(gl.LINE_LOOP, 0, segments + 1);
        
        // Draw the nucleus
        gl.drawArrays(gl.TRIANGLE_FAN, segments + 1, segments + 1);
    }

    // Add debug toggle on keypress
    window.drawDebug = false;
    window.addEventListener('keydown', (e) => {
        if (e.key === 'd') {
            window.drawDebug = !window.drawDebug;
        }
    });
})(); 