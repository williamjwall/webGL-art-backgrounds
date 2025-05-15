// WebGL Triangles Animation with K-Means Clustering
(function() {
    const canvas = document.getElementById('triangles-canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
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
    
    // Initialize a shader program
    function initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        
        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        
        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        
        return shaderProgram;
    }
    
    // Creates a shader of the given type, uploads the source and compiles it
    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        
        // Send the source to the shader object
        gl.shaderSource(shader, source);
        
        // Compile the shader program
        gl.compileShader(shader);
        
        // See if it compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    // Initialize shader program
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    
    // Collect all the info needed to use the shader program
    const programInfo = {
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
    
    // K-means clustering parameters
    const K = 4;
    let centroids = [];
    const clusterColors = [
        [0.2, 0.9, 0.3, 0.8],  // Brighter Green
        [0.3, 0.5, 0.95, 0.8], // Brighter Blue
        [0.95, 0.4, 0.3, 0.8], // Brighter Red-orange
        [0.95, 0.85, 0.2, 0.8] // Brighter Gold/yellow
    ];
    
    // Initialize K-means centroids with better spacing
    function initCentroids() {
        centroids = [];
        
        // Position centroids in a more distributed pattern
        // First centroid at center
        centroids.push({
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            targetX: 0,
            targetY: 0
        });
        
        // Position other centroids in different quadrants
        const radius = 10; // Distance from center for other centroids
        
        // Second centroid - upper right
        centroids.push({
            x: radius,
            y: radius,
            vx: 0,
            vy: 0,
            targetX: radius,
            targetY: radius
        });
        
        // Third centroid - lower right
        centroids.push({
            x: radius,
            y: -radius,
            vx: 0,
            vy: 0,
            targetX: radius,
            targetY: -radius
        });
        
        // Fourth centroid - lower left
        centroids.push({
            x: -radius,
            y: -radius,
            vx: 0,
            vy: 0,
            targetX: -radius,
            targetY: -radius
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
        
        // Calculate target positions for centroids
        for (let i = 0; i < K; i++) {
            // Force centroids to stay in different regions of the screen
            const regionAngle = (i / K) * Math.PI * 2;
            const regionX = Math.cos(regionAngle) * 8; // Base position in region
            const regionY = Math.sin(regionAngle) * 8;
            
            if (i === 0) {
                // First centroid stays near center with gentle flowing motion
                const time = performance.now() * 0.0005;
                centroids[0].targetX = Math.sin(time * 0.2) * 3;
                centroids[0].targetY = Math.cos(time * 0.3) * 3;
            } else if (clusterSums[i].count > 0) {
                // Calculate average position
                const avgX = clusterSums[i].x / clusterSums[i].count;
                const avgY = clusterSums[i].y / clusterSums[i].count;
                
                // Limit how far the centroid can move from its home region
                const maxDistance = 10;
                const dx = avgX - regionX;
                const dy = avgY - regionY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > maxDistance) {
                    // Limit the centroid movement to stay somewhat in its region
                    const scale = maxDistance / dist;
                    centroids[i].targetX = regionX + dx * scale;
                    centroids[i].targetY = regionY + dy * scale;
                } else {
                    centroids[i].targetX = avgX;
                    centroids[i].targetY = avgY;
                }
            } else {
                // For empty clusters, move toward the region base position
                centroids[i].targetX = regionX + (Math.random() * 2 - 1) * 3;
                centroids[i].targetY = regionY + (Math.random() * 2 - 1) * 3;
            }
        }
        
        // Apply fluid physics to centroid movement
        const deltaTime = 1/60; // Assuming ~60fps
        for (let i = 0; i < K; i++) {
            // Calculate force towards target (spring-like behavior)
            const dx = centroids[i].targetX - centroids[i].x;
            const dy = centroids[i].targetY - centroids[i].y;
            
            // Add acceleration towards target - reduced spring factor for slower movement
            const springFactor = 0.2; // Was 0.8, reduced for slower movement
            centroids[i].vx += dx * springFactor * deltaTime;
            centroids[i].vy += dy * springFactor * deltaTime;
            
            // Add some flowing motion - reduced flow factor
            const flowTime = performance.now() * 0.0002; // Was 0.0005, reduced for slower flow
            const flowFactor = 0.03; // Was 0.1, reduced for gentler flowing motion
            centroids[i].vx += Math.sin(flowTime + i * 1.5) * flowFactor * deltaTime;
            centroids[i].vy += Math.cos(flowTime + i * 1.5) * flowFactor * deltaTime;
            
            // Apply velocity to position with a scaling factor to slow down movement
            const velocityScale = 0.5; // New parameter to directly scale down movement speed
            centroids[i].x += centroids[i].vx * velocityScale;
            centroids[i].y += centroids[i].vy * velocityScale;
            
            // Apply damping for smooth deceleration - increased slightly for more stability
            const damping = 0.97; // Was 0.95, increased slightly
            centroids[i].vx *= damping;
            centroids[i].vy *= damping;
        }
    }
    
    // Create triangles with a simpler approach
    function initBuffers(gl) {
        const numTriangles = 120;
        const triangles = [];
        
        for (let i = 0; i < numTriangles; i++) {
            // Simple random distribution
            const x = (Math.random() * 2 - 1) * 15;
            const y = (Math.random() * 2 - 1) * 15;
            const z = -15 - (Math.random() * 10);
            const size = 0.3 + Math.random() * 0.4;
            
            // Random rotation and velocity
            const rotationSpeed = (Math.random() - 0.5) * 3; // Increased rotation
            
            triangles.push({
                position: [x, y, z],
                velocity: [(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.2], // Faster initial velocity
                size: size,
                color: [0.5, 0.5, 0.5, 1.0],
                baseColor: [0.5, 0.5, 0.5, 1.0],
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: rotationSpeed,
                initialSize: size,
                cluster: 0
            });
        }
        
        return triangles;
    }
    
    // Function to draw a biologically inspired centroid marker
    function drawCentroid(gl, programInfo, projectionMatrix, centroid, color) {
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [centroid.x, centroid.y, -12]);
        
        // Parameters for the cell-like appearance
        const outerSize = 0.7; // Membrane size
        const innerSize = 0.3; // Nucleus size
        const segments = 32; // More segments for a smoother circle
        const vertices = [];
        const colors = [];
        
        // Draw the outer membrane
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * outerSize;
            const y = Math.sin(angle) * outerSize;
            
            vertices.push(x, y, 0);
            colors.push(color[0], color[1], color[2], 0.4); // More transparent for membrane
        }
        
        // Draw the nucleus
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * innerSize;
            const y = Math.sin(angle) * innerSize;
            
            vertices.push(x, y, 0);
            colors.push(color[0], color[1], color[2], 0.8); // Less transparent for nucleus
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
        
        // Run k-means clustering
        if (Math.floor(elapsedTime * 60) % 5 === 0) {
            assignClusters(triangles);
            updateCentroids(triangles);
        }
        
        triangles.forEach((triangle, index) => {
            // Update rotation - faster rotation
            triangle.angle += triangle.rotationSpeed * deltaTime * 0.5;
            
            // Add random movement - keeping the existing behavior but with better containment
            const randomForce = 0.08;
            triangle.velocity[0] += (Math.random() - 0.5) * randomForce;
            triangle.velocity[1] += (Math.random() - 0.5) * randomForce;
            triangle.velocity[2] += (Math.random() - 0.5) * randomForce * 0.3;
            
            // Calculate distance from center
            const distFromCenter = Math.sqrt(
                triangle.position[0] * triangle.position[0] + 
                triangle.position[1] * triangle.position[1]
            );
            
            // Add gentle attraction force toward center when triangles are far from center
            const centerAttraction = 0.02;
            const outerRadius = 20; // When to start applying force
            
            if (distFromCenter > outerRadius) {
                const angle = Math.atan2(triangle.position[1], triangle.position[0]);
                // Force increases with distance from center
                const attractionStrength = centerAttraction * ((distFromCenter - outerRadius) / 10);
                triangle.velocity[0] -= Math.cos(angle) * attractionStrength;
                triangle.velocity[1] -= Math.sin(angle) * attractionStrength;
            }
            
            // Apply velocity - faster movement
            triangle.position[0] += triangle.velocity[0] * deltaTime;
            triangle.position[1] += triangle.velocity[1] * deltaTime;
            triangle.position[2] += triangle.velocity[2] * deltaTime;
            
            // Less damping for more momentum
            const damping = 0.98;
            triangle.velocity[0] *= damping;
            triangle.velocity[1] *= damping;
            triangle.velocity[2] *= damping;
            
            // More effective boundary handling - stronger bounce
            const bounds = 24; // Slightly reduced bounds
            for (let i = 0; i < 2; i++) { // Just handle x and y
                if (Math.abs(triangle.position[i]) > bounds) {
                    // Stronger bounce with position correction
                    triangle.velocity[i] *= -0.9;
                    // Push back into bounds more aggressively
                    triangle.position[i] = Math.sign(triangle.position[i]) * bounds * 0.95;
                }
            }
            
            // Z-axis boundaries - keep triangles visible
            const zMin = -28;
            const zMax = -7;
            if (triangle.position[2] > zMax || triangle.position[2] < zMin) {
                triangle.velocity[2] *= -0.9;
                triangle.position[2] = Math.max(zMin, Math.min(zMax, triangle.position[2]));
            }
            
            // Size variations
            triangle.size = triangle.initialSize * (0.8 + Math.sin(elapsedTime * 0.5) * 0.3);
            
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
            drawCentroid(gl, programInfo, projectionMatrix, centroids[i], clusterColors[i]);
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
    
    // Animation variables
    let then = 0;
    let startTime = Date.now() * 0.001;
    
    // Initialize triangles and centroids
    initCentroids();
    const triangles = initBuffers(gl);
    assignClusters(triangles); // Initial cluster assignment
    
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
    
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        const elapsedTime = now - startTime;
        then = now;
        
        drawScene(gl, programInfo, triangles, deltaTime, elapsedTime);
        
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
})(); 