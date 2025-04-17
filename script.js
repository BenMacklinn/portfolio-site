class Particle {
    constructor(x, z) {
        this.baseX = x;
        this.baseZ = z;
        this.x = x;
        this.y = 0;
        this.z = z;
        this.size = 1.1;
    }

    update(time, rotationX, rotationY) {
        // Create grid-like wave motion
        const baseFrequency = 0.015;
        const timeScale = 0.03; // Much faster animation speed
        
        // Main wave motion
        this.y = Math.sin(this.baseZ * baseFrequency + time * timeScale) * 25 +
                 Math.sin(this.baseX * baseFrequency + time * timeScale * 1.2) * 15; // Slightly different speed for X waves

        // Apply 3D rotation
        let rotatedX = this.baseX;
        let rotatedY = this.y;
        let rotatedZ = this.baseZ;

        // Rotate around Y axis (left/right)
        const cosY = Math.cos(rotationY);
        const sinY = Math.sin(rotationY);
        const tempX = rotatedX;
        rotatedX = tempX * cosY - rotatedZ * sinY;
        rotatedZ = tempX * sinY + rotatedZ * cosY;

        // Rotate around X axis (up/down)
        const cosX = Math.cos(rotationX);
        const sinX = Math.sin(rotationX);
        const tempY = rotatedY;
        rotatedY = tempY * cosX - rotatedZ * sinX;
        rotatedZ = tempY * sinX + rotatedZ * cosX;

        // Apply perspective projection
        const perspective = 800;
        const viewDistance = 2000;
        
        // Calculate perspective position
        let scale = (viewDistance - rotatedZ) / viewDistance;
        scale = Math.max(0, Math.min(1, scale));
        
        // Center point for perspective
        const centerX = canvas.width / 2;
        const centerY = canvas.height * 0.5;
        
        // Apply perspective transformation
        this.screenX = centerX + rotatedX * scale;
        this.screenY = centerY + rotatedY * scale;
        
        // Strong mouse repulsion
        if (!isDragging && mouse.x !== undefined) {
            const dx = this.screenX - mouse.x;
            const dy = this.screenY - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 50; // Increased interaction radius
            
            if (distance < maxDistance) {
                const force = (1 - distance / maxDistance) * 2; // Stronger force
                this.screenX += dx * force;
                this.screenY += dy * force;
            }
        }
        
        // Calculate size and opacity based on depth
        this.size = 1.1 * scale;
        this.alpha = scale * 0.9;
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

let canvas, ctx;
const particles = [];
const mouse = { x: undefined, y: undefined };
let time = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let rotation = { x: 0.5, y: 0 };

function init() {
    canvas = document.getElementById('particleCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create grid of particles
    const spacing = 25; // Increased spacing for fewer particles
    const width = canvas.width * 3;
    const depth = 4000;
    
    // Center the grid
    const startX = -width / 2;
    
    // Create particles in a grid pattern
    for (let z = -1000; z < depth; z += spacing) {
        for (let x = 0; x < width; x += spacing) {
            particles.push(new Particle(startX + x, z));
        }
    }

    // Add mouse drag event listeners
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStart.x = e.clientX - rotation.y * 100;
        dragStart.y = e.clientY - rotation.x * 100;
    });

    window.addEventListener('mousemove', (e) => {
        // Update mouse position for repulsion
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        if (isDragging) {
            rotation.y = (e.clientX - dragStart.x) / 100;
            rotation.x = (e.clientY - dragStart.y) / 100;
            
            // Limit rotation angles
            rotation.x = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, rotation.x));
            rotation.y = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, rotation.y));
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    window.addEventListener('mouseleave', () => {
        isDragging = false;
        // Reset mouse position when leaving window
        mouse.x = undefined;
        mouse.y = undefined;
    });
}

function animate() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    time++;
    
    // Sort particles by z-coordinate for proper depth rendering
    particles.sort((a, b) => b.baseZ - a.baseZ);
    
    particles.forEach(particle => {
        particle.update(time, rotation.x, rotation.y);
        particle.draw(ctx);
    });
    
    requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles.length = 0;
    init();
});

// Initialize and start animation
document.addEventListener('DOMContentLoaded', () => {
    init();
    animate();
}); 