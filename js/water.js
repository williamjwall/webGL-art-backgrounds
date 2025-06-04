// Vowel Waves - Living Speech Visualization with Formants
(function() {
    window.Water = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        clearMemory: clearMemory
    };

    const canvas = document.getElementById('water-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Vowel colors
    const colors = {
        primary: '#2A2B3D',     // Deep blue
        secondary: '#4A4B7C',   // Medium blue
        accent: '#6B7AA0',      // Light blue
        background: '#1A1B26'   // Dark background
    };

    // Vowel wave parameters
    const vowels = {
        count: 55,              // About 50+ waves
        waves: [],
        formants: {
            'a': [730, 1090, 2440],  // "ah" sound
            'e': [270, 2290, 3010],  // "eh" sound  
            'i': [390, 1990, 2550],  // "ee" sound
            'o': [360, 640, 2240],   // "oh" sound
            'u': [250, 595, 1400]    // "oo" sound
        },
        currentVowel: 'a',
        vowelTransition: 0,
        speechRate: 0.012
    };

    // Formant and spectrogram data
    const analysis = {
        frequencyBands: 64,
        timeWindow: 300,
        frequencyData: new Array(64).fill(0),
        spectrogramHistory: [],
        currentFormants: [730, 1090, 2440]
    };

    let time = 0;

    // Create vowel waves
    function createVowelWaves() {
        vowels.waves = [];
        
        for (let i = 0; i < vowels.count; i++) {
            const vowelType = ['a', 'e', 'i', 'o', 'u'][Math.floor(Math.random() * 5)];
            const formants = vowels.formants[vowelType];
            
            vowels.waves.push({
                id: i,
                vowelType: vowelType,
                y: (i / vowels.count) * canvas.height,
                baseY: (i / vowels.count) * canvas.height,
                frequency: 0.005 + Math.random() * 0.02,
                amplitude: 20 + Math.random() * 60,
                phase: Math.random() * Math.PI * 2,
                speed: 0.003 + Math.random() * 0.008,
                life: 0.5 + Math.random() * 0.5,
                formant1: formants[0],
                formant2: formants[1], 
                formant3: formants[2],
                thickness: 1 + Math.random() * 3,
                breathiness: Math.random() * 0.3,
                nasality: Math.random() * 0.2,
                intensity: 0.3 + Math.random() * 0.7
            });
        }
    }

    // Generate formant and frequency data
    function generateFormantData() {
        time += vowels.speechRate;
        
        // Update current formants based on vowel transition
        const targetFormants = vowels.formants[vowels.currentVowel];
        const transitionSpeed = 0.03;
        
        analysis.currentFormants[0] += (targetFormants[0] - analysis.currentFormants[0]) * transitionSpeed;
        analysis.currentFormants[1] += (targetFormants[1] - analysis.currentFormants[1]) * transitionSpeed;
        analysis.currentFormants[2] += (targetFormants[2] - analysis.currentFormants[2]) * transitionSpeed;
        
        // Generate frequency spectrum based on current formants
        for (let i = 0; i < analysis.frequencyBands; i++) {
            const freq = (i / analysis.frequencyBands) * 4000; // 0-4kHz range
            let amplitude = 0;
            
            // Fundamental frequency and harmonics
            const fundamental = 120 + Math.sin(time * 0.7) * 25;
            for (let harmonic = 1; harmonic <= 10; harmonic++) {
                const harmonicFreq = fundamental * harmonic;
                if (Math.abs(freq - harmonicFreq) < 50) {
                    amplitude += (0.8 / harmonic) * (0.4 + Math.sin(time * 2.5) * 0.6);
                }
            }
            
            // Formant peaks
            analysis.currentFormants.forEach((formant, idx) => {
                const distance = Math.abs(freq - formant);
                if (distance < 200) {
                    const formantStrength = Math.exp(-distance / 100) * 0.7;
                    amplitude += formantStrength * (0.6 + Math.sin(time * 1.5 + idx) * 0.4);
                }
            });
            
            // Breathing and noise
            amplitude += Math.random() * 0.06 + Math.sin(time * 0.3) * 0.04;
            
            // Smooth the data
            analysis.frequencyData[i] = analysis.frequencyData[i] * 0.8 + amplitude * 0.2;
        }
        
        // Store spectrogram history
        analysis.spectrogramHistory.push([...analysis.frequencyData]);
        if (analysis.spectrogramHistory.length > analysis.timeWindow) {
            analysis.spectrogramHistory.shift();
        }
    }

    // Simulate vowel transitions and breathing
    function updateVowelWaves() {
        // Vowel transition cycle
        vowels.vowelTransition += 0.008;
        const vowelIndex = Math.floor(vowels.vowelTransition) % 5;
        const vowelNames = ['a', 'e', 'i', 'o', 'u'];
        vowels.currentVowel = vowelNames[vowelIndex];
        
        // Breathing pattern
        const breathingCycle = Math.sin(time * 0.3) * 0.5 + 0.5;
        const speechIntensity = Math.sin(time * 0.8) * 0.3 + 0.7;
        
        vowels.waves.forEach((wave, index) => {
            // Update wave properties based on current vowel
            const targetFormants = vowels.formants[vowels.currentVowel];
            const transitionSpeed = 0.02;
            
            // Smooth formant transitions
            wave.formant1 += (targetFormants[0] - wave.formant1) * transitionSpeed;
            wave.formant2 += (targetFormants[1] - wave.formant2) * transitionSpeed;
            wave.formant3 += (targetFormants[2] - wave.formant3) * transitionSpeed;
            
            // Wave movement and modulation
            wave.phase += wave.speed;
            
            // Vowel-specific amplitude modulation
            const formantStrength = Math.sin(time * 2 + index * 0.1) * 0.3 + 0.7;
            wave.amplitude = (30 + Math.sin(time * 1.5 + index * 0.2) * 40) * formantStrength;
            
            // Breathing affects all waves
            wave.amplitude *= breathingCycle * speechIntensity;
            
            // Vertical movement based on formant frequencies
            const formantInfluence = (wave.formant1 + wave.formant2 + wave.formant3) / 3000;
            wave.y = wave.baseY + Math.sin(time * 0.5 + index * 0.1) * 20 * formantInfluence;
            
            // Life cycle - waves fade in and out
            wave.life += (Math.random() - 0.5) * 0.01;
            wave.life = Math.max(0.1, Math.min(1.0, wave.life));
            
            // Occasional vowel type changes for individual waves
            if (Math.random() < 0.002) {
                wave.vowelType = vowelNames[Math.floor(Math.random() * 5)];
            }
        });
    }

    function drawSpectrogram() {
        // Draw moving spectrogram behind everything
        const spectWidth = canvas.width;
        const spectHeight = canvas.height;
        const timeStep = spectWidth / analysis.timeWindow;
        const freqStep = spectHeight / analysis.frequencyBands;
        
        // Very subtle background spectrogram
        for (let t = 0; t < analysis.spectrogramHistory.length; t++) {
            const timeData = analysis.spectrogramHistory[t];
            const x = t * timeStep;
            
            for (let f = 0; f < timeData.length; f++) {
                const amplitude = Math.min(timeData[f], 1);
                const y = spectHeight - (f * freqStep);
                
                if (amplitude > 0.1) {
                    // Very subtle background colors
                    let color;
                    if (amplitude > 0.7) {
                        color = colors.accent;
                    } else if (amplitude > 0.4) {
                        color = colors.secondary;
                    } else {
                        color = colors.primary;
                    }
                    
                    const intensity = Math.floor(amplitude * 60); // Much more subtle
                    ctx.fillStyle = `${color}${intensity.toString(16).padStart(2, '0')}`;
                    ctx.fillRect(x, y, timeStep + 1, freqStep + 1);
                }
            }
        }
    }

    function drawFormantLines() {
        // Draw current formant frequencies as subtle vertical lines
        const maxFreq = 4000;
        
        analysis.currentFormants.forEach((formant, index) => {
            const x = (formant / maxFreq) * canvas.width;
            
            // Formant line with pulsing intensity
            const pulse = Math.sin(time * 3 + index) * 0.3 + 0.7;
            const alpha = Math.floor(pulse * 80);
            
            ctx.strokeStyle = `${colors.accent}${alpha.toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Formant frequency label
            ctx.fillStyle = `${colors.accent}60`;
            ctx.font = '10px monospace';
            ctx.fillText(`F${index + 1}: ${Math.round(formant)}Hz`, x + 5, 20 + index * 15);
        });
    }

    function drawVowelWaves() {
        vowels.waves.forEach((wave, index) => {
            const alpha = wave.life * wave.intensity;
            
            // Different colors for different vowels
            let waveColor;
            switch (wave.vowelType) {
                case 'a': waveColor = colors.accent; break;
                case 'e': waveColor = colors.secondary; break;
                case 'i': waveColor = colors.primary; break;
                case 'o': waveColor = '#8FA3D3'; break;
                case 'u': waveColor = '#5A6B8D'; break;
                default: waveColor = colors.accent;
            }
            
            // Main vowel wave
            ctx.strokeStyle = `${waveColor}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = wave.thickness;
            ctx.beginPath();
            
            for (let x = 0; x < canvas.width; x += 2) {
                // Complex vowel waveform with formant influences
                const formant1Wave = Math.sin(x * wave.frequency * (wave.formant1 / 500) + wave.phase) * 0.4;
                const formant2Wave = Math.sin(x * wave.frequency * (wave.formant2 / 500) + wave.phase * 1.3) * 0.3;
                const formant3Wave = Math.sin(x * wave.frequency * (wave.formant3 / 500) + wave.phase * 0.7) * 0.2;
                
                const vowelWave = (formant1Wave + formant2Wave + formant3Wave) * wave.amplitude;
                
                // Add breathiness and nasality
                const breathiness = Math.sin(x * 0.01 + time * 3) * wave.breathiness * 10;
                const nasality = Math.sin(x * 0.005 + time * 2) * wave.nasality * 15;
                
                const y = wave.y + vowelWave + breathiness + nasality;
                
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            
            ctx.stroke();
            
            // Harmonic overtones
            if (wave.life > 0.6) {
                ctx.strokeStyle = `${waveColor}${Math.floor(alpha * 0.4 * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = wave.thickness * 0.5;
                ctx.beginPath();
                
                for (let x = 0; x < canvas.width; x += 4) {
                    const harmonic = Math.sin(x * wave.frequency * 2 + wave.phase) * wave.amplitude * 0.3;
                    const y = wave.y + harmonic;
                    
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                
                ctx.stroke();
            }
            
            // Glow effect for strong vowels
            if (wave.intensity > 0.7) {
                ctx.strokeStyle = `${waveColor}${Math.floor(alpha * 0.2 * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = wave.thickness * 4;
                ctx.beginPath();
                
                for (let x = 0; x < canvas.width; x += 6) {
                    const glowWave = Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
                    const y = wave.y + glowWave;
                    
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                
                ctx.stroke();
            }
        });
    }

    function drawVowelIndicators() {
        // Show current vowel being emphasized
        ctx.fillStyle = `${colors.accent}60`;
        ctx.font = '24px monospace';
        const vowelText = vowels.currentVowel.toUpperCase();
        const textWidth = ctx.measureText(vowelText).width;
        
        // Pulsing vowel indicator
        const pulse = Math.sin(time * 4) * 0.3 + 0.7;
        ctx.fillStyle = `${colors.accent}${Math.floor(pulse * 255).toString(16).padStart(2, '0')}`;
        ctx.fillText(vowelText, canvas.width - textWidth - 30, 40);
        
        // Vowel transition progress
        const progress = (vowels.vowelTransition % 1) * canvas.width;
        ctx.fillStyle = `${colors.secondary}40`;
        ctx.fillRect(0, canvas.height - 5, progress, 5);
    }

    function drawBackground() {
        // Dark background with subtle vowel-based color shift
        const vowelHue = vowels.vowelTransition * 0.1;
        const bgShift = Math.sin(vowelHue) * 10;
        
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Subtle breathing texture
        ctx.fillStyle = `${colors.primary}08`;
        const breathingIntensity = Math.sin(time * 0.3) * 0.5 + 0.5;
        
        for (let i = 0; i < 20; i++) {
            const x = (Math.sin(time * 0.1 + i) * 0.5 + 0.5) * canvas.width;
            const y = (Math.cos(time * 0.08 + i * 0.7) * 0.5 + 0.5) * canvas.height;
            const size = (Math.sin(time * 0.2 + i) * 2 + 3) * breathingIntensity;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function draw() {
        drawBackground();
        drawSpectrogram();        // Behind everything
        drawFormantLines();       // Behind waves
        drawVowelWaves();         // In front
        drawVowelIndicators();    // On top
    }

    function animate() {
        if (!Water.active) return;
        
        generateFormantData();
        updateVowelWaves();
        draw();
        
        Water.animationId = requestAnimationFrame(animate);
    }

    function init() {
        console.log('Initializing Living Vowel Waves with Formants...');
        resizeCanvas();
        
        createVowelWaves();
        
        // Initialize analysis data
        analysis.frequencyData.fill(0);
        analysis.spectrogramHistory = [];
        
        Water.active = true;
        animate();
    }

    function stopAnimation() {
        Water.active = false;
        if (Water.animationId) {
            cancelAnimationFrame(Water.animationId);
            Water.animationId = null;
        }
    }

    function clearMemory() {
        stopAnimation();
        vowels.waves = [];
        analysis.frequencyData.fill(0);
        analysis.spectrogramHistory = [];
    }

    if (canvas.classList.contains('active')) {
        init();
    }
})(); 