'use client';

import { useEffect } from 'react';
import * as THREE from 'three';

interface Props { onExit: () => void; }

/* ─────────────────────────────────────────────
   Custom styles that can't be expressed purely
   in Tailwind utility classes (canvas positioning,
   glassmorphism, gradient-text, timeline track, etc.)
───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --bg: #030712;
    --accent: #38bdf8;
    --accent-2: #818cf8;
    --glow: rgba(56, 189, 248, 0.25);
    --border-line: rgba(255, 255, 255, 0.08);
  }

  /* Scoped CSS overrides for Modern Theme to prevent global CSS interference */
  #mt-root {
    font-family: 'Plus Jakarta Sans', sans-serif !important;
    background-color: #030712 !important;
    color: #f1f5f9 !important;
    overflow-x: hidden;
    min-height: 100vh;
    position: relative;
    -webkit-font-smoothing: antialiased;
  }

  #mt-root * { box-sizing: border-box; }
  #mt-root ::selection { background: rgba(56, 189, 248, 0.3); color: #7dd3fc; }

  /* Canvas layers — strictly behind all page content */
  #mt-plexus {
    position: fixed; inset: 0;
    pointer-events: none; z-index: 0; opacity: 0.65;
  }
  #mt-canvas-container {
    position: fixed; inset: 0;
    pointer-events: none; z-index: 0;
  }
  #mt-three-canvas { width: 100vw; height: 100vh; display: block; }

  /* Content wrapper — isolates its own stacking context above canvas */
  #mt-content-wrap {
    position: relative;
    z-index: 10;
    isolation: isolate;
  }

  /* Cursor glow */
  #mt-cursor-glow {
    position: fixed;
    width: 480px;
    height: 480px;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle, rgba(56,189,248,0.07) 0%, rgba(129,140,248,0.03) 45%, transparent 70%);
    transform: translate(-50%, -50%);
    z-index: 2;
    transition: opacity 0.3s ease;
  }

  /* Glassmorphism card */
  #mt-root .mt-glass {
    background: rgba(13, 18, 30, 0.65) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255, 255, 255, 0.07) !important;
    box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1) !important;
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
  #mt-root .mt-glass:hover {
    border-color: rgba(56, 189, 248, 0.35) !important;
    box-shadow: 0 24px 60px -15px rgba(56,189,248,0.18), inset 0 1px 0 rgba(255,255,255,0.2) !important;
    transform: translateY(-4px) !important;
  }

  /* Gradient text */
  #mt-root .mt-gradient-text {
    background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%) !important;
    -webkit-background-clip: text !important;
    background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }
  #mt-root .mt-gradient-accent {
    background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%) !important;
    -webkit-background-clip: text !important;
    background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
  }

  /* Timeline */
  #mt-root .mt-timeline-track { position: relative; }
  #mt-root .mt-timeline-track::before {
    content: '';
    position: absolute;
    left: 23px;
    top: 10px;
    bottom: 10px;
    width: 2px;
    background: linear-gradient(180deg, #38bdf8, #818cf8 60%, rgba(255,255,255,0.05));
  }

  /* Syne display font */
  #mt-root .mt-font-display { font-family: 'Syne', sans-serif !important; }
  #mt-root .mt-font-mono { font-family: 'JetBrains Mono', monospace !important; }

  /* Scroll progress */
  #mt-scroll-progress {
    position: fixed; top: 0; left: 0; height: 2px;
    background: linear-gradient(to right, #38bdf8, #818cf8, #c084fc);
    z-index: 9999; transition: width 0.15s ease-out;
    box-shadow: 0 0 8px rgba(56,189,248,0.7);
  }

  /* Floating nav — above everything */
  #mt-nav {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    z-index: 9000; max-width: 36rem; width: 92%; white-space: nowrap;
  }
  @media (min-width: 640px) { #mt-nav { width: auto; } }

  /* Ping animation */
  @keyframes mt-ping {
    75%, 100% { transform: scale(2); opacity: 0; }
  }
  #mt-root .mt-animate-ping {
    animation: mt-ping 1s cubic-bezier(0,0,0.2,1) infinite;
  }

  /* Exit button */
  #mt-exit-btn {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #f87171;
    background: rgba(248,113,113,0.1);
    border: 1px solid rgba(248,113,113,0.3);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  #mt-exit-btn:hover { background: #ef4444; color: white; }
`;

export function ModernThemePortfolio({ onExit }: Props) {
  useEffect(() => {
    // ── 1. 2D Plexus Wave ──
    const plexus = document.getElementById('mt-plexus') as HTMLCanvasElement | null;
    let plexusAnimId = 0;
    const mouse = { x: -1000, y: -1000 };

    const onMouseMoveAll = (e: MouseEvent) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      const g = document.getElementById('mt-cursor-glow');
      if (g) { g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; }
    };
    window.addEventListener('mousemove', onMouseMoveAll);

    type Pt = { x: number; y: number; vx: number; vy: number; r: number };
    let pts: Pt[] = [], W = 0, H = 0;

    if (plexus) {
      const ctx = plexus.getContext('2d')!;
      const resize = () => { W = plexus.width = innerWidth; H = plexus.height = innerHeight; };
      const initPts = () => {
        const n = Math.min(Math.round((W * H) / 22000), 75); pts = [];
        for (let i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.5 + 0.6 });
      };
      const onResize = () => { resize(); initPts(); };
      resize(); initPts();
      window.addEventListener('resize', onResize);

      const loop = () => {
        ctx.clearRect(0, 0, W, H);
        for (const p of pts) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          if (dx * dx + dy * dy < 10000) { p.x += dx * 0.02; p.y += dy * 0.02; }
        }
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const a = pts[i], b = pts[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 140) {
              ctx.strokeStyle = `rgba(56,189,248,${(1 - d / 140) * 0.22})`;
              ctx.lineWidth = 0.75; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
          ctx.beginPath(); ctx.fillStyle = 'rgba(129,140,248,0.45)'; ctx.arc(pts[i].x, pts[i].y, pts[i].r, 0, Math.PI * 2); ctx.fill();
        }
        plexusAnimId = requestAnimationFrame(loop);
      };
      loop();
    }

    // ── 2. Three.js Spatial Core ──
    const threeCanvas = document.getElementById('mt-three-canvas') as HTMLCanvasElement | null;
    let threeAnimId = 0;
    let renderer: THREE.WebGLRenderer | null = null;

    if (threeCanvas) {
      renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setSize(innerWidth, innerHeight);
      renderer.setClearColor(0x000000, 0); // fully transparent background

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
      camera.position.set(0, 0, 7.5);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight.position.set(5, 5, 4); scene.add(dirLight);
      scene.add(new THREE.AmbientLight(0x0f172a, 0.8));
      const pl1 = new THREE.PointLight(0x38bdf8, 2.5, 30); pl1.position.set(3, 2, 3); scene.add(pl1);
      const pl2 = new THREE.PointLight(0x818cf8, 2.2, 30); pl2.position.set(-3, -2, -1); scene.add(pl2);

      const sceneGroup = new THREE.Group(); scene.add(sceneGroup);

      // Central IcosahedronGeometry Core
      const coreMesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.2, 2),
        new THREE.MeshStandardMaterial({ color: 0x070b14, roughness: 0.15, metalness: 0.85 })
      );
      sceneGroup.add(coreMesh);
      // Outer holographic wireframe
      coreMesh.add(new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.38, 2),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.4 })
      ));

      // Orbiting quantum shards
      const shardsGroup = new THREE.Group();
      const shardGeo = new THREE.OctahedronGeometry(0.12);
      const shardMat = new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x38bdf8, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.7 });
      type SD = { radius: number; speed: number; offset: number; yAmp: number };
      const shardData: SD[] = [];
      for (let i = 0; i < 10; i++) {
        shardsGroup.add(new THREE.Mesh(shardGeo, shardMat));
        shardData.push({ radius: 1.8 + Math.random() * 0.6, speed: 0.008 + Math.random() * 0.01, offset: (i / 10) * Math.PI * 2, yAmp: 0.4 + Math.random() * 0.4 });
      }
      sceneGroup.add(shardsGroup);

      // Particle dust field
      const pPos = new Float32Array(650 * 3);
      for (let i = 0; i < 650; i++) { pPos[i * 3] = (Math.random() - 0.5) * 16; pPos[i * 3 + 1] = (Math.random() - 0.5) * 16; pPos[i * 3 + 2] = (Math.random() - 0.5) * 14; }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const particleField = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.024, transparent: true, opacity: 0.45 }));
      scene.add(particleField);

      // Scroll sync
      let scrollPct = 0;
      const onScroll = () => {
        const doc = document.documentElement, max = doc.scrollHeight - doc.clientHeight;
        scrollPct = max > 0 ? scrollY / max : 0;
        const bar = document.getElementById('mt-scroll-progress');
        if (bar) bar.style.width = (scrollPct * 100) + '%';
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      // Mouse influence
      let tX = 0, tY = 0;
      const onMMouse = (e: MouseEvent) => { tX = (e.clientX / innerWidth - 0.5) * 1.5; tY = (e.clientY / innerHeight - 0.5) * -1.5; };
      window.addEventListener('mousemove', onMMouse);

      const onResize3 = () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer!.setSize(innerWidth, innerHeight); };
      window.addEventListener('resize', onResize3);

      let time = 0;
      const animate = () => {
        threeAnimId = requestAnimationFrame(animate);
        time += 0.012;
        sceneGroup.rotation.y += 0.003;
        sceneGroup.rotation.x = Math.sin(time * 0.5) * 0.15;
        sceneGroup.position.x = 1.4 + Math.sin(scrollPct * Math.PI) * 0.8;
        sceneGroup.position.y = -scrollPct * 1.8;
        sceneGroup.position.z = Math.cos(scrollPct * Math.PI * 2) * 0.5;
        shardsGroup.children.forEach((shard, i) => {
          const d = shardData[i]; const a = time * (d.speed * 40) + d.offset;
          shard.position.x = Math.cos(a) * d.radius; shard.position.z = Math.sin(a) * d.radius;
          shard.position.y = Math.sin(a * 1.5) * d.yAmp;
          shard.rotation.x += 0.02; shard.rotation.y += 0.03;
        });
        particleField.rotation.y += 0.0006; particleField.rotation.x += 0.0003;
        camera.position.x += (tX - camera.position.x) * 0.04;
        camera.position.y += (tY - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
        renderer!.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(plexusAnimId); cancelAnimationFrame(threeAnimId);
        renderer?.dispose();
        window.removeEventListener('mousemove', onMouseMoveAll);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('mousemove', onMMouse);
        window.removeEventListener('resize', onResize3);
      };
    }

    return () => {
      cancelAnimationFrame(plexusAnimId);
      window.removeEventListener('mousemove', onMouseMoveAll);
    };
  }, []);

  return (
    <div id="mt-root">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* Canvas Background Layers */}
      <canvas id="mt-plexus" />
      <div id="mt-canvas-container">
        <canvas id="mt-three-canvas" />
      </div>
      <div id="mt-cursor-glow" />

      {/* Scroll Progress Bar */}
      <div id="mt-scroll-progress" style={{ width: '0%' }} />

      {/* ── Floating Navigation Dock ── */}
      <header id="mt-nav">
        <nav className="flex items-center justify-between sm:justify-center gap-1 sm:gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/80">
          <a href="#mt-hero" className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-all">About</a>
          <a href="#mt-skills" className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-all">Skills</a>
          <a href="#mt-projects" className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-all">Projects</a>
          <a href="#mt-experience" className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-all">Experience</a>
          <a href="#mt-contact" className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-sky-400 bg-sky-500/10 border border-sky-400/30 rounded-full hover:bg-sky-400 hover:text-slate-950 transition-all shadow-lg shadow-sky-500/20">Hire Me</a>
          <button id="mt-exit-btn" onClick={onExit}>✕ Exit</button>
        </nav>
      </header>

      {/* ── Main Content (isolated stacking context above canvas) ── */}
      <div id="mt-content-wrap">
      <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-32 pb-24 space-y-36">

        {/* HERO */}
        <section id="mt-hero" className="min-h-[80vh] flex flex-col justify-center items-start pt-8">
          {/* Available badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-sky-400/30 shadow-inner shadow-sky-500/10 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="mt-animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="mt-font-mono text-xs font-medium text-slate-300 uppercase tracking-wider">Available for Roles &amp; AI Contracts</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl mt-font-display font-extrabold tracking-tight mb-6">
            <span className="mt-gradient-text">Chiranjeeb</span> <br className="hidden sm:inline" />
            <span className="mt-gradient-accent">Dash.</span>
          </h1>

          <p className="text-lg sm:text-2xl text-slate-300 font-light max-w-3xl leading-relaxed mb-6">
            Full Stack <span className="font-medium text-white underline decoration-sky-400/50 underline-offset-4">MERN Engineer</span> &amp;{' '}
            <span className="font-medium text-white underline decoration-indigo-400/50 underline-offset-4">AI Agent Builder</span> orchestrating autonomous agents, real-time architectures, and production cloud systems.
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-normal mb-10">
            B.Tech Computer Science graduate based in Bhubaneswar. Specializing in modern React, Next.js 15+, LangChain.js agentic flows, distributed APIs, and performant user interfaces.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-16">
            <a href="#mt-projects" className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-300 hover:to-indigo-400 text-slate-950 font-bold text-sm tracking-wide shadow-xl shadow-sky-500/20 hover:shadow-sky-500/40 transform hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <span>Explore Shipped Work</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
            <a href="https://github.com/Chiranjeeb-Dash-Git" target="_blank" rel="noopener" className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 text-white font-medium text-sm flex items-center gap-2.5 transition-all">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.14c-3.2.7-3.87-1.34-3.87-1.34-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.42.36.78 1.08.78 2.18v3.23c0 .3.21.66.79.55C20.71 21.38 24 17.07 24 12 24 5.65 18.85.5 12 .5z"/></svg>
              GitHub Profile
            </a>
            <a href="https://www.linkedin.com/in/chiranjeeb-dash-/" target="_blank" rel="noopener" className="px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 text-white font-medium text-sm flex items-center gap-2.5 transition-all">
              <svg className="w-4 h-4 fill-sky-400" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
              LinkedIn
            </a>
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-8 border-t border-white/5">
            {[
              { n: '8+', l: 'Shipped Fullstack Apps', c: 'text-sky-400' },
              { n: '3+', l: 'Agentic AI Workflows', c: 'text-indigo-400' },
              { n: '100%', l: 'Full-Cycle Delivery', c: 'text-purple-400' },
              { n: 'B.Tech', l: 'Computer Science & Eng', c: 'text-emerald-400' },
            ].map(m => (
              <div key={m.l} className="mt-glass p-4 rounded-2xl">
                <div className={`text-3xl mt-font-display font-extrabold ${m.c}`}>{m.n}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">{m.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SKILLS */}
        <section id="mt-skills" className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <p className="mt-font-mono text-xs text-sky-400 tracking-wider uppercase mb-2">Technical Mastery</p>
              <h2 className="text-3xl sm:text-5xl mt-font-display font-bold text-white">Stack &amp; Ecosystem</h2>
            </div>
            <p className="text-slate-400 text-sm max-w-md">From foundational database design and real-time state machines to autonomous LLM routing pipelines.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'FE', label: 'Frontend Core', ic: 'text-sky-400 bg-sky-500/10 border-sky-400/20', gc: 'bg-sky-500/10 group-hover:bg-sky-500/20', ac: 'bg-sky-500/10 border-sky-400/30 text-sky-300', tags: ['React.js','Next.js 15+','JavaScript (ES6+)','TypeScript','Tailwind CSS','Material UI','Bootstrap'], hi: 1 },
              { id: 'BE', label: 'Backend Systems', ic: 'text-indigo-400 bg-indigo-500/10 border-indigo-400/20', gc: 'bg-indigo-500/10 group-hover:bg-indigo-500/20', ac: 'bg-indigo-500/10 border-indigo-400/30 text-indigo-300', tags: ['Node.js','Express.js','Socket.io','MongoDB','SQL / PostgreSQL','JWT & Bcrypt'], hi: 2 },
              { id: 'AI', label: 'AI & Automation', ic: 'text-purple-400 bg-purple-500/10 border-purple-400/20', gc: 'bg-purple-500/10 group-hover:bg-purple-500/20', ac: 'bg-purple-500/10 border-purple-400/30 text-purple-300', tags: ['LangChain.js','Agentic Orchestration','n8n Automation','Prompt Eng','Vector Search','STT / TTS Voice'], hi: 0 },
              { id: 'OPS', label: 'Cloud & DevOps', ic: 'text-emerald-400 bg-emerald-500/10 border-emerald-400/20', gc: 'bg-emerald-500/10 group-hover:bg-emerald-500/20', ac: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300', tags: ['Docker','Git & GitHub CI/CD','Postman APIs','Vercel & Render','Linux CLI'], hi: -1 },
            ].map(sk => (
              <div key={sk.id} className="mt-glass rounded-3xl p-6 relative overflow-hidden group">
                <div className={`absolute -right-12 -top-12 w-32 h-32 ${sk.gc} rounded-full blur-2xl transition-all`} />
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mt-font-mono text-sm font-bold ${sk.ic}`}>{sk.id}</div>
                  <h3 className="text-lg font-bold text-white">{sk.label}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sk.tags.map((t, i) => (
                    <span key={t} className={`px-3 py-1.5 text-xs rounded-lg border ${i === sk.hi ? sk.ac + ' font-medium' : 'bg-white/5 border-white/10 text-slate-200'}`}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PROJECTS */}
        <section id="mt-projects" className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <p className="mt-font-mono text-xs text-sky-400 tracking-wider uppercase mb-2">Featured Deployments</p>
              <h2 className="text-3xl sm:text-5xl mt-font-display font-bold text-white">Production Works</h2>
            </div>
            <p className="text-slate-400 text-sm max-w-md">Live applications with production architectures, autonomous decision logic, and complex state management.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { badge: 'Flagship AI Agent', bc: 'bg-purple-500/15 border-purple-400/30 text-purple-300', gc: 'bg-purple-500/10 group-hover:bg-purple-500/20', hc: 'group-hover:text-purple-300', lc: 'text-purple-400 hover:text-purple-300', title: 'QuantumQuery AI Agent', desc: 'Autonomous decision-making engine built with Next.js and LangChain.js. Dynamically evaluates prompts to intelligently route queries between local vector store knowledge bases and live web search tools for synthesized real-time answers.', tags: ['Next.js','LangChain.js','TypeScript','Tool Calling'], link: 'https://quantum-query-ai-agent.vercel.app/', ll: 'Launch Live Agent' },
              { badge: 'FinTech Platform', bc: 'bg-sky-500/15 border-sky-400/30 text-sky-300', gc: 'bg-sky-500/10 group-hover:bg-sky-500/20', hc: 'group-hover:text-sky-300', lc: 'text-sky-400 hover:text-sky-300', title: 'Zerodha Kite Trading Ecosystem', desc: 'A comprehensive stock trading web ecosystem modeled after Zerodha Kite. Engineered live-updating order books, portfolio asset tracking, watchlists, and interactive analytics with real-time price updates.', tags: ['JavaScript','Market Data API','Chart.js','State Management'], link: 'https://chiranjeeb-dash-git.github.io/Zerodha-/', ll: 'Launch Live App' },
              { badge: 'Multi-Model GenAI', bc: 'bg-indigo-500/15 border-indigo-400/30 text-indigo-300', gc: 'bg-indigo-500/10 group-hover:bg-indigo-500/20', hc: 'group-hover:text-indigo-300', lc: 'text-indigo-400 hover:text-indigo-300', title: 'Multi-Model GenAI Assistant', desc: 'Production-ready conversational assistant equipped with multi-model LLM dynamic routing, token stream response handlers, and integrated speech-to-text / text-to-speech voice interfaces for hands-free workflow.', tags: ['Next.js','Express API','STT / TTS','Stream Handling'], link: 'https://full-stack-gen-ai-assistant.vercel.app/', ll: 'Launch Live Assistant' },
              { badge: 'Full Stack Marketplace', bc: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300', gc: 'bg-emerald-500/10 group-hover:bg-emerald-500/20', hc: 'group-hover:text-emerald-300', lc: 'text-emerald-400 hover:text-emerald-300', title: 'Airbnb Global Stay Network', desc: 'Full-scale property rental booking platform with geospatial search, interactive Mapbox integration, Cloudinary image upload pipelines, review scoring, and transactional booking verification.', tags: ['Node & Express','MongoDB Atlas','Mapbox SDK','Cloudinary'], link: 'https://airbnb-global-stay-network.onrender.com/', ll: 'Launch Live App' },
            ].map(p => (
              <div key={p.title} className="mt-glass rounded-3xl p-7 flex flex-col justify-between group relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-44 h-44 ${p.gc} rounded-bl-full blur-3xl pointer-events-none transition-all`} />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs mt-font-mono border ${p.bc}`}>{p.badge}</span>
                    <a href={p.link} target="_blank" rel="noopener" className="text-slate-400 group-hover:text-sky-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                  </div>
                  <h3 className={`text-2xl font-bold text-white ${p.hc} transition-colors mb-2`}>{p.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">{p.desc}</p>
                </div>
                <div>
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                    {p.tags.map(t => <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-white/5 text-slate-300">{t}</span>)}
                  </div>
                  <a href={p.link} target="_blank" rel="noopener" className={`mt-5 inline-flex items-center gap-2 text-xs font-semibold ${p.lc}`}>
                    <span>{p.ll}</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Compact project list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {[
              { sub: 'Reddit Architecture', title: 'Social Platform', desc: 'Next.js, TypeScript, Reddit-style communities & voting.', link: 'https://social-media-platform-azure-ten.vercel.app/' },
              { sub: 'Productivity SaaS', title: 'Document Manager', desc: 'Full-stack digital file organizing, tagging and parsing engine.', link: 'https://document-manager-quo8.vercel.app/' },
              { sub: 'Enterprise Tool', title: 'Smart ERP Platform', desc: 'Next.js enterprise resource tracking and supply chain dashboard.', link: 'https://smart-naff5gjfr-chiranjeeb-dash-gits-projects.vercel.app/' },
              { sub: 'InsurTech', title: 'Insurance Hub', desc: 'React policy comparison, quote calculation, and claims tracking.', link: 'https://insuranceplatform-rho.vercel.app/' },
            ].map(p => (
              <a key={p.title} href={p.link} target="_blank" rel="noopener" className="mt-glass p-5 rounded-2xl group block hover:border-sky-400/40">
                <div className="mt-font-mono text-xs text-slate-400 mb-1">{p.sub}</div>
                <h4 className="text-base font-bold text-white group-hover:text-sky-300 flex items-center justify-between">
                  {p.title}<span className="text-slate-500 group-hover:text-sky-400">↗</span>
                </h4>
                <p className="text-xs text-slate-400 mt-2">{p.desc}</p>
              </a>
            ))}
          </div>
        </section>

        {/* EXPERIENCE & EDUCATION */}
        <section id="mt-experience" className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Experience */}
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <p className="mt-font-mono text-xs text-sky-400 tracking-wider uppercase mb-1">Career Path</p>
              <h2 className="text-3xl mt-font-display font-bold text-white">Experience</h2>
            </div>
            <div className="relative mt-timeline-track pl-10 space-y-8">
              {[
                { dot: 'border-sky-400 group-hover:shadow-[0_0_12px_#38bdf8]', dc: 'text-sky-400', date: '10/2024 — 04/2025', role: 'Software Development Trainee (Full Stack MERN)', co: 'Apna College', desc: 'Intensive full-stack software development residency covering MERN architectural design patterns, database indexing, REST APIs, state normalization, and full-cycle deployments.' },
                { dot: 'border-indigo-400 group-hover:shadow-[0_0_12px_#818cf8]', dc: 'text-indigo-400', date: 'Internship', role: 'Web Development Intern', co: 'Mentornix Pvt Ltd', desc: 'Constructed reusable front-end component libraries and integrated third-party REST microservices for client applications.' },
                { dot: 'border-purple-400 group-hover:shadow-[0_0_12px_#c084fc]', dc: 'text-purple-400', date: 'Internship', role: 'Full Stack Web Development Intern', co: 'Octanet Services Pvt Ltd', desc: 'Engineered responsive web modules, resolved cross-browser compatibility issues, and integrated database schema migrations.' },
              ].map(e => (
                <div key={e.role} className="relative group">
                  <div className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 ${e.dot} group-hover:scale-125 transition-all`} />
                  <div className="mt-glass p-5 rounded-2xl">
                    <span className={`mt-font-mono text-xs ${e.dc}`}>{e.date}</span>
                    <h3 className="text-lg font-bold text-white mt-1">{e.role}</h3>
                    <p className="text-sm font-medium text-slate-300 mt-0.5">{e.co}</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <p className="mt-font-mono text-xs text-emerald-400 tracking-wider uppercase mb-1">Academics &amp; Badges</p>
              <h2 className="text-3xl mt-font-display font-bold text-white">Education &amp; Credentials</h2>
            </div>
            <div className="space-y-4">
              <div className="mt-glass p-5 rounded-2xl">
                <span className="mt-font-mono text-xs text-emerald-400">2022 — 2024</span>
                <h3 className="text-lg font-bold text-white mt-1">B.Tech in Computer Science &amp; Engineering</h3>
                <p className="text-sm text-slate-300">Biju Patnaik University of Technology (BPUT), Odisha</p>
                <p className="text-xs text-slate-400 mt-2">Comprehensive coursework in Algorithms, Data Structures, Database Systems, Computer Networks, and Cloud Computing.</p>
              </div>
              <div className="mt-glass p-5 rounded-2xl">
                <span className="mt-font-mono text-xs text-slate-400">2019 — 2021</span>
                <h3 className="text-lg font-bold text-white mt-1">Diploma in Engineering</h3>
                <p className="text-sm text-slate-300">Central Institute of Petrochemical Engineering and Technology (CIPET)</p>
                <p className="text-xs text-slate-400 mt-2">Applied engineering foundations, project management, and mathematical analysis.</p>
              </div>
              <div className="pt-2">
                <h4 className="mt-font-mono text-xs text-slate-400 uppercase tracking-wider mb-3">Key Certifications</h4>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { label: 'Full Stack Web Development — MERN', c: 'border-sky-400/40 text-sky-300', ic: 'text-sky-400' },
                    { label: 'Production AI Agents with JS: LangChain & LangGraph', c: 'border-indigo-400/40 text-indigo-300', ic: 'text-indigo-400' },
                    { label: 'Mentornix Web Development Internship', c: 'border-emerald-400/40 text-emerald-300', ic: 'text-emerald-400' },
                  ].map(cert => (
                    <span key={cert.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border ${cert.c} text-xs font-medium`}>
                      <svg className={`w-3.5 h-3.5 ${cert.ic}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-2 5 2-1.5-8.5"/></svg>
                      {cert.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="mt-contact" className="space-y-10">
          <div className="mt-glass rounded-3xl p-8 sm:p-12 relative overflow-hidden text-center sm:text-left">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-2xl">
              <p className="mt-font-mono text-xs text-sky-400 tracking-wider uppercase mb-2">Initiate Collaboration</p>
              <h2 className="text-3xl sm:text-5xl mt-font-display font-extrabold text-white mb-4">{"Let's build something remarkable."}</h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
                {"Whether you need a dedicated full-stack software engineer or an autonomous AI agent architect to integrate cutting-edge LLMs into your product, let's connect."}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=chiranjeeb.email@gmail.com" target="_blank" rel="noopener" className="px-6 py-3.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  Send Email
                </a>
                <a href="tel:+917854943328" className="px-6 py-3.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-white font-medium text-sm transition-all flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  +91 78549 43328
                </a>
                <div className="px-4 py-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-slate-400 mt-font-mono text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/></svg>
                  Bhubaneswar, India
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-6 border-t border-white/5">
            <p>© 2025 Chiranjeeb Dash. Handcrafted with high precision.</p>
            <div className="flex items-center gap-6 mt-4 sm:mt-0">
              <a href="https://github.com/Chiranjeeb-Dash-Git" target="_blank" rel="noopener" className="hover:text-slate-300 transition-colors">GitHub</a>
              <a href="https://www.linkedin.com/in/chiranjeeb-dash-/" target="_blank" rel="noopener" className="hover:text-slate-300 transition-colors">LinkedIn</a>
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=chiranjeeb.email@gmail.com" target="_blank" rel="noopener" className="hover:text-slate-300 transition-colors">Email</a>
            </div>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}
