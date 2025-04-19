/* =========================================================
   Waves + Fish + Comets animation
   ── smoother; comet has glow+gradient tail, fish keep outline ──
   ========================================================= */

   class Particle {
    constructor(x, z) {
        this.baseX = x;
        this.baseZ = z;
        this.ox = this.oy = this.vx = this.vy = 0;
        this.size = 1.1;
    }
    impulse(dx, dy, f) { const d=Math.hypot(dx,dy); if(!d)return; this.vx+=(dx/d)*f; this.vy+=(dy/d)*f; }
    update(t,rX,rY){
        const baseF=0.015,tS=0.03;
        let waveY=Math.sin(this.baseZ*baseF+t*tS)*25+Math.sin(this.baseX*baseF+t*tS*1.2)*15;
        this.ox+=this.vx; this.oy+=this.vy;
        this.vx=(this.vx-this.ox*0.05)*0.9; this.vy=(this.vy-this.oy*0.05)*0.9;

        let rx=this.baseX+this.ox, ry=waveY+this.oy, rz=this.baseZ;
        const cY=Math.cos(rY), sY=Math.sin(rY); [rx,rz]=[rx*cY-rz*sY, rx*sY+rz*cY];
        const cX=Math.cos(rX), sX=Math.sin(rX); [ry,rz]=[ry*cX-rz*sX, ry*sX+rz*cX];

        const view=2000, sc=Math.max(0,Math.min(1,(view-rz)/view));
        const cx=canvas.width/2, cy=canvas.height*0.5;
        this.screenX=cx+rx*sc; this.screenY=cy+ry*sc;
        this.size=1.1*sc; this.alpha=sc*0.9;
    }
    draw(ctx){
        if(this.alpha<=0)return;
        ctx.fillStyle=`rgba(255,255,255,${this.alpha})`;
        ctx.beginPath(); ctx.arc(this.screenX,this.screenY,this.size,0,2*Math.PI); ctx.fill();
    }
}

/* -------- FISH (blue, white 8‑pt trail, white outline) -------- */
class Fish {
    constructor(dir){
        this.dir=dir; this.start=time; this.depth=0.2+Math.random()*0.8;
        const sky=canvas.height*0.15, mid=canvas.height*0.45, high=Math.random()<0.5;
        this.y0=high? sky+this.depth*120 : mid+(this.depth-0.5)*160;

        const baseDist=canvas.width*(0.12+0.08*this.depth);
        this.totalX=baseDist*(1.2+Math.random()*1.9);
        const pxPerFr=8+Math.random()*2; this.dur=this.totalX/pxPerFr;

        const hBase=high?50:30;
        this.apex=(hBase*this.depth+10)*(0.8+Math.random()*0.5);
        this.scale=Math.min(1.3,Math.max(0.3,this.y0/(canvas.height*0.5)));

        this.x0=dir===1?-30:canvas.width+30;
        this.endX=this.x0+this.dir*this.totalX;
        this.trail=new Array(8).fill(null); this.tp=0;
    }
    update(){
        const t=time-this.start; if(t>this.dur)return false;
        const p=t/this.dur;
        this.x=this.x0+this.dir*this.totalX*p;
        this.y=this.y0-Math.sin(Math.PI*p)*this.apex;

        const slot=this.tp&7; this.trail[slot]||(this.trail[slot]={x:0,y:0});
        this.trail[slot].x=this.x; this.trail[slot].y=this.y; this.tp++;
        return true;
    }
    draw(ctx){
        /* fading white dots */
        for(let i=0;i<8;i++){
            const idx=(this.tp-i-1+64)&7, pt=this.trail[idx]; if(!pt)continue;
            const a=(8-i)/8; ctx.globalAlpha=a*0.6;
            ctx.fillStyle='white';
            ctx.beginPath(); ctx.arc(pt.x,pt.y,2*this.scale,0,2*Math.PI); ctx.fill();
        }
        ctx.globalAlpha=1;
        /* blue body with thin white outline */
        ctx.save();
        ctx.translate(this.x,this.y); ctx.scale(this.scale,this.scale);
        if(this.dir===-1)ctx.rotate(Math.PI);
        ctx.fillStyle='#60a5fa';
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-12,6); ctx.lineTo(-12,-6); ctx.closePath(); ctx.fill();
        ctx.lineWidth=0.7/this.scale; ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.stroke();
        ctx.restore();
    }
}

/* ---------------- SPLASH ---------------- */
class Splash{
    constructor(x,y,maxR=200){this.x=x;this.y=y;this.r=6;this.maxR=maxR;}
    update(){
        this.r+=5;
        particles.forEach(p=>{
            const dx=p.screenX-this.x,dy=p.screenY-this.y,d=Math.hypot(dx,dy);
            if(d&&d<this.r)p.impulse(dx,dy,(1-d/this.r)*4);
        });
        return this.r<this.maxR;
    }
    draw(){}
}

/* ---------------- COMET (glow & gradient tail) ---------------- */
/* ---------------- COMET  – mystical multicolour tail ---------------- */
class Comet {
    constructor() {
        /* far‑back splash line */
        this.waterY   = canvas.height * 0.23;

        /* pick any X across the width */
        this.xImpact = canvas.width * 0.25 + Math.random() * canvas.width * 0.50;

        /* launch from the opposite side, fully off‑screen */
        const off     = canvas.width * 0.55;
        this.dir      = this.xImpact < canvas.width / 2 ? 1 : -1;
        this.x        = this.dir === 1 ? -off : canvas.width + off;
        this.y        = canvas.height * (0.05 + Math.random() * 0.05);

        /* constant velocity toward impact */
        const dx      = this.xImpact - this.x,
              dy      = this.waterY  - this.y,
              speed   = 18 + Math.random() * 9,
              mag     = Math.hypot(dx, dy);

        this.vx = (dx / mag) * speed;
        this.vy = (dy / mag) * speed;

        this.trail = [];
        this.alive = true;
    }

    /* -- step -------------------------------------------------------- */
    update() {
        if (!this.alive) return false;

        let nextX = this.x + this.vx,
            nextY = this.y + this.vy;

        /* clamp so splash happens *exactly* on the water‑line */
        if (nextY >= this.waterY) {
            const over  = nextY - this.waterY,
                  frac  = over / this.vy;
            nextX = this.x + this.vx * (1 - frac);
            nextY = this.waterY;
            splashes.push(new Splash(nextX, nextY, 220));
            this.alive = false;
        }

        this.x = nextX;
        this.y = nextY;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 25) this.trail.shift();

        return this.alive;
    }

    /* -- render ------------------------------------------------------ */
    draw(ctx) {
        /* mystical gradient tail */
        if (this.trail.length > 1) {
            const first = this.trail[0];
            const g = ctx.createLinearGradient(this.x, this.y, first.x, first.y);
            g.addColorStop(0.00, 'rgba(255,255,255,0.95)');   // white core
            g.addColorStop(0.25, '#a7f3d0');                  // mint‑green
            g.addColorStop(0.50, '#34d399');                  // emerald‑400
            g.addColorStop(0.75, '#38bdf8');                  // sky‑400
            g.addColorStop(1.00, 'rgba(59,130,246,0)');       // blue‑500 → transparent
            ctx.strokeStyle = g;
            ctx.lineWidth   = 2.2;

            ctx.beginPath();
            this.trail.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y)
                                            : ctx.moveTo(pt.x, pt.y));
            ctx.stroke();
        }

        /* glowing, slightly cyan head */
        ctx.save();
        ctx.shadowColor = 'rgba(125,211,252,0.8)';  // cyan glow
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = '#67e8f9';                // cyan‑300
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3.2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}

/* --------------- GLOBALS & INIT --------------- */
let canvas,ctx; const particles=[],fishes=[],comets=[],splashes=[]; let time=0;
const ROT_X=0.5, ROT_Y=0.0;

function init(){
    canvas=document.getElementById('particleCanvas'); ctx=canvas.getContext('2d');
    canvas.width=innerWidth; canvas.height=innerHeight;
    const spacing=25, depth=4000, width=canvas.width*3, startX=-width/2;
    for(let z=-1000;z<depth;z+=spacing)
        for(let x=0;x<width;x+=spacing) particles.push(new Particle(startX+x,z));
    particles.sort((a,b)=>b.baseZ-a.baseZ);
}

/* --------------- MAIN LOOP --------------- */
function animate(){
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    time++;

    particles.forEach(p=>{p.update(time,ROT_X,ROT_Y); p.draw(ctx);});

    if(Math.random()<0.009)  fishes.push(new Fish(Math.random()<0.5?1:-1));
    if(Math.random()<0.001) comets.push(new Comet());

    for(let i=fishes.length-1;i>=0;i--)
        if(!fishes[i].update()){
            splashes.push(new Splash(fishes[i].endX,fishes[i].y0,40*fishes[i].scale));
            fishes.splice(i,1);
        } else fishes[i].draw(ctx);

    for(let i=comets.length-1;i>=0;i--) if(!comets[i].update()) comets.splice(i,1); else comets[i].draw(ctx);
    for(let i=splashes.length-1;i>=0;i--) if(!splashes[i].update()) splashes.splice(i,1);

    requestAnimationFrame(animate);
}

/* --------------- RESIZE --------------- */
window.addEventListener('resize',()=>{
    canvas.width=innerWidth; canvas.height=innerHeight;
    particles.length=fishes.length=comets.length=splashes.length=0;
    init();
});

/* --------------- START --------------- */
document.addEventListener('DOMContentLoaded',()=>{init();animate();});
