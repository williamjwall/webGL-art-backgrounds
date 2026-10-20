// Climber - a small dark cube wandering across an endless isometric block terrain
(function() {
    window.Climber = {
        active: false,
        animationId: null,
        init: init,
        stop: stopAnimation,
        clearMemory: clearMemory
    };

    const canvas = document.getElementById('climber-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });

    // Palette - dusk purple lowlands up to warm sand peaks
    const LOW = [52, 44, 64];
    const HIGH = [222, 196, 160];
    const GLOW = [255, 170, 110];
    const BG_TOP = '#16131b';
    const BG_BOTTOM = '#2a2230';

    const MAX_LEVEL = 22;      // heights are stored in half-cell levels
    const MAX_CLIMB = 3;       // levels the cube can hop up
    const TRAIL_LIFE = 5;      // seconds a visited tile glows

    let W = 0, H = 0, dpr = 1;
    let TW = 48, TH = 24, ZU = 29; // tile width, tile height, px per height unit
    let bgGradient = null, vignette = null;

    const camera = { x: 0, y: 0 };
    const drag = { active: false, lastX: 0, lastY: 0, x: 0, y: 0 };
    const trail = new Map();
    const heightCache = new Map();
    let palette = [];
    let listenersAttached = false;
    let lastTime = 0;
    let clock = 0;

    const climber = {
        fi: 0, fj: 0, fh: 0,   // hop origin cell + height
        ti: 0, tj: 0, th: 0,   // hop target cell + height
        t: 1, duration: 0.4,
        pause: 0.5,
        heading: Math.random() * Math.PI * 2,
        x: 0.5, y: 0.5, z: 0
    };

    // ---- Terrain ----

    function hash(i, j, seed) {
        let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 2147483647);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    function valueNoise(x, y, seed) {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed);
        const c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }

    function levelAt(i, j) {
        const key = i * 65536 + j;
        let level = heightCache.get(key);
        if (level !== undefined) return level;

        const n = valueNoise(i / 11, j / 11, 1) * 0.7 + valueNoise(i / 4, j / 4, 2) * 0.3;
        level = Math.max(0, Math.floor((n - 0.32) * 18));
        // Occasional towers
        if (level >= 2 && hash(i, j, 3) < 0.03) {
            level += 4 + Math.floor(hash(i, j, 4) * 6);
        }
        level = Math.min(level, MAX_LEVEL);

        if (heightCache.size > 60000) heightCache.clear();
        heightCache.set(key, level);
        return level;
    }

    function buildPalette() {
        palette = [];
        for (let l = 0; l <= MAX_LEVEL; l++) {
            const t = Math.pow(l / MAX_LEVEL, 0.7);
            const base = LOW.map((c, k) => c + (HIGH[k] - c) * t);
            const variants = [];
            for (let v = 0; v < 4; v++) {
                const jitter = 0.94 + v * 0.04;
                const top = base.map(c => c * jitter);
                variants.push({
                    top: top,
                    topStr: rgb(top, 1),
                    leftStr: rgb(top, 0.72),
                    rightStr: rgb(top, 0.52)
                });
            }
            palette.push(variants);
        }
    }

    function rgb(c, k) {
        return `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
    }

    // ---- Projection ----

    function sx(x, y) { return (x - y) * TW / 2 - camera.x - drag.x + W / 2; }
    function sy(x, y, z) { return (x + y) * TH / 2 - z * ZU - camera.y - drag.y + H / 2; }

    // ---- Climber ----

    function chooseNextHop() {
        climber.heading += (Math.random() - 0.5) * 0.9;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const fromLevel = levelAt(climber.ti, climber.tj);
        let best = null, bestScore = -Infinity;

        for (const [di, dj] of dirs) {
            const ni = climber.ti + di, nj = climber.tj + dj;
            const dl = levelAt(ni, nj) - fromLevel;
            let score = Math.cos(Math.atan2(dj, di) - climber.heading) + Math.random() * 0.8;
            score += dl > 0 ? 0.15 * dl : 0;         // it likes to climb
            if (dl > MAX_CLIMB) score -= 4 + dl;      // walls are a last resort
            if (trail.has(ni * 65536 + nj)) score -= 0.4;
            if (score > bestScore) { bestScore = score; best = [ni, nj]; }
        }

        climber.fi = climber.ti; climber.fj = climber.tj; climber.fh = fromLevel / 2;
        climber.ti = best[0]; climber.tj = best[1]; climber.th = levelAt(best[0], best[1]) / 2;
        climber.t = 0;
        climber.duration = 0.34 + Math.abs(climber.th - climber.fh) * 0.06;
    }

    function updateClimber(dt) {
        if (climber.t < 1) {
            climber.t = Math.min(1, climber.t + dt / climber.duration);
            if (climber.t === 1) {
                trail.set(climber.ti * 65536 + climber.tj, clock);
                climber.pause = Math.random() < 0.08 ? 1.2 + Math.random() * 1.5 : 0.08 + Math.random() * 0.35;
            }
        } else {
            climber.pause -= dt;
            if (climber.pause <= 0) chooseNextHop();
        }

        const t = climber.t;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const rise = Math.max(0, climber.th - climber.fh);
        const arc = (0.35 + rise) * 4 * t * (1 - t);
        climber.x = climber.fi + 0.5 + (climber.ti - climber.fi) * e;
        climber.y = climber.fj + 0.5 + (climber.tj - climber.fj) * e;
        climber.z = climber.fh + (climber.th - climber.fh) * e + arc;
    }

    function drawClimber() {
        const s = 0.42;
        const x0 = climber.x - s / 2, x1 = climber.x + s / 2;
        const y0 = climber.y - s / 2, y1 = climber.y + s / 2;
        const zb = climber.z, zt = climber.z + s * 0.85;

        // Soft warm light on the surface beneath
        const ground = climber.t < 1 ? Math.max(climber.fh, climber.th) : climber.th;
        const lx = sx(climber.x, climber.y), ly = sy(climber.x, climber.y, ground);
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, TW * 0.9);
        glow.addColorStop(0, 'rgba(255,170,110,0.35)');
        glow.addColorStop(1, 'rgba(255,170,110,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(lx - TW, ly - TW, TW * 2, TW * 2);

        // Top
        ctx.fillStyle = '#2b2331';
        quad(sx(x0, y0), sy(x0, y0, zt), sx(x1, y0), sy(x1, y0, zt),
             sx(x1, y1), sy(x1, y1, zt), sx(x0, y1), sy(x0, y1, zt));
        // Right face (x = x1)
        ctx.fillStyle = '#0f0c12';
        quad(sx(x1, y0), sy(x1, y0, zt), sx(x1, y1), sy(x1, y1, zt),
             sx(x1, y1), sy(x1, y1, zb), sx(x1, y0), sy(x1, y0, zb));
        // Left face (y = y1)
        ctx.fillStyle = '#1a151e';
        quad(sx(x0, y1), sy(x0, y1, zt), sx(x1, y1), sy(x1, y1, zt),
             sx(x1, y1), sy(x1, y1, zb), sx(x0, y1), sy(x0, y1, zb));
        // Thin warm rim on the top edges
        ctx.strokeStyle = 'rgba(255,190,140,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx(x0, y1), sy(x0, y1, zt));
        ctx.lineTo(sx(x1, y1), sy(x1, y1, zt));
        ctx.lineTo(sx(x1, y0), sy(x1, y0, zt));
        ctx.stroke();
    }

    function quad(ax, ay, bx, by, cx, cy, dx, dy) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.lineTo(dx, dy);
        ctx.closePath();
        ctx.fill();
    }

    // ---- Rendering ----

    function drawCell(i, j, level) {
        const h = level / 2;
        const v = palette[level][(hash(i, j, 5) * 4) | 0];

        const x0 = sx(i, j), y0 = sy(i, j, h);
        const hw = TW / 2, hh = TH / 2;

        // Right face (x = i + 1), hidden below neighbour (i + 1, j)
        const rightDrop = h - levelAt(i + 1, j) / 2;
        if (rightDrop > 0) {
            ctx.fillStyle = v.rightStr;
            quad(x0 + hw, y0 + hh, x0, y0 + TH,
                 x0, y0 + TH + rightDrop * ZU, x0 + hw, y0 + hh + rightDrop * ZU);
        }
        // Left face (y = j + 1), hidden below neighbour (i, j + 1)
        const leftDrop = h - levelAt(i, j + 1) / 2;
        if (leftDrop > 0) {
            ctx.fillStyle = v.leftStr;
            quad(x0 - hw, y0 + hh, x0, y0 + TH,
                 x0, y0 + TH + leftDrop * ZU, x0 - hw, y0 + hh + leftDrop * ZU);
        }

        // Top, warmed if the climber passed through recently
        const visited = trail.get(i * 65536 + j);
        if (visited !== undefined) {
            const k = Math.exp(-(clock - visited) / (TRAIL_LIFE / 3)) * 0.45;
            ctx.fillStyle = rgb(v.top.map((c, n) => c + (GLOW[n] - c) * k), 1);
        } else {
            ctx.fillStyle = v.topStr;
        }
        quad(x0, y0, x0 + hw, y0 + hh, x0, y0 + TH, x0 - hw, y0 + hh);
    }

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, W, H);

        const camX = camera.x + drag.x, camY = camera.y + drag.y;
        const halfW = TW / 2, halfH = TH / 2;
        const d0 = Math.floor((camX - W / 2) / halfW) - 2;
        const d1 = Math.ceil((camX + W / 2) / halfW) + 2;
        const s0 = Math.floor((camY - H / 2) / halfH) - 3;
        const s1 = Math.ceil((camY + H / 2 + (MAX_LEVEL / 2) * ZU) / halfH) + 2;

        // The climber is drawn right after the later of its two cells so nearer blocks occlude it
        const cs = Math.max(climber.fi + climber.fj, climber.ti + climber.tj);
        const cd = climber.ti + climber.tj >= climber.fi + climber.fj
            ? climber.ti - climber.tj : climber.fi - climber.fj;

        for (let s = s0; s <= s1; s++) {
            const rowTop = s * halfH - camY + H / 2;
            for (let d = d0; d <= d1; d++) {
                if (((s + d) & 1) !== 0) continue;
                const i = (s + d) >> 1, j = (s - d) >> 1;
                const level = levelAt(i, j);
                if (rowTop - (level / 2) * ZU <= H) drawCell(i, j, level);
                if (s === cs && d === cd) drawClimber();
            }
        }

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);
    }

    function update(dt) {
        clock += dt;
        updateClimber(dt);

        for (const [key, t] of trail) {
            if (clock - t > TRAIL_LIFE) trail.delete(key);
        }

        // Follow the climber's screen position lazily
        const tx = (climber.x - climber.y) * TW / 2;
        const ty = (climber.x + climber.y) * TH / 2 - climber.z * ZU;
        const k = 1 - Math.exp(-dt * 1.2);
        camera.x += (tx - camera.x) * k;
        camera.y += (ty - camera.y) * k;

        // Drag offset eases back once released
        if (!drag.active) {
            const r = Math.exp(-dt * 0.8);
            drag.x *= r;
            drag.y *= r;
        }
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);

        TW = Math.max(32, Math.min(64, Math.round(Math.min(W, H) / 16)));
        TH = TW / 2;
        ZU = TH * 1.2;

        bgGradient = ctx.createLinearGradient(0, 0, 0, H);
        bgGradient.addColorStop(0, BG_TOP);
        bgGradient.addColorStop(1, BG_BOTTOM);

        vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
        vignette.addColorStop(0, 'rgba(22,19,27,0)');
        vignette.addColorStop(1, 'rgba(22,19,27,0.85)');
    }

    function animate(now) {
        if (!Climber.active) return;

        // Other code may reset the canvas size; keep it in sync
        if (canvas.width !== Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)) ||
            canvas.height !== Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, 2))) {
            resize();
        }

        const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
        lastTime = now;

        update(dt);
        draw();
        Climber.animationId = requestAnimationFrame(animate);
    }

    // ---- Input: drag to look around ----

    function onPointerDown(e) {
        drag.active = true;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
    }

    function onPointerMove(e) {
        if (!drag.active) return;
        drag.x -= e.clientX - drag.lastX;
        drag.y -= e.clientY - drag.lastY;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
    }

    function onPointerUp() {
        drag.active = false;
    }

    function attachListeners() {
        if (listenersAttached) return;
        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('resize', resize);
        listenersAttached = true;
    }

    function detachListeners() {
        if (!listenersAttached) return;
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('resize', resize);
        listenersAttached = false;
    }

    // ---- Lifecycle ----

    function init() {
        if (Climber.active) return;
        resize();
        if (!palette.length) buildPalette();

        // Start on a random raised tile and snap the camera to it
        const i = Math.floor(Math.random() * 2000) - 1000;
        const j = Math.floor(Math.random() * 2000) - 1000;
        climber.fi = climber.ti = i;
        climber.fj = climber.tj = j;
        climber.fh = climber.th = levelAt(i, j) / 2;
        climber.t = 1;
        climber.pause = 0.6;
        updateClimber(0);
        camera.x = (climber.x - climber.y) * TW / 2;
        camera.y = (climber.x + climber.y) * TH / 2 - climber.z * ZU;
        drag.x = drag.y = 0;

        attachListeners();
        Climber.active = true;
        lastTime = 0;
        Climber.animationId = requestAnimationFrame(animate);
    }

    function stopAnimation() {
        Climber.active = false;
        if (Climber.animationId) {
            cancelAnimationFrame(Climber.animationId);
            Climber.animationId = null;
        }
        drag.active = false;
        detachListeners();
    }

    function clearMemory() {
        stopAnimation();
        trail.clear();
        heightCache.clear();
    }

    if (canvas.classList.contains('active')) {
        init();
    }
})();
