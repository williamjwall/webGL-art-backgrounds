(function() {
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas to cover the entire window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    // Call resize on load and when window is resized
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    const nodes = [];
    const edges = [];
    const numNodes = 150; // More nodes for better coverage
    const maxDistance = 150;
    
    // Track mouse position for click events only
    let mousePosition = {
        x: undefined,
        y: undefined
    };
    
    // Listen for mouse movement
    canvas.addEventListener('mousemove', (event) => {
        mousePosition.x = event.x;
        mousePosition.y = event.y;
    });
    
    // Add nodes on click - create a burst effect
    canvas.addEventListener('click', () => {
        // Create a burst of nodes
        const burstSize = 12;
        const clickX = mousePosition.x;
        const clickY = mousePosition.y;
        
        for (let i = 0; i < burstSize; i++) {
            const angle = (i / burstSize) * Math.PI * 2;
            const distance = 5 + Math.random() * 10;
            const node = createNode();
            
            // Position nodes in a circle
            node.x = clickX + Math.cos(angle) * distance;
            node.y = clickY + Math.sin(angle) * distance;
            
            // Give them velocity away from click point
            const speed = 0.5 + Math.random() * 1;
            node.vx = Math.cos(angle) * speed;
            node.vy = Math.sin(angle) * speed;
            
            // Make them slightly larger
            node.radius = 2 + Math.random() * 2;
            
            nodes.push(node);
        }
    });
    
    function init() {
        nodes.length = 0;
        edges.length = 0;
        
        for (let i = 0; i < numNodes; i++) {
            nodes.push(createNode());
        }
    }
    
    function createNode() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: 1.5 + Math.random() * 1.5,
            age: 0,
            lifespan: Infinity // Regular nodes live forever
        };
    }
    
    function update() {
        // Get flow direction - slowly changing over time
        const time = Date.now() * 0.0001;
        const flowAngleX = Math.sin(time * 0.3) * 0.01; 
        const flowAngleY = Math.cos(time * 0.2) * 0.01;
        
        nodes.forEach(node => {
            // Age nodes
            node.age++;
            
            // Update position
            node.x += node.vx;
            node.y += node.vy;
            
            // Apply gentle flow field effect
            node.vx += flowAngleX;
            node.vy += flowAngleY;
            
            // Wrap around edges
            if (node.x < -50) node.x = canvas.width + 50;
            if (node.x > canvas.width + 50) node.x = -50;
            if (node.y < -50) node.y = canvas.height + 50;
            if (node.y > canvas.height + 50) node.y = -50;
            
            // Add slight friction - less friction = more fluid movement
            node.vx *= 0.99;
            node.vy *= 0.99;
            
            // Add slight random movement
            node.vx += (Math.random() - 0.5) * 0.01;
            node.vy += (Math.random() - 0.5) * 0.01;
        });
        
        // Clear temporary edges and recalculate
        edges.length = 0;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDistance) {
                    edges.push({ from: nodes[i], to: nodes[j], dist });
                }
            }
        }
        
        // Limit total nodes for performance
        if (nodes.length > 250) {
            nodes.splice(0, nodes.length - 250);
        }
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Very subtle background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#111111');
        gradient.addColorStop(1, '#121220');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw proximity edges
        edges.forEach(edge => {
            const opacity = 0.15 * (1 - edge.dist / maxDistance);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(edge.from.x, edge.from.y);
            ctx.lineTo(edge.to.x, edge.to.y);
            ctx.stroke();
        });
        
        // Draw nodes
        nodes.forEach(node => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    function animate() {
        update();
        draw();
        requestAnimationFrame(animate);
    }
    
    // Initialize and start animation
    init();
    animate();
    
    // Reinitialize when window is resized
    window.addEventListener('resize', () => {
        resizeCanvas();
        init();
    });
})(); 