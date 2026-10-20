// Climber - a small black cube wandering across an endless isometric block terrain,
// dotted with abstract tiles built from smaller blocks at random depths
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

    // Three earth colours; everything else is a flat shade of one of them
    const BROWN = [124, 90, 62];
    const TAN = [196, 164, 124];
    const BEIGE = [230, 216, 192];
    const BG = rgb(BROWN, 0.34);

    const MAX_LEVEL = 22;      // heights are stored in half-cell levels
    const MAX_CLIMB = 3;       // levels the cube can hop up
    const TRAIL_LIFE = 5;      // seconds a visited tile is avoided

    // Abstract tile kinds
    const PLAIN = 0, VOXEL = 1, LAYERS = 2, PILLARS = 3, STEPS = 4, FLOAT = 5;

    let W = 0, H = 0, dpr = 1;
    let TW = 48, TH = 24, ZU = 29; // tile width, tile height, px per height unit

    const camera = { x: 0, y: 0 };
    const drag = { active: false, lastX: 0, lastY: 0, x: 0, y: 0 };
    const trail = new Map();
    const cellCache = new Map();
    let swatches = [];
    let palette = [];
    let listenersAttached = false;
    let lastTime = 0;
    let clock = 0;

    const climber = {
        fi: 0, fj: 0, fh: 0,   // hop origin cell + height
        ti: 0, tj: 0, th: 0,   // hop target cell + height
        t: 1, duration: 0.4,
        pause: 0.5,
        land: 0,               // squash after landing, 1 -> 0
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

    // Packed as level | kind << 5
    function cellAt(i, j) {
        const key = i * 65536 + j;
        let cell = cellCache.get(key);
        if (cell !== undefined) return cell;

        const n = valueNoise(i / 11, j / 11, 1) * 0.7 + valueNoise(i / 4, j / 4, 2) * 0.3;
        let level = Math.max(0, Math.floor((n - 0.32) * 18));
        // Occasional towers
        if (level >= 2 && hash(i, j, 3) < 0.03) {
            level += 4 + Math.floor(hash(i, j, 4) * 6);
        }
        // Abstract tiles are sparse, but gather in loose drifts, and sit at random depths
        const drift = Math.max(0, valueNoise(i / 9, j / 9, 11) - 0.55) / 0.45;
        let kind = PLAIN;
        if (hash(i, j, 12) < 0.03 + drift * 0.35) {
            kind = 1 + Math.floor(hash(i, j, 13) * 5);
            level += Math.floor(hash(i, j, 21) * 5) - 2;
        }
        level = Math.max(0, Math.min(level, MAX_LEVEL));

        cell = level | (kind << 5);
        if (cellCache.size > 60000) cellCache.clear();
        cellCache.set(key, cell);
        return cell;
    }

    function levelAt(i, j) { return cellAt(i, j) & 31; }
    function kindAt(i, j) { return cellAt(i, j) >> 5; }

    function floatLift(i, j) {
        return 0.7 + 0.12 * Math.sin(clock * 1.3 + hash(i, j, 15) * 6.28);
    }

    // Height the climber stands at
    function surfaceAt(i, j) {
        const h = levelAt(i, j) / 2;
        return kindAt(i, j) === FLOAT ? h + floatLift(i, j) : h;
    }

    function swatch(c, band) {
        return {
            band: band,
            topStr: rgb(c, 1),
            leftStr: rgb(c, 0.72),
            rightStr: rgb(c, 0.52)
        };
    }

    function buildPalette() {
        swatches = [swatch(BROWN, 0), swatch(TAN, 1), swatch(BEIGE, 2)];
        palette = [];
        for (let l = 0; l <= MAX_LEVEL; l++) {
            palette.push(swatches[l < 2 ? 0 : l < 6 ? 1 : 2]);
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
        const from = surfaceAt(climber.ti, climber.tj);
        let best = null, bestScore = -Infinity;

        for (const [di, dj] of dirs) {
            const ni = climber.ti + di, nj = climber.tj + dj;
            const dl = (surfaceAt(ni, nj) - from) * 2;
            let score = Math.cos(Math.atan2(dj, di) - climber.heading) + Math.random() * 0.8;
            score += dl > 0 ? 0.15 * dl : 0;         // it likes to climb
            if (kindAt(ni, nj) !== PLAIN) score += 0.5; // and it's curious
            if (dl > MAX_CLIMB) score -= 4 + dl;      // walls are a last resort
            if (trail.has(ni * 65536 + nj)) score -= 0.4;
            if (score > bestScore) { bestScore = score; best = [ni, nj]; }
        }

        climber.fi = climber.ti; climber.fj = climber.tj; climber.fh = from;
        climber.ti = best[0]; climber.tj = best[1]; climber.th = surfaceAt(best[0], best[1]);
        climber.t = 0;
        climber.duration = 0.34 + Math.abs(climber.th - climber.fh) * 0.06;
    }

    function updateClimber(dt) {
        if (climber.t < 1) {
            climber.t = Math.min(1, climber.t + dt / climber.duration);
            if (climber.t === 1) {
                trail.set(climber.ti * 65536 + climber.tj, clock);
                climber.land = 1;
                climber.pause = Math.random() < 0.08 ? 1.2 + Math.random() * 1.5 : 0.08 + Math.random() * 0.35;
            }
        } else {
            climber.pause -= dt;
            if (climber.pause <= 0) chooseNextHop();
        }
        climber.land = Math.max(0, climber.land - dt * 5);

        // Floating slabs bob, so heights are re-read every frame
        climber.fh = surfaceAt(climber.fi, climber.fj);
        climber.th = surfaceAt(climber.ti, climber.tj);

        const t = climber.t;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const rise = Math.max(0, climber.th - climber.fh);
        const arc = (0.35 + rise) * 4 * t * (1 - t);
        climber.x = climber.fi + 0.5 + (climber.ti - climber.fi) * e;
        climber.y = climber.fj + 0.5 + (climber.tj - climber.fj) * e;
        climber.z = climber.fh + (climber.th - climber.fh) * e + arc;
    }

    function drawClimber() {
        // Stretch mid-hop, squash on landing
        const stretch = 1 + 0.2 * Math.sin(Math.PI * climber.t) - 0.25 * climber.land;
        const s = 0.42 / Math.sqrt(stretch);
        const x0 = climber.x - s / 2, x1 = climber.x + s / 2;
        const y0 = climber.y - s / 2, y1 = climber.y + s / 2;
        const zb = climber.z, zt = climber.z + 0.36 * stretch;

        ctx.fillStyle = '#262422';
        quad(sx(x0, y0), sy(x0, y0, zt), sx(x1, y0), sy(x1, y0, zt),
             sx(x1, y1), sy(x1, y1, zt), sx(x0, y1), sy(x0, y1, zt));
        ctx.fillStyle = '#050505';
        quad(sx(x1, y0), sy(x1, y0, zt), sx(x1, y1), sy(x1, y1, zt),
             sx(x1, y1), sy(x1, y1, zb), sx(x1, y0), sy(x1, y0, zb));
        ctx.fillStyle = '#121110';
        quad(sx(x0, y1), sy(x0, y1, zt), sx(x1, y1), sy(x1, y1, zt),
             sx(x1, y1), sy(x1, y1, zb), sx(x0, y1), sy(x0, y1, zb));
    }

    // ---- Drawing helpers ----

    function quad(ax, ay, bx, by, cx, cy, dx, dy) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.lineTo(dx, dy);
        ctx.closePath();
        ctx.fill();
    }

    // Axis-aligned block from (x0, y0) to (x1, y1), zb to zt; visible faces only
    function block(x0, y0, x1, y1, zb, zt, sw, top) {
        ctx.fillStyle = sw.rightStr;
        quad(sx(x1, y0), sy(x1, y0, zt), sx(x1, y1), sy(x1, y1, zt),
             sx(x1, y1), sy(x1, y1, zb), sx(x1, y0), sy(x1, y0, zb));
        ctx.fillStyle = sw.leftStr;
        quad(sx(x0, y1), sy(x0, y1, zt), sx(x1, y1), sy(x1, y1, zt),
             sx(x1, y1), sy(x1, y1, zb), sx(x0, y1), sy(x0, y1, zb));
        ctx.fillStyle = top || sw.topStr;
        quad(sx(x0, y0), sy(x0, y0, zt), sx(x1, y0), sy(x1, y0, zt),
             sx(x1, y1), sy(x1, y1, zt), sx(x0, y1), sy(x0, y1, zt));
    }

    // Lowest point of this column that can show past its front neighbours
    function floorOf(i, j, h) {
        return Math.min(h, levelAt(i + 1, j) / 2, levelAt(i, j + 1) / 2);
    }

    // A second colour for abstract tiles, never the tile's own
    function altOf(i, j, sw) {
        return swatches[(sw.band + 1 + (hash(i, j, 14) < 0.5 ? 0 : 1)) % 3];
    }

    // ---- Rendering ----

    function drawPlain(i, j, level, sw) {
        const h = level / 2;
        const x0 = sx(i, j), y0 = sy(i, j, h);
        const hw = TW / 2, hh = TH / 2;

        // Right face (x = i + 1), hidden below neighbour (i + 1, j)
        const rightDrop = h - levelAt(i + 1, j) / 2;
        if (rightDrop > 0) {
            ctx.fillStyle = sw.rightStr;
            quad(x0 + hw, y0 + hh, x0, y0 + TH,
                 x0, y0 + TH + rightDrop * ZU, x0 + hw, y0 + hh + rightDrop * ZU);
        }
        // Left face (y = j + 1), hidden below neighbour (i, j + 1)
        const leftDrop = h - levelAt(i, j + 1) / 2;
        if (leftDrop > 0) {
            ctx.fillStyle = sw.leftStr;
            quad(x0 - hw, y0 + hh, x0, y0 + TH,
                 x0, y0 + TH + leftDrop * ZU, x0 - hw, y0 + hh + leftDrop * ZU);
        }

        ctx.fillStyle = sw.topStr;
        quad(x0, y0, x0 + hw, y0 + hh, x0, y0 + TH, x0 - hw, y0 + hh);
    }

    // 3x3 mosaic of little columns rising and settling in a slow wave
    function drawVoxel(i, j, level, sw) {
        const h = level / 2, base = h - 0.45;
        const floor = floorOf(i, j, h);
        if (base > floor) block(i, j, i + 1, j + 1, floor, base, sw);

        const phase = hash(i, j, 16) * 6.28;
        for (let d = 0; d <= 4; d++) {
            for (let a = Math.max(0, d - 2); a <= Math.min(2, d); a++) {
                const b = d - a;
                const zt = h - 0.15 - 0.15 * Math.sin(clock * 0.7 + a * 1.1 + b * 0.7 + phase);
                const pick = hash(i * 3 + a, j * 3 + b, 40);
                const s = pick < 0.6 ? sw : swatches[(sw.band + (pick < 0.85 ? 1 : 2)) % 3];
                block(i + a / 3, j + b / 3, i + (a + 1) / 3, j + (b + 1) / 3, base, zt, s);
            }
        }
    }

    // Thin slabs with breathing gaps, each drifting a little off-axis
    function drawLayers(i, j, level, sw) {
        const h = level / 2;
        const floor = floorOf(i, j, h);
        const phase = hash(i, j, 17) * 6.28;
        const slabs = [];
        let zt = h;
        for (let k = 0; (k === 0 || zt > floor) && k < 8; k++) {
            const zb = k === 0 ? zt - 0.26 : Math.max(floor, zt - 0.26);
            const sway = k === 0 ? 0 : (k % 2 ? 1 : -1) * 0.06 * Math.sin(clock * 0.9 + phase);
            slabs.push([zb, zt, sway, k]);
            zt = zb - (0.1 + 0.06 * Math.sin(clock * 1.6 + phase + k * 0.8));
        }
        const alt = altOf(i, j, sw);
        for (let n = slabs.length - 1; n >= 0; n--) {
            const [zb, top, sway, k] = slabs[n];
            block(i + sway, j - sway, i + 1 + sway, j + 1 - sway, zb, top, k % 3 === 2 ? alt : sw);
        }
    }

    // 2x2 pillars dropped to random depths; the back one stays level for walking
    function drawPillars(i, j, level, sw) {
        const h = level / 2;
        const floor = Math.min(floorOf(i, j, h), h - 1);
        const alt = altOf(i, j, sw);
        const cells = [[0, 0], [1, 0], [0, 1], [1, 1]];
        for (const [a, b] of cells) {
            const drop = a + b === 0 ? 0 : 0.2 + Math.floor(hash(i * 2 + a, j * 2 + b, 22) * 4) * 0.2;
            const s = hash(i * 2 + a, j * 2 + b, 23) < 0.3 ? alt : sw;
            block(i + a / 2, j + b / 2, i + (a + 1) / 2, j + (b + 1) / 2, floor, h - drop, s);
        }
    }

    // Nested terraces narrowing to a small summit
    function drawSteps(i, j, level, sw) {
        const h = level / 2;
        const floor = floorOf(i, j, h);
        const alt = altOf(i, j, sw);
        const tiers = 2 + Math.floor(hash(i, j, 24) * 2);
        for (let k = 0; k < tiers; k++) {
            const inset = k * 0.12;
            const zt = h - (tiers - 1 - k) * 0.22;
            const zb = k === 0 ? Math.min(floor, zt - 0.22) : zt - 0.22;
            block(i + inset, j + inset, i + 1 - inset, j + 1 - inset, zb, zt, k % 2 ? alt : sw);
        }
    }

    // A slab hovering over its own tile
    function drawFloat(i, j, level, sw) {
        drawPlain(i, j, level, sw);
        const h = level / 2;
        block(i + 0.04, j + 0.04, i + 0.96, j + 0.96, h + floatLift(i, j) - 0.3, h + floatLift(i, j), altOf(i, j, sw));
    }

    const DRAW = [drawPlain, drawVoxel, drawLayers, drawPillars, drawSteps, drawFloat];

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);

        const camX = camera.x + drag.x, camY = camera.y + drag.y;
        const halfW = TW / 2, halfH = TH / 2;
        const d0 = Math.floor((camX - W / 2) / halfW) - 2;
        const d1 = Math.ceil((camX + W / 2) / halfW) + 2;
        const s0 = Math.floor((camY - H / 2) / halfH) - 3;
        const s1 = Math.ceil((camY + H / 2 + (MAX_LEVEL / 2 + 1) * ZU) / halfH) + 2;

        // The climber is drawn right after the later of its two cells so nearer blocks occlude it
        const cs = Math.max(climber.fi + climber.fj, climber.ti + climber.tj);
        const cd = climber.ti + climber.tj >= climber.fi + climber.fj
            ? climber.ti - climber.tj : climber.fi - climber.fj;

        for (let s = s0; s <= s1; s++) {
            const rowTop = s * halfH - camY + H / 2;
            for (let d = d0; d <= d1; d++) {
                if (((s + d) & 1) !== 0) continue;
                const i = (s + d) >> 1, j = (s - d) >> 1;
                const cell = cellAt(i, j), level = cell & 31;
                if (rowTop - (level / 2 + 1) * ZU <= H) DRAW[cell >> 5](i, j, level, palette[level]);
                if (s === cs && d === cd) drawClimber();
            }
        }
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

        // Start on a random tile and snap the camera to it
        const i = Math.floor(Math.random() * 2000) - 1000;
        const j = Math.floor(Math.random() * 2000) - 1000;
        climber.fi = climber.ti = i;
        climber.fj = climber.tj = j;
        climber.t = 1;
        climber.land = 0;
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
        cellCache.clear();
    }

    if (canvas.classList.contains('active')) {
        init();
    }
})();
