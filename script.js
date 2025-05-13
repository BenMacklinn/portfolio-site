/* =========================================================
   Waves animation
   ── smoother; "magnet" mouse‑repulsion on wave particles
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
        const baseF = 0.015, tS = 0.015;
        let waveY = Math.sin(this.baseZ * baseF + t * tS) * 22 +
                    Math.sin(this.baseX * baseF + t * tS * 1.2) * 14;

        /* spring decay from splashes - increased damping for smoother movement */
        this.ox += this.vx; this.oy += this.vy;
        this.vx = (this.vx - this.ox * 0.08) * 0.9;
        this.vy = (this.vy - this.oy * 0.08) * 0.9;

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
        this.size    = 1.4 * sc;
        
        // Calculate base alpha with perspective
        this.alpha = sc * 0.9;
        
        // Adjust the fade-out to be more subtle across the extended canvas
        const fadeStartY = canvas.height * 0.6 / dpr;
        const fadeEndY = canvas.height * 0.95 / dpr;
        
        if (this.screenY > fadeStartY) {
            const fadePercent = (this.screenY - fadeStartY) / (fadeEndY - fadeStartY);
            this.alpha *= Math.max(0, 1 - Math.pow(fadePercent, 4));
        }

        /* mouse‑repulsion ("magnet") */
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
        ctx.fillStyle = `rgba(255,255,255,${this.alpha * 1.2})`;
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, this.size, 0, 2 * Math.PI);
        ctx.fill();
    }
}

// Variables for the wave animation
let canvas, ctx; const particles = [];
let time = 0;
const ROT_X = 0.5, ROT_Y = 0.0;
const mouse = { x: undefined, y: undefined };
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function init() {
    canvas = document.getElementById('particleCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    ctx = canvas.getContext('2d', { alpha: false });
    
    const extendedHeight = window.innerHeight * 1.3;
    
    canvas.width = window.innerWidth * dpr;
    canvas.height = extendedHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${extendedHeight}px`;
    
    ctx.scale(dpr, dpr);

    // Clear particles array
    particles.length = 0;

    const spacing = 50,
          // Increased depth from 3000 to 4500 to add 3 more rows
          depth = 4500,
          width = canvas.width * 2.5 / dpr, 
          startX = -width / 2;

    // Extended z-range to include more rows
    for (let z = -1200; z < depth; z += spacing)
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
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    time += 0.8;
    
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update(time, ROT_X, ROT_Y);
        p.draw(ctx);
    }

    requestAnimationFrame(animate);
}

function initEventListeners() {
    if (!canvas) return;
    
    canvas.addEventListener('mouseleave', () => { 
        mouse.x = mouse.y = undefined; 
    });
    
    canvas.addEventListener('mouseenter', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mousemove', e => {
        if (!canvas) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        if (
            e.clientX >= canvasRect.left && 
            e.clientX <= canvasRect.right &&
            e.clientY >= canvasRect.top && 
            e.clientY <= canvasRect.bottom
        ) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        } else {
            mouse.x = undefined;
            mouse.y = undefined;
        }
    });

    window.addEventListener('resize', () => {
        const extendedHeight = window.innerHeight * 1.3;
        
        canvas.width = window.innerWidth * dpr;
        canvas.height = extendedHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${extendedHeight}px`;
        ctx.scale(dpr, dpr);

        particles.length = 0;
        init();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing waves...');
    
    init();
    animate();
    initEventListeners();
    
    setTimeout(() => {
        console.log('Retrying wave initialization...');
        init();
        animate();
        initEventListeners();
    }, 100);
});

// Business Insights Animation Functions
function showInsights() {
    const heroContent = document.querySelector('.hero-content');
    heroContent.style.transition = 'opacity 800ms ease-out';
    heroContent.style.opacity = '0';
    
    const waveCanvas = document.getElementById('particleCanvas');
    
    setTimeout(() => {
        waveCanvas.style.transition = 'transform 1000ms ease-in-out';
        waveCanvas.style.transform = 'translateY(100%)';
        
        const insightsSection = document.getElementById('insights');
        insightsSection.style.visibility = 'visible';
        insightsSection.style.pointerEvents = 'auto';
        insightsSection.style.opacity = '1';
        insightsSection.style.transform = 'translateY(0)';
        
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }, 800);
}

function hideInsights() {
    const waveCanvas = document.getElementById('particleCanvas');
    const insightsSection = document.getElementById('insights');
    
    insightsSection.style.opacity = '0';
    insightsSection.style.transform = 'translateY(-100%)';
    insightsSection.style.pointerEvents = 'none';
    
    waveCanvas.style.transition = 'transform 1000ms ease-in-out';
    waveCanvas.style.transform = 'translateY(0)';
    
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        heroContent.style.transition = 'opacity 800ms ease-in';
        heroContent.style.opacity = '1';
    }, 1000);
}

// Blog overlay functions
function showBlogOverlay() {
    const blogOverlay = document.getElementById('blogOverlay');
    const blogOverlayContent = document.getElementById('blogOverlayContent');
    
    const blogCards = document.querySelectorAll('.blog-card');
    blogCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = card.querySelector('h3').textContent;
            const content = card.querySelector('.blog-content').innerHTML;
            
            // Set specific dates based on the blog post title
            let date = '';
            if (title === "Where Robotics Is Heading: Product or Service?") {
                date = "April 19, 2024";
            } else if (title === "Why I Started Building Outside of Class") {
                date = "April 3, 2024";
            }
            
            blogOverlayContent.innerHTML = `
                <div class="blog-header">
                    <div class="blog-author-image">
                        <img src="images/Profile.jpg" alt="Ben Macklin">
                    </div>
                    <h1 class="blog-title">${title}</h1>
                    <div class="blog-date">${date}</div>
                </div>
                <div class="blog-content-divider"></div>
                ${content}
            `;
            blogOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });
}

function hideBlogOverlay() {
    const blogOverlay = document.getElementById('blogOverlay');
    blogOverlay.classList.remove('active');
    document.body.style.overflow = '';
}
