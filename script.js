/* =========================================================
   Waves + Fish + Comets animation
   ── smoother; comet has glow+gradient tail, fish keep outline
      + "magnet" mouse‑repulsion on wave particles
   ── responsive: scales correctly on devices with different DPRs
   ========================================================= */

   class Particle {
    constructor(x, z) {
        this.baseX = x;
        this.baseZ = z;
        this.ox = this.oy = this.vx = this.vy = 0;
        this.size = 1.1;
    }
    impulse(dx, dy, f) {
        const d = Math.hypot(dx, dy);
        if (!d) return;
        this.vx += (dx / d) * f;
        this.vy += (dy / d) * f;
    }
    update(t, rX, rY) {
        /* wave form */
        const baseF = 0.015, tS = 0.03;
        let waveY = Math.sin(this.baseZ * baseF + t * tS) * 22 +
                    Math.sin(this.baseX * baseF + t * tS * 1.2) * 14;

        /* spring decay from splashes */
        this.ox += this.vx; this.oy += this.vy;
        this.vx = (this.vx - this.ox * 0.05) * 0.9;
        this.vy = (this.vy - this.oy * 0.05) * 0.9;

        /* rotate + perspective */
        let rx = this.baseX + this.ox,
            ry = waveY   + this.oy,
            rz = this.baseZ;

        const cY = Math.cos(rY), sY = Math.sin(rY);
        [rx, rz] = [rx * cY - rz * sY, rx * sY + rz * cY];

        const cX = Math.cos(rX), sX = Math.sin(rX);
        [ry, rz] = [ry * cX - rz * sX, ry * sX + rz * cX];

        const view = 2000, sc = Math.max(0, Math.min(1, (view - rz) / view));
        const cx = canvas.width / (2 * dpr), cy = canvas.height * 0.4 / dpr;
        this.screenX = cx + rx * sc;
        this.screenY = cy + ry * sc;
        this.size    = 1.1 * sc;
        
        // Calculate base alpha with perspective
        this.alpha = sc * 0.9;
        
        // Adjust the fade-out to be more subtle across the extended canvas
        // Start the fade at 60% of the way down (40% of the screen is still fully visible)
        const fadeStartY = canvas.height * 0.6 / dpr;
        const fadeEndY = canvas.height * 0.95 / dpr;  // Extend the fade almost to the bottom
        
        // Apply fade-out if particle is in the bottom fade zone
        if (this.screenY > fadeStartY) {
            // Calculate how far into the fade zone (0 to 1)
            const fadePercent = (this.screenY - fadeStartY) / (fadeEndY - fadeStartY);
            // Apply softer exponential fade for a more gradual effect
            this.alpha *= Math.max(0, 1 - Math.pow(fadePercent, 4));
        }

        /* ~~~~~ mouse‑repulsion ("magnet") ~~~~~ */
        if (mouse.x !== undefined) {
            const dx = this.screenX - mouse.x,
                  dy = this.screenY - mouse.y,
                  dist = Math.hypot(dx, dy),
                  radius = 50;
            if (dist < radius && dist > 0) {
                const force = (1 - dist / radius) * 5;
                this.screenX += (dx / dist) * force * 9;
                this.screenY += (dy / dist) * force * 9;
            }
        }
    }
    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, this.size, 0, 2 * Math.PI);
        ctx.fill();
    }
}

class Fish {
    constructor(dir) {
        this.dir = dir; this.start = time;
        this.depth = 0.2 + Math.random() * 0.8;
        const sky = canvas.height * 0.15 / dpr,
              mid = canvas.height * 0.45 / dpr,
              high = Math.random() < 0.5;
        this.y0 = high ? sky + this.depth * 120
                       : mid + (this.depth - 0.5) * 160;

        const baseDist = canvas.width * (0.12 + 0.08 * this.depth) / dpr;
        this.totalX = baseDist * (2.5 + Math.random() * 3);
        const pxPerFr = 6 + Math.random() * 2;
        this.dur = this.totalX / pxPerFr;

        this.apex = Math.random() < 0.5 ? 80 : 30;
        this.scale = Math.min(1.3, Math.max(0.3, this.y0 / (canvas.height * 0.5 / dpr)));

        this.x0   = dir === 1 ? -30 : canvas.width / dpr + 30;
        this.endX = this.x0 + this.dir * this.totalX;

        this.trail = Array(8).fill(null); this.tp = 0;
    }
    update() {
        const t = time - this.start;
        if (t > this.dur) return false;
        const p = t / this.dur;
        this.x = this.x0 + this.dir * this.totalX * p;
        this.y = this.y0 - Math.sin(Math.PI * p) * this.apex;

        const slot = this.tp & 7;
        this.trail[slot] ||= { x: 0, y: 0 };
        this.trail[slot].x = this.x;
        this.trail[slot].y = this.y;
        this.tp++;
        return true;
    }
    draw(ctx) {
        for (let i = 0; i < 8; i++) {
            const idx = (this.tp - i - 1 + 64) & 7,
                  pt  = this.trail[idx];
            if (!pt) continue;
            const a = (8 - i) / 8;
            ctx.globalAlpha = a * 0.6;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2 * this.scale, 0, 2 * Math.PI);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        if (this.dir === -1) ctx.rotate(Math.PI);
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-12, 6);
        ctx.lineTo(-12, -6);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 0.7 / this.scale;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.stroke();
        ctx.restore();
    }
}

class Splash {
    constructor(x, y, maxR = 200) { this.x = x; this.y = y; this.r = 6; this.maxR = maxR; }
    update() {
        this.r += 5;
        particles.forEach(p => {
            const dx = p.screenX - this.x, dy = p.screenY - this.y, d = Math.hypot(dx, dy);
            if (d && d < this.r) p.impulse(dx, dy, (1 - d / this.r) * 4);
        });
        return this.r < this.maxR;
    }
    draw() {}
}

// Variables for the main wave/fish animation
let canvas, ctx; const particles = [], fishes = [], splashes = [];
let time = 0;
const ROT_X = 0.5, ROT_Y = 0.0;
const mouse = { x: undefined, y: undefined };
const dpr = window.devicePixelRatio || 1;

function init() {
    canvas = document.getElementById('particleCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return; // Exit if canvas not found
    }
    
    ctx = canvas.getContext('2d');
    
    // Set height to 130% of window height to extend waves into journey section
    const extendedHeight = window.innerHeight * 1.3;
    
    // set size for high-DPR devices
    canvas.width = window.innerWidth * dpr;
    canvas.height = extendedHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${extendedHeight}px`;
    
    ctx.scale(dpr, dpr);

    // Clear existing arrays
    splashes.length = 0;
    fishes.length = 0;
    particles.length = 0;

    const spacing = 30, depth = 4000,
          width = canvas.width * 3 / dpr, startX = -width / 2;

    for (let z = -1000; z < depth; z += spacing)
        for (let x = 0; x < width; x += spacing)
            particles.push(new Particle(startX + x, z));

    particles.sort((a, b) => b.baseZ - a.baseZ);
}

function animate() {
    if (!canvas || !ctx) {
        console.error('Canvas or context not initialized');
        requestAnimationFrame(animate);
        return;
    }
    
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    time++;
    
    // Update and draw particles
    particles.forEach(p => {
        p.update(time, ROT_X, ROT_Y);
        p.draw(ctx);
    });

    // Add fish
    if (Math.random() < 0.006) fishes.push(new Fish(Math.random() < 0.5 ? 1 : -1));

    // Update and draw fish
    for (let i = fishes.length - 1; i >= 0; i--)
        if (!fishes[i].update()) {
            splashes.push(new Splash(fishes[i].endX, fishes[i].y0, 40 * fishes[i].scale));
            fishes.splice(i, 1);
        } else fishes[i].draw(ctx);

    // Update splashes
    for (let i = splashes.length - 1; i >= 0; i--)
        if (!splashes[i].update()) splashes.splice(i, 1);

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    // adjust for new size and DPR
    const extendedHeight = window.innerHeight * 1.3;
    
    canvas.width = window.innerWidth * dpr;
    canvas.height = extendedHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${extendedHeight}px`;
    ctx.scale(dpr, dpr);

    particles.length = fishes.length = splashes.length = 0;
    init();
});

// Update mouse tracking to check if mouse is within the canvas area
window.addEventListener('mousemove', e => {
    // Check if canvas exists before proceeding
    if (!canvas) return;
    
    // Only track the mouse if it's actually over the canvas element
    const canvasRect = canvas.getBoundingClientRect();
    if (
        e.clientX >= canvasRect.left && 
        e.clientX <= canvasRect.right &&
        e.clientY >= canvasRect.top && 
        e.clientY <= canvasRect.bottom
    ) {
        // Mouse is inside the canvas area, track its position relative to the canvas
        // Immediately update position on mouse entry or movement
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    } else {
        // Mouse is outside the canvas area, clear its position
        mouse.x = undefined;
        mouse.y = undefined;
    }
});

// Initialize event listeners in a separate function
function initEventListeners() {
    if (!canvas) return;
    
    // Make sure to clear mouse position when leaving the canvas specifically
    canvas.addEventListener('mouseleave', () => { 
        mouse.x = mouse.y = undefined; 
    });
    
    // Immediately capture mouse position when entering canvas
    canvas.addEventListener('mouseenter', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
}

document.addEventListener('DOMContentLoaded', () => { 
    init(); 
    animate();
    initEventListeners(); 
});
