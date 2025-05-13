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
        /* wave form - reduced time scale for smoother movement */
        const baseF = 0.015, tS = 0.02; // Reduced tS from 0.03 to 0.02
        let waveY = Math.sin(this.baseZ * baseF + t * tS) * 22 +
                    Math.sin(this.baseX * baseF + t * tS * 1.2) * 14;

        /* spring decay from splashes - increased damping for smoother movement */
        this.ox += this.vx; this.oy += this.vy;
        this.vx = (this.vx - this.ox * 0.08) * 0.85; // Increased damping from 0.05 to 0.08, reduced multiplier from 0.9 to 0.85
        this.vy = (this.vy - this.oy * 0.08) * 0.85;

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

// Variables for the main wave/fish animation
let canvas, ctx; const particles = [], fishes = [], splashes = [];
let time = 0;
const ROT_X = 0.5, ROT_Y = 0.0;
const mouse = { x: undefined, y: undefined };
const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2 for better performance

function init() {
    canvas = document.getElementById('particleCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance
    
    // Set height to 130% of window height to extend waves into journey section
    const extendedHeight = window.innerHeight * 1.3;
    
    canvas.width = window.innerWidth * dpr;
    canvas.height = extendedHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${extendedHeight}px`;
    
    ctx.scale(dpr, dpr);

    // Clear existing arrays
    splashes.length = 0;
    fishes.length = 0;
    particles.length = 0;

    // Increase particle spacing for better performance
    const spacing = 35, // Increased from 30 to 35
          depth = 4000,
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
    
    // Use a darker background for better contrast and less ghosting
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    time++;
    
    // Update and draw particles
    particles.forEach(p => {
        p.update(time, ROT_X, ROT_Y);
        p.draw(ctx);
    });

    requestAnimationFrame(animate);
}

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
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing waves...');
    
    // Initialize immediately
    init();
    animate();
    initEventListeners();
    
    // Also try again after a short delay to ensure canvas is ready
    setTimeout(() => {
        console.log('Retrying wave initialization...');
        init();
        animate();
        initEventListeners();
    }, 100);
});

// Business Insights Animation Functions
function showInsights() {
    // First fade out hero content
    const heroContent = document.querySelector('.hero-content');
    heroContent.style.transition = 'opacity 800ms ease-out';
    heroContent.style.opacity = '0';
    
    // Get the wave canvas
    const waveCanvas = document.getElementById('particleCanvas');
    
    // Wait for fade out to complete before sliding in insights
    setTimeout(() => {
        // Slide waves down
        waveCanvas.style.transition = 'transform 1000ms ease-in-out';
        waveCanvas.style.transform = 'translateY(100%)';
        
        // Show insights section
        const insightsSection = document.getElementById('insights');
        insightsSection.style.visibility = 'visible';
        insightsSection.style.pointerEvents = 'auto';
        insightsSection.style.opacity = '1';
        insightsSection.style.transform = 'translateY(0)';
        
        // Prevent scrolling on the main content
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${window.scrollY}px`;

        // Enable scrolling on the insights section
        insightsSection.style.overflow = 'auto';
        insightsSection.style.overflowY = 'scroll';

        // Wait for waves to complete their transition before showing content
        setTimeout(() => {
            // Show header with fade and slide up
            const header = insightsSection.querySelector('.flex.justify-between');
            header.style.opacity = '1';
            header.style.transform = 'translateY(0)';
            
            // Show blog cards in sequence
            const blogCards = document.querySelectorAll('.blog-card');
            blogCards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 400 + (index * 200));
            });
        }, 500);
    }, 800);
}

function hideInsights() {
    // First fade out blog cards in reverse sequence
    const blogCards = document.querySelectorAll('.blog-card');
    blogCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(1rem)';
        }, (blogCards.length - 1 - index) * 200);
    });
    
    // Fade out header after cards
    setTimeout(() => {
        const header = document.querySelector('#insights .flex.justify-between');
        header.style.opacity = '0';
        header.style.transform = 'translateY(1rem)';
    }, blogCards.length * 200);

    // Wait for all cards to fade out before sliding out
    setTimeout(() => {
        // Slide out insights section
        const insightsSection = document.getElementById('insights');
        insightsSection.style.transform = 'translateY(-100%)';
        insightsSection.style.opacity = '0';
        insightsSection.style.pointerEvents = 'none';
        
        // Slide waves back up
        const waveCanvas = document.getElementById('particleCanvas');
        waveCanvas.style.transform = 'translateY(0)';
        
        // Restore scrolling on the main content
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        
        // Wait for waves to complete their transition before showing hero content
        setTimeout(() => {
            const heroContent = document.querySelector('.hero-content');
            heroContent.style.transition = 'opacity 800ms ease-in';
            heroContent.style.opacity = '1';
            
            // Reset insights section visibility after transition
            setTimeout(() => {
                insightsSection.style.visibility = 'hidden';
            }, 1000);
        }, 1000);
    }, (blogCards.length * 200) + 400);
}

// Add event listeners for insights section
document.addEventListener('DOMContentLoaded', () => {
    const insightsButton = document.querySelector('a[href="#insights"]');
    const closeInsightsButton = document.getElementById('closeInsights');
    const insightsSection = document.getElementById('insights');

    insightsButton.addEventListener('click', (e) => {
        e.preventDefault();
        showInsights();
    });

    closeInsightsButton.addEventListener('click', () => {
        hideInsights();
    });

    // Close insights when clicking outside the content area
    insightsSection.addEventListener('click', (e) => {
        if (e.target === insightsSection) {
            hideInsights();
        }
    });
});
