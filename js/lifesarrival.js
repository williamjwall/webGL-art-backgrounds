(function() {
    const canvas = document.getElementById('lifesarrival-canvas');
    if (!canvas) return; // Exit if canvas doesn't exist
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas to cover the entire window
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    // Call resize on load and when window is resized
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Life simulation parameters
    const cells = [];
    const nutrients = [];
    const maxCells = 200;
    const maxNutrients = 300;
    
    // Color palette - soft, organic tones
    const colors = {
        background: '#050510',
        cell: {
            young: 'rgba(247, 249, 255, 0.9)',   // Almost white
            mature: 'rgba(164, 218, 255, 0.85)', // Light blue
            old: 'rgba(115, 183, 229, 0.7)'      // Faded blue
        },
        nutrient: 'rgba(255, 252, 235, 0.4)',    // Soft yellow glow
        connection: 'rgba(220, 240, 255, 0.2)'   // Subtle blue connections
    };
    
    // Track time for organic movement
    let time = 0;
    
    // Listen for clicks to seed new life
    canvas.addEventListener('click', (event) => {
        // Create a new genesis point when clicked
        const genesisX = event.clientX;
        const genesisY = event.clientY;
        
        // Create the first cell - the origin of new life
        const originCell = createCell(genesisX, genesisY);
        originCell.radius = 3; // Slightly larger origin cell
        originCell.energy = 100; // More initial energy
        cells.push(originCell);
        
        // Create initial nutrients around the genesis point
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 80;
            const nutrient = createNutrient(
                genesisX + Math.cos(angle) * distance,
                genesisY + Math.sin(angle) * distance
            );
            nutrients.push(nutrient);
        }
    });
    
    function init() {
        // Clear existing cells and nutrients
        cells.length = 0;
        nutrients.length = 0;
        
        // Seed initial nutrients across the canvas
        for (let i = 0; i < maxNutrients / 2; i++) {
            nutrients.push(createNutrient(
                Math.random() * canvas.width,
                Math.random() * canvas.height
            ));
        }
        
        // Create initial cells, the first signs of life
        for (let i = 0; i < 5; i++) {
            const cell = createCell(
                Math.random() * canvas.width,
                Math.random() * canvas.height
            );
            cells.push(cell);
        }
    }
    
    function createCell(x, y) {
        return {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.2, // Slow, gentle movement
            vy: (Math.random() - 0.5) * 0.2,
            radius: 1.5 + Math.random(),
            energy: 20 + Math.random() * 30, // Energy that depletes over time
            age: 0,
            lifespan: 500 + Math.random() * 300, // How long the cell lives
            divideProbability: 0.001 + Math.random() * 0.002, // Chance to divide each frame
            canDivide: true, // Whether the cell has enough energy to divide
            memoryTrace: [] // Remember where it's been
        };
    }
    
    function createNutrient(x, y) {
        return {
            x: x,
            y: y,
            radius: 0.5 + Math.random() * 1.5,
            energy: 10 + Math.random() * 20,
            pulse: 0, // For pulsating effect
            pulseSpeed: 0.02 + Math.random() * 0.03
        };
    }
    
    function update() {
        time += 0.01;
        
        // Generate new nutrients occasionally
        if (nutrients.length < maxNutrients && Math.random() < 0.1) {
            nutrients.push(createNutrient(
                Math.random() * canvas.width,
                Math.random() * canvas.height
            ));
        }
        
        // Update cells
        for (let i = cells.length - 1; i >= 0; i--) {
            const cell = cells[i];
            
            // Age the cell
            cell.age++;
            
            // Deplete energy over time
            cell.energy -= 0.05;
            
            // Store position history for trailing effect
            if (cell.age % 5 === 0) { // Store every 5th position
                cell.memoryTrace.push({x: cell.x, y: cell.y, age: cell.age});
                if (cell.memoryTrace.length > 10) {
                    cell.memoryTrace.shift(); // Remove oldest position
                }
            }
            
            // Gentle flow movement
            const flowX = Math.sin(cell.y * 0.01 + time * 0.2) * 0.01;
            const flowY = Math.cos(cell.x * 0.01 + time * 0.1) * 0.01;
            
            cell.vx += flowX;
            cell.vy += flowY;
            
            // Update position
            cell.x += cell.vx;
            cell.y += cell.vy;
            
            // Wrap around edges
            if (cell.x < 0) cell.x = canvas.width;
            if (cell.x > canvas.width) cell.x = 0;
            if (cell.y < 0) cell.y = canvas.height;
            if (cell.y > canvas.height) cell.y = 0;
            
            // Add slight friction
            cell.vx *= 0.99;
            cell.vy *= 0.99;
            
            // Add slight random movement
            cell.vx += (Math.random() - 0.5) * 0.01;
            cell.vy += (Math.random() - 0.5) * 0.01;
            
            // Check for nutrients nearby
            for (let j = nutrients.length - 1; j >= 0; j--) {
                const nutrient = nutrients[j];
                const dx = nutrient.x - cell.x;
                const dy = nutrient.y - cell.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < cell.radius + nutrient.radius + 10) {
                    // Move toward the nutrient
                    cell.vx += (dx / distance) * 0.01;
                    cell.vy += (dy / distance) * 0.01;
                    
                    // If close enough, consume the nutrient
                    if (distance < cell.radius + nutrient.radius) {
                        cell.energy += nutrient.energy;
                        nutrients.splice(j, 1);
                        
                        // Cells can divide if they have enough energy
                        cell.canDivide = cell.energy > 40;
                    }
                }
            }
            
            // Possibly divide if conditions are right
            if (cell.canDivide && cell.age > 60 && Math.random() < cell.divideProbability) {
                if (cells.length < maxCells) {
                    // Cell division - create a new cell
                    const angle = Math.random() * Math.PI * 2;
                    const newCell = createCell(
                        cell.x + Math.cos(angle) * (cell.radius + 1),
                        cell.y + Math.sin(angle) * (cell.radius + 1)
                    );
                    
                    // Transfer some properties to daughter cell
                    newCell.radius = cell.radius * (0.85 + Math.random() * 0.3);
                    newCell.vx = cell.vx + (Math.random() - 0.5) * 0.1;
                    newCell.vy = cell.vy + (Math.random() - 0.5) * 0.1;
                    
                    // Expend energy to create new cell
                    cell.energy -= 25;
                    cell.canDivide = false;
                    
                    cells.push(newCell);
                }
            }
            
            // Remove dead cells
            if (cell.energy <= 0 || cell.age >= cell.lifespan) {
                // Leave nutrients when dying
                if (Math.random() < 0.3) {
                    const nutrient = createNutrient(cell.x, cell.y);
                    nutrient.energy = 5 + Math.random() * 5;
                    nutrients.push(nutrient);
                }
                cells.splice(i, 1);
            }
        }
        
        // Update nutrients
        nutrients.forEach(nutrient => {
            // Gentle pulsating effect
            nutrient.pulse += nutrient.pulseSpeed;
            if (nutrient.pulse > Math.PI * 2) {
                nutrient.pulse -= Math.PI * 2;
            }
        });
    }
    
    function draw() {
        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw a subtle glow in the center
        const centerGlow = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 0.5
        );
        centerGlow.addColorStop(0, 'rgba(20, 30, 50, 0.2)');
        centerGlow.addColorStop(1, 'rgba(5, 5, 16, 0)');
        ctx.fillStyle = centerGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw connections between nearby cells
        ctx.strokeStyle = colors.connection;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                const cellA = cells[i];
                const cellB = cells[j];
                const dx = cellB.x - cellA.x;
                const dy = cellB.y - cellA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Only connect nearby cells
                if (distance < 80) {
                    const opacity = 0.2 * (1 - distance / 80);
                    ctx.strokeStyle = `rgba(220, 240, 255, ${opacity})`;
                    ctx.beginPath();
                    ctx.moveTo(cellA.x, cellA.y);
                    ctx.lineTo(cellB.x, cellB.y);
                    ctx.stroke();
                }
            }
        }
        
        // Draw nutrients
        nutrients.forEach(nutrient => {
            // Pulse effect
            const pulseScale = 1 + Math.sin(nutrient.pulse) * 0.2;
            
            // Glow effect for nutrients
            const glow = ctx.createRadialGradient(
                nutrient.x, nutrient.y, 0,
                nutrient.x, nutrient.y, nutrient.radius * 5 * pulseScale
            );
            glow.addColorStop(0, colors.nutrient);
            glow.addColorStop(1, 'rgba(255, 252, 235, 0)');
            
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(nutrient.x, nutrient.y, nutrient.radius * 5 * pulseScale, 0, Math.PI * 2);
            ctx.fill();
            
            // Nutrient core
            ctx.fillStyle = 'rgba(255, 252, 235, 0.6)';
            ctx.beginPath();
            ctx.arc(nutrient.x, nutrient.y, nutrient.radius * pulseScale, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw cells
        cells.forEach(cell => {
            // Draw memory trace (trail)
            if (cell.memoryTrace.length > 1) {
                ctx.strokeStyle = 'rgba(164, 218, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cell.memoryTrace[0].x, cell.memoryTrace[0].y);
                
                for (let i = 1; i < cell.memoryTrace.length; i++) {
                    ctx.lineTo(cell.memoryTrace[i].x, cell.memoryTrace[i].y);
                }
                
                ctx.stroke();
            }
            
            // Determine cell color based on age
            let cellColor;
            const ageRatio = cell.age / cell.lifespan;
            
            if (ageRatio < 0.3) {
                cellColor = colors.cell.young;
            } else if (ageRatio < 0.7) {
                cellColor = colors.cell.mature;
            } else {
                cellColor = colors.cell.old;
            }
            
            // Draw cell
            ctx.fillStyle = cellColor;
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add slight outline
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            // Visual indication of energy
            if (cell.canDivide) {
                const pulseScale = 1 + Math.sin(time * 3) * 0.2;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(cell.x, cell.y, cell.radius * pulseScale + 2, 0, Math.PI * 2);
                ctx.stroke();
            }
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