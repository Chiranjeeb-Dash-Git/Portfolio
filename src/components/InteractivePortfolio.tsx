import { useEffect } from 'react';
import * as THREE from 'three';

export function InteractivePortfolio() {
  useEffect(() => {
    /* ---------- 1. Plexus 2D Canvas ---------- */
    var plexusCanvas = document.getElementById('plexus') as HTMLCanvasElement | null;
    var plexusCleanup: (() => void) | null = null;

    if (plexusCanvas) {
      var ctx = plexusCanvas.getContext('2d');
      if (ctx) {
        var W: number, H: number, pts: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
        var animId: number;

        var resizePlexus = function () {
          if (!plexusCanvas) return;
          W = plexusCanvas.width = window.innerWidth;
          H = plexusCanvas.height = window.innerHeight;
        };

        var makePoints = function () {
          var n = Math.round((W * H) / 16000);
          pts = [];
          for (var i = 0; i < n; i++) {
            pts.push({
              x: Math.random() * W,
              y: Math.random() * H,
              vx: (Math.random() - 0.5) * 0.25,
              vy: (Math.random() - 0.5) * 0.25,
              r: Math.random() * 1.4 + 0.6,
            });
          }
        };

        resizePlexus();
        makePoints();

        var onPlexusResize = function () {
          resizePlexus();
          makePoints();
        };

        window.addEventListener('resize', onPlexusResize);

        var D = 130;
        var c2d = ctx;
        var loopPlexus = function () {
          animId = requestAnimationFrame(loopPlexus);
          var acc = (window as any).CUR && (window as any).CUR.acc ? (window as any).CUR.acc : '215,219,226';
          c2d.clearRect(0, 0, W, H);
          pts.forEach(function (p) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
          });
          for (var i = 0; i < pts.length; i++) {
            for (var j = i + 1; j < pts.length; j++) {
              var a = pts[i],
                b = pts[j],
                dx = a.x - b.x,
                dy = a.y - b.y,
                d = Math.sqrt(dx * dx + dy * dy);
              if (d < D) {
                c2d.strokeStyle = 'rgba(' + acc + ',' + (1 - d / D) * 0.35 + ')';
                c2d.lineWidth = 0.6;
                c2d.beginPath();
                c2d.moveTo(a.x, a.y);
                c2d.lineTo(b.x, b.y);
                c2d.stroke();
              }
            }
          }
          pts.forEach(function (p) {
            c2d.beginPath();
            c2d.fillStyle = 'rgba(' + acc + ',.75)';
            c2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            c2d.fill();
          });
        };


        loopPlexus();

        plexusCleanup = function () {
          window.removeEventListener('resize', onPlexusResize);
          cancelAnimationFrame(animId);
        };
      }
    }

    /* ---------- 1b. Pen Handwriting Canvas Animation ---------- */
    var penCanvas = document.getElementById('name-canvas') as HTMLCanvasElement | null;
    var penNib = document.getElementById('pen-nib-el') as HTMLElement | null;
    var penWrap = document.getElementById('name-pen-wrap') as HTMLElement | null;
    var penRafId: number;
    var penTimeoutIds: ReturnType<typeof setTimeout>[] = [];

    if (penCanvas && penNib && penWrap) {
      var NAME_TEXT = 'Chiranjeeb Dash';
      var FONT_FAMILY = "'Dancing Script', 'Brush Script MT', 'Great Vibes', cursive";
      var LETTER_DELAY_MS = 100; // ms between each letter
      var HOLD_MS = 2800;        // ms to hold completed name
      var FADE_MS = 700;         // ms to fade out
      var PAUSE_MS = 350;        // ms gap before restart

      // Responsive font size: ~14% of panel width, clamped 80-160px
      function getFontSize() {
        var w = penWrap ? (penWrap.offsetWidth || 680) : 680;
        return Math.min(160, Math.max(80, Math.round(w * 0.14)));
      }

      // Vibrant poppy colors
      var GRAD_STOPS = [
        { pos: 0,    color: '#ffffff' },
        { pos: 0.25, color: '#ffd700' },
        { pos: 0.60, color: '#ff4500' },
        { pos: 1,    color: '#ff007f' },
      ];

      function resizePenCanvas() {
        if (!penCanvas || !penWrap) return;
        var dpr = window.devicePixelRatio || 1;
        var fs = getFontSize();
        var cssW = penWrap.offsetWidth || 680;
        var cssH = Math.round(fs * 1.25); // tight — just enough for descenders

        penCanvas.width  = Math.round(cssW * dpr);
        penCanvas.height = Math.round(cssH * dpr);
        penCanvas.style.width  = cssW + 'px';
        penCanvas.style.height = cssH + 'px';
      }

      function getGradient(ctx2d: CanvasRenderingContext2D, textWidth: number) {
        var g = ctx2d.createLinearGradient(0, 0, Math.max(textWidth, 500), 0);
        GRAD_STOPS.forEach(function(s) { g.addColorStop(s.pos, s.color); });
        return g;
      }

      function getLetterXPositions(ctx2d: CanvasRenderingContext2D): number[] {
        var dpr = window.devicePixelRatio || 1;
        var fs = getFontSize();
        ctx2d.font = 'bold ' + Math.round(fs * dpr) + 'px ' + FONT_FAMILY;
        var positions: number[] = [];
        var x = 10 * dpr;
        for (var i = 0; i < NAME_TEXT.length; i++) {
          positions.push(x / dpr);
          x += ctx2d.measureText(NAME_TEXT[i]).width;
        }
        positions.push(x / dpr);
        return positions;
      }

      resizePenCanvas();
      var penCtx = penCanvas.getContext('2d');

      if (penCtx) {
        var currentLetterCount = 0;
        var canvasAlpha = 1;
        var phase: 'writing' | 'holding' | 'fading' | 'pausing' = 'writing';
        var letterXPositions: number[] = [];
        var loopStarted = false;

        function drawLetters(count: number, alpha: number, glowBoost?: number) {
          if (!penCanvas || !penCtx) return;
          var dpr = window.devicePixelRatio || 1;
          var W = penCanvas.width;
          var H = penCanvas.height;
          var fs = getFontSize();

          penCtx.clearRect(0, 0, W, H);
          if (count === 0) return;

          penCtx.save();
          penCtx.globalAlpha = alpha;

          // Glow — boosted during hold pulse
          var blur = (24 + (glowBoost || 0) * 18) * dpr;
          penCtx.shadowColor = '#ff4500';
          penCtx.shadowBlur = blur;

          var fontSizeScaled = Math.round(fs * dpr);
          penCtx.font = 'bold ' + fontSizeScaled + 'px ' + FONT_FAMILY;
          penCtx.fillStyle = getGradient(penCtx, W);
          penCtx.textBaseline = 'alphabetic';

          var sub = NAME_TEXT.substring(0, count);
          penCtx.fillText(sub, Math.round(10 * dpr), Math.round(H * 0.80));

          penCtx.restore();
        }

        function movePenNib(letterIdx: number, alpha: number) {
          if (!penNib || !penWrap || !penCanvas) return;
          var wrapRect = penWrap.getBoundingClientRect();
          var canvRect = penCanvas.getBoundingClientRect();
          if (!letterXPositions.length) return;
          var xInCanvas = letterXPositions[Math.min(letterIdx, letterXPositions.length - 1)];
          var left = (canvRect.left - wrapRect.left) + xInCanvas - 8;
          var top  = (canvRect.top  - wrapRect.top)  + penCanvas.offsetHeight * 0.05;
          penNib.style.left      = left + 'px';
          penNib.style.top       = top  + 'px';
          penNib.style.opacity   = String(alpha);
          var rot = -20 + (letterIdx / NAME_TEXT.length) * 8;
          penNib.style.transform = 'rotate(' + rot + 'deg) scale(' + (1.1 + alpha * 0.1) + ')';
        }

        function startWritingLoop() {
          if (loopStarted || !penCtx || !penCanvas) return;
          loopStarted = true;

          resizePenCanvas();
          letterXPositions = getLetterXPositions(penCtx);
          currentLetterCount = 0;
          canvasAlpha = 1;
          phase = 'writing';

          function writeNextLetter() {
            if (phase !== 'writing') return;
            if (currentLetterCount <= NAME_TEXT.length) {
              drawLetters(currentLetterCount, 1);
              movePenNib(currentLetterCount, 1);
              currentLetterCount++;
              var tid = setTimeout(writeNextLetter, LETTER_DELAY_MS);
              penTimeoutIds.push(tid);
            } else {
              if (penNib) penNib.style.opacity = '0';
              phase = 'holding';

              // Gentle breathing glow during hold
              var holdStart = performance.now();
              function holdPulse(now: number) {
                if (phase !== 'holding') return;
                var t = ((now - holdStart) % 1600) / 1600;
                var pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5; // 0..1
                drawLetters(NAME_TEXT.length, 1, pulse);
                penRafId = requestAnimationFrame(holdPulse);
              }
              penRafId = requestAnimationFrame(holdPulse);

              var htid = setTimeout(function() {
                cancelAnimationFrame(penRafId);
                startFade();
              }, HOLD_MS);
              penTimeoutIds.push(htid);
            }
          }

          function startFade() {
            if (phase !== 'holding') return;
            phase = 'fading';
            var startTime = performance.now();
            function fadeStep(now: number) {
              var elapsed = now - startTime;
              var t = Math.min(elapsed / FADE_MS, 1);
              canvasAlpha = 1 - t;
              drawLetters(NAME_TEXT.length, canvasAlpha);
              if (t < 1) {
                penRafId = requestAnimationFrame(fadeStep);
              } else {
                if (!penCanvas || !penCtx) return;
                penCtx.clearRect(0, 0, penCanvas.width, penCanvas.height);
                phase = 'pausing';
                loopStarted = false;
                var ptid = setTimeout(startWritingLoop, PAUSE_MS);
                penTimeoutIds.push(ptid);
              }
            }
            penRafId = requestAnimationFrame(fadeStep);
          }

          writeNextLetter();
        }

        // Start animation immediately
        startWritingLoop();

        var onResize = function() {
          resizePenCanvas();
          if (penCtx) letterXPositions = getLetterXPositions(penCtx);
        };
        window.addEventListener('resize', onResize);

        if ((document as any).fonts && (document as any).fonts.ready) {
          (document as any).fonts.ready.then(function() {
            if (penCtx) {
              resizePenCanvas();
              letterXPositions = getLetterXPositions(penCtx);
            }
          });
        }
      }
    }

    /* ---------- 2. State & Engine Data ---------- */
    var LS = 'cd_portfolio_v3';
    function $(s: string): any {
      return document.querySelector(s);
    }
    function clone(o: any) {
      return JSON.parse(JSON.stringify(o));
    }
    function esc(s: any) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    function ty(l: any) {
      return String(l).split(':')[0];
    }
    var HEAD0 = "'Bodoni Moda',serif",
      BODY0 = "'Manrope',sans-serif";
    var DEF = {
      skillGroups: [
        { cat: 'Frontend', items: [{ n: 'JavaScript' }, { n: 'React.js' }, { n: 'Next.js' }, { n: 'Tailwind CSS' }, { n: 'Bootstrap' }, { n: 'Material UI' }] },
        { cat: 'Backend', items: [{ n: 'Node.js' }, { n: 'Express.js' }, { n: 'Socket.io' }, { n: 'JWT / bcrypt' }, { n: 'MongoDB' }, { n: 'SQL' }] },
        { cat: 'AI & automation', items: [{ n: 'LangChain.js' }, { n: 'n8n' }, { n: 'Prompt engineering' }] },
        { cat: 'Tools', items: [{ n: 'Docker' }, { n: 'Git / GitHub' }, { n: 'Postman' }] },
      ],
      projects: [
        { name: 'Zerodha — stock trading platform', meta: 'JavaScript · real-time market data', desc: 'A full-stack trading ecosystem mimicking Zerodha Kite, with live market data, trade execution, and portfolio analytics.', url: 'https://chiranjeeb-dash-git.github.io/Zerodha-/' },
        { name: 'QuantumQuery AI agent', meta: 'Next.js · LangChain.js · TypeScript', desc: 'An agentic app where the AI autonomously decides between internal knowledge and live web search for real-time answers.', url: 'https://quantum-query-ai-agent.vercel.app/' },
        { name: 'Full-stack GenAI assistant', meta: 'Next.js · Express · JavaScript', desc: 'A production-ready AI assistant with multi-model LLM routing, real-time streaming, and STT/TTS voice integration.', url: 'https://full-stack-gen-ai-assistant.vercel.app/' },
        { name: 'Airbnb — global stay network', meta: 'Node · Express · MongoDB · EJS', desc: 'A rental platform replicating Airbnb, with property listings, image uploads, interactive maps, and bookings.', url: 'https://airbnb-global-stay-network.onrender.com/' },
        { name: 'Social media platform', meta: 'Next.js · Express · TypeScript', desc: 'A Reddit-style clone with posts, communities, voting, comments, and user auth.', url: 'https://social-media-platform-azure-ten.vercel.app/' },
        { name: 'Document manager', meta: 'Next.js', desc: 'A full-stack document management and organization tool.', url: 'https://document-manager-quo8.vercel.app/' },
        { name: 'Smart ERP platform', meta: 'Next.js', desc: 'A smart ERP-style management platform.', url: 'https://smart-naff5gjfr-chiranjeeb-dash-gits-projects.vercel.app/' },
        { name: 'Insurance platform', meta: 'React', desc: 'A full-stack insurance platform with policy browsing and management.', url: 'https://insuranceplatform-rho.vercel.app/' },
      ],
      exp: [
        { title: 'Software development trainee, full stack MERN', meta: 'Apna College, 10/2024 — 04/2025', url: '' },
        { title: 'Web development intern', meta: 'Mentornix Pvt Ltd', url: '' },
        { title: 'Full stack web development intern', meta: 'Octanet Services Pvt Ltd', url: '' },
      ],
      edu: [
        { title: 'B.Tech, Computer Science and Engineering', meta: 'Biju Patnaik University of Technology, Odisha · 2022 — 2024', url: '' },
        { title: 'Diploma engineering', meta: 'Central Institute of Petrochemical Engineering and Technology · 2019 — 2021', url: '' },
      ],
      certs: [
        { name: 'Full stack web development — MERN stack', credentialId: '', url: '', img: '', mediaType: '' },
        { name: 'Web development internship', credentialId: '', url: '', img: '', mediaType: '' },
        { name: 'Production AI agents with JavaScript: LangChain and LangGraph', credentialId: '', url: '', img: '', mediaType: '' },
      ],
      contact: [
        { label: 'Gmail', value: '', icon: 'gmail', url: 'https://mail.google.com/mail/?view=cm&fs=1&to=chiranjeeb.email@gmail.com' },
        { label: 'LinkedIn', value: '', icon: 'linkedin', url: 'https://www.linkedin.com/in/chiranjeeb-dash-/' },
        { label: 'GitHub', value: '', icon: 'github', url: 'https://github.com/Chiranjeeb-Dash-Git' },
        { label: 'Phone', value: '+91 78549 43328', icon: 'phone', url: 'tel:+917854943328' },
        { label: 'Location', value: 'Bhubaneswar, India', icon: 'map', url: 'https://www.google.com/maps/search/?api=1&query=Bhubaneswar' },
      ],
      theme: { bg: '#000000', ink: '#f2f2f2', accent: '#d7dbe2', accent2: '#c7ccd4', glow: 1, speed: 1 },
      fonts: { head: HEAD0, body: BODY0 },
      texts: {} as Record<string, string>,
      order: null as string[] | null,
    };
    var S = clone(DEF);
    try {
      var sv = JSON.parse(localStorage.getItem(LS) || 'null');
      if (sv) {
        for (var k in sv) S[k] = sv[k];
        if (!S.theme.glow) S.theme.glow = 1;
        if (!S.theme.speed) S.theme.speed = 1;
      }
    } catch (e) {}

    var PRESETS: Array<[string, any]> = [
      ['Silver & Black', { bg: '#000000', ink: '#f2f2f2', accent: '#d7dbe2', accent2: '#c7ccd4' }],
      ['Neon Pink & Green', { bg: '#000000', ink: '#f2f2f2', accent: '#ff2fb0', accent2: '#39ff8f' }],
      ['Ocean', { bg: '#03121a', ink: '#e6f6fb', accent: '#22d3ee', accent2: '#34d399' }],
      ['Royal Gold', { bg: '#0a0805', ink: '#f5efe0', accent: '#e0b84c', accent2: '#c98f3a' }],
      ['Crimson', { bg: '#0a0203', ink: '#f7eaea', accent: '#ff3b4e', accent2: '#ff8a5b' }],
      ['Emerald', { bg: '#03110b', ink: '#e8f7ee', accent: '#2ee59d', accent2: '#9be564' }],
      ['Violet', { bg: '#0b0714', ink: '#efe9ff', accent: '#a78bfa', accent2: '#f472b6' }],
      ['Sunset', { bg: '#120806', ink: '#fdeee6', accent: '#ff7a45', accent2: '#ffc857' }],
      ['Ivory (light)', { bg: '#f4f1ea', ink: '#141414', accent: '#1a1a1a', accent2: '#8a6d3b' }],
      ['Lime Noir', { bg: '#080c09', ink: '#e5ebe3', accent: '#d2f257', accent2: '#abc54b', font: "'Syne',sans-serif", bodyFont: "'Plus Jakarta Sans',sans-serif" }],
    ];

    var ATS = [
      ['Arial', 'Arial,Helvetica,sans-serif'],
      ['Helvetica', 'Helvetica,Arial,sans-serif'],
      ['Calibri', "Calibri,'Segoe UI',sans-serif"],
      ['Cambria', 'Cambria,Georgia,serif'],
      ['Garamond', "Garamond,'EB Garamond',Georgia,serif"],
      ['Georgia', "Georgia,'Times New Roman',serif"],
      ['Times New Roman', "'Times New Roman',Times,serif"],
      ['Verdana', 'Verdana,Geneva,sans-serif'],
      ['Tahoma', 'Tahoma,Geneva,sans-serif'],
      ['Trebuchet MS', "'Trebuchet MS',Helvetica,sans-serif"],
      ['Roboto', 'Roboto,Arial,sans-serif'],
      ['Open Sans', "'Open Sans',Arial,sans-serif"],
      ['Lato', 'Lato,Arial,sans-serif'],
      ['Source Sans 3', "'Source Sans 3',Arial,sans-serif"],
      ['Merriweather', 'Merriweather,Georgia,serif'],
    ];

    /* ---------- Icons Resolution ---------- */
    var SI: any = null;
    var ALIAS: Record<string, string> = {
      html: 'html5',
      css: 'css3',
      js: 'javascript',
      ts: 'typescript',
      'material ui': 'mui',
      aws: 'amazonaws',
      vscode: 'visualstudiocode',
      'vs code': 'visualstudiocode',
      postgres: 'postgresql',
      mongo: 'mongodb',
      k8s: 'kubernetes',
      golang: 'go',
      jwt: 'jsonwebtokens',
      'jwt / bcrypt': 'jsonwebtokens',
      'git / github': 'github',
      tailwind: 'tailwindcss',
      node: 'nodedotjs',
      next: 'nextdotjs',
      vue: 'vuedotjs',
      'c++': 'cplusplus',
      'c#': 'csharp',
      '.net': 'dotnet',
      twitter: 'x',
      'langchain.js': 'langchain',
    };
    var FB: Record<string, [string, string, string]> = {
      javascript: ['JS', '#f0db4f', '#2b2200'],
      reactjs: ['Re', '#61dafb', '#062330'],
      nextjs: ['N', '#e9e9f0', '#0a0a0f'],
      tailwindcss: ['Tw', '#38bdf8', '#04303f'],
      bootstrap: ['Bs', '#7952b3', '#fff'],
      materialui: ['MU', '#007fff', '#fff'],
      nodejs: ['Nd', '#3c873a', '#fff'],
      expressjs: ['Ex', '#8a8a9a', '#0a0a0f'],
      socketio: ['Sk', '#e9e9f0', '#0a0a0f'],
      jwtbcrypt: ['JWT', '#d63aff', '#2a0033'],
      mongodb: ['Mo', '#47A248', '#fff'],
      sql: ['SQL', '#00618a', '#fff'],
      langchainjs: ['LC', '#1c3c3c', '#9fe1cb'],
      n8n: ['n8n', '#ea4b71', '#fff'],
      promptengineering: ['PE', '#c7ccd4', '#111'],
      docker: ['Dk', '#2496ED', '#fff'],
      gitgithub: ['Git', '#f05033', '#fff'],
      postman: ['Pm', '#ff6c37', '#2a0e00'],
    };
    var BI: Record<string, { bg: string; svg: string }> = {
      gmail: {
        bg: '#fff',
        svg: '<svg viewBox="0 0 48 48"><path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75L35 40h7c1.657 0 3-1.343 3-3V16.2z"/><path fill="#1e88e5" d="M3 16.2l3.614 1.71L13 23.7V40H6c-1.657 0-3-1.343-3-3V16.2z"/><polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"/><path fill="#c62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859C9.132 8.301 8.228 8 7.298 8 4.924 8 3 9.924 3 12.298z"/><path fill="#fbc02d" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341C38.868 8.301 39.772 8 40.702 8 43.076 8 45 9.924 45 12.298z"/></svg>',
      },
      linkedin: {
        bg: '#0A66C2',
        svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M7.1 9.5H4.6V19h2.5V9.5zM5.85 5.5a1.45 1.45 0 100 2.9 1.45 1.45 0 000-2.9zM19.4 13.6c0-2.3-1.2-3.9-3.3-3.9-1.1 0-1.9.6-2.3 1.2V9.5h-2.4V19h2.5v-5c0-1.3.7-2.1 1.7-2.1 1 0 1.6.7 1.6 2.1v5h2.4v-5.4z"/></svg>',
      },
      github: {
        bg: '#161616',
        svg: '<svg viewBox="0 0 24 24" fill="#f2f2f2"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.14c-3.2.7-3.87-1.34-3.87-1.34-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.82 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.42.36.78 1.08.78 2.18v3.23c0 .3.21.66.79.55C20.71 21.38 24 17.07 24 12 24 5.65 18.85.5 12 .5z"/></svg>',
      },
      phone: {
        bg: '#22a955',
        svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></svg>',
      },
      map: {
        bg: '#fff',
        svg: '<svg viewBox="0 0 24 24"><path fill="#ea4335" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>',
      },
    };
    var BRANDONLY = ['gmail', 'linkedin', 'github'];
    var BIALIAS: Record<string, string> = { email: 'gmail', mail: 'gmail', call: 'phone', mobile: 'phone', location: 'map', address: 'map', maps: 'map', googlemaps: 'map' };
    var LINKSVG =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7"/></svg>';
    var AWARD = '<svg class="aw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-2 5 2-1.5-8.5"/></svg>';

    function slug(t: any) {
      return String(t)
        .toLowerCase()
        .replace(/\+/g, 'plus')
        .replace(/\./g, 'dot')
        .replace(/#/g, 'sharp')
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]/g, '');
    }
    function flat(t: any) {
      return String(t)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    }
    function lum(h: string) {
      h = h.replace('#', '');
      var r = parseInt(h.substr(0, 2), 16),
        g = parseInt(h.substr(2, 2), 16),
        b = parseInt(h.substr(4, 2), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }
    function mono(n: any) {
      var w = String(n).trim().split(/\s+/).filter(Boolean);
      if (!w.length) return '?';
      if (w.length === 1) {
        var s = w[0];
        return s.charAt(0).toUpperCase() + (s.length > 1 ? s.charAt(1).toLowerCase() : '');
      }
      return (w[0].charAt(0) + w[1].charAt(0)).toUpperCase();
    }
    function hue(n: any) {
      var h = 0,
        s = String(n);
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
      return 'hsl(' + h + ',62%,58%)';
    }
    function iconFor(name: any) {
      var n = String(name).trim().toLowerCase(),
        c: string[] = [];
      if (ALIAS[n]) c.push(ALIAS[n]);
      c.push(slug(n));
      var b = n.replace(/[\s.]*js$/, '');
      if (b && b !== n) c.push(slug(b));
      c.push(slug(n + '.js'));
      c.push(slug(n.split(/[\s\/]/)[0]));
      if (SI) {
        for (var i = 0; i < c.length; i++) {
          if (SI[c[i]]) return { t: 'si', p: SI[c[i]].path, h: SI[c[i]].hex };
        }
      }
      var f = FB[flat(n)];
      if (f) return { t: 'm', i: f[0], c: f[1], x: f[2] };
      return { t: 'm', i: mono(name), c: hue(name), x: '#0b0b0b' };
    }
    function cIcon(it: any) {
      var k = it.icon || flat(it.label);
      k = BIALIAS[k] || k;
      if (BI[k]) return { t: 'b', b: BI[k], k: k };
      return Object.assign({ k: k }, iconFor(it.label));
    }
    function icBox(ic: any) {
      if (ic.t === 'b') return { s: 'background:' + ic.b.bg, h: ic.b.svg };
      if (ic.t === 'si') {
        var hx = '#' + ic.h;
        return {
          s: 'background:' + (lum(hx) > 0.45 ? '#141414' : '#f2f2f2'),
          h: '<svg viewBox="0 0 24 24" fill="' + hx + '"><path d="' + ic.p + '"/></svg>',
        };
      }
      return { s: 'background:' + ic.c + ';color:' + ic.x, h: '<span class="mono">' + esc(ic.i) + '</span>' };
    }

    /* ---------- Data Helpers ---------- */
    function getList(l: any) {
      var t = ty(l);
      if (t === 'skills') return (S.skillGroups as any)[+String(l).split(':')[1]].items;
      return (S as any)[t];
    }
    var NEWI: Record<string, any> = {
      projects: { name: 'New project', desc: 'Short description.', meta: 'Stack', url: '' },
      exp: { title: 'New role', meta: 'Company · dates', url: '' },
      edu: { title: 'New qualification', meta: 'Institution · dates', url: '' },
      certs: { name: 'New certificate', credentialId: '', url: '', img: '', mediaType: '' },
      contact: { label: 'New link', value: '', icon: '', url: '' },
    };
    function normUrl(v: any) {
      v = String(v || '').trim();
      if (!v) return '';
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(v);
      if (/^\+?[\d\s()-]{7,}$/.test(v)) return 'tel:' + v.replace(/[^+\d]/g, '');
      if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
      return 'https://' + v;
    }

    /* ---------- Render Helpers ---------- */
    function CTL(on: boolean) {
      return (
        '<span class="ctl handle" data-act="drag" title="Drag to move">⠿</span><span class="ctl tools"><span class="tbtn' +
        (on ? ' on' : '') +
        '" data-act="link" title="Add / edit link">' +
        LINKSVG +
        '</span><span class="tbtn del" data-act="del" title="Remove">×</span></span>'
      );
    }
    function card(cls: string, list: string, i: number, it: any, inner: string, forceLink?: boolean) {
      var a = document.createElement('a');
      var hasLink = forceLink || !!it.url;
      a.className = 'c ' + cls + (hasLink ? ' has-link' : '');
      a.dataset.list = list;
      a.dataset.i = String(i);
      if (it.url && !it.img) {
        a.href = it.url;
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        a.href = 'javascript:void(0)';
      }
      a.innerHTML = inner + (it.url || it.img ? '<span class="go">↗</span>' : '') + CTL(!!(it.url || it.img));
      return a;
    }
    function addCard(list: string, label: string, cls?: string) {
      var d = document.createElement('div');
      d.className = cls || 'add-card';
      d.dataset.add = list;
      d.textContent = label;
      return d;
    }
    function ed(f: string, v: string, cls?: string) {
      return '<span class="ed ' + (cls || '') + '" data-f="' + f + '">' + esc(v) + '</span>';
    }

    function renderSkills() {
      var w = $('#skill-groups');
      if (!w) return;
      w.innerHTML = '';
      S.skillGroups.forEach(function (g: any, gi: number) {
        var h = document.createElement('div');
        h.className = 'sg-head';
        h.innerHTML =
          '<span class="sg-title ed" data-cat="' + gi + '">' + esc(g.cat) + '</span><span class="ctl tbtn del" data-act="delgroup" data-gi="' + gi + '" title="Remove category">×</span>';
        var grid = document.createElement('div');
        grid.className = 'skill-grid';
        grid.dataset.lst = 'skills:' + gi;
        g.items.forEach(function (s: any, i: number) {
          var b = icBox(iconFor(s.n));
          grid.appendChild(card('boxed skill-card', 'skills:' + gi, i, s, '<span class="icon" style="' + b.s + '">' + b.h + '</span>' + ed('n', s.n, 'sname')));
        });
        grid.appendChild(addCard('skills:' + gi, '+ Add skill'));
        w.appendChild(h);
        w.appendChild(grid);
      });
    }

    function renderProjects() {
      var w = $('#project-list');
      if (!w) return;
      w.innerHTML = '';
      S.projects.forEach(function (p: any, i: number) {
        w.appendChild(card('boxed proj-card', 'projects', i, p, ed('name', p.name, 'pname') + ed('desc', p.desc, 'pdesc') + ed('meta', p.meta, 'ptech')));
      });
      w.appendChild(addCard('projects', '+ Add project'));
    }

    function renderExp() {
      var w = $('#exp-list');
      if (!w) return;
      w.innerHTML = '';
      S.exp.forEach(function (e: any, i: number) {
        w.appendChild(card('tl-item', 'exp', i, e, ed('title', e.title, 'role') + ed('meta', e.meta, 'meta')));
      });
      w.appendChild(addCard('exp', '+ Add role'));
    }

    function renderEdu() {
      var w = $('#edu-list');
      if (!w) return;
      w.innerHTML = '';
      S.edu.forEach(function (e: any, i: number) {
        w.appendChild(card('boxed edu-card', 'edu', i, e, ed('title', e.title, 'etitle') + '<br>' + ed('meta', e.meta, 'emeta')));
      });
      w.appendChild(addCard('edu', '+ Add education'));
      var c = $('#cert-list');
      if (!c) return;
      c.innerHTML = '';
      S.certs.forEach(function (e: any, i: number) {
        var thumb = e.img
          ? e.mediaType === 'pdf'
            ? '<span class="pdf-thumb" aria-label="PDF certificate">PDF</span>'
            : '<img class="thumb" src="' + e.img + '" alt="Certificate preview">'
          : AWARD;
        var credential = e.credentialId
          ? '<span class="credential-meta"><span class="credential-label">Credential ID</span>' + ed('credentialId', e.credentialId, 'credential-id') + '</span>'
          : '';
        var verify = e.url ? '<span class="credential-verify" data-verify-url="' + esc(e.url) + '">Verify credential ↗</span>' : '';
        c.appendChild(card('cert-badge', 'certs', i, e, thumb + '<span class="cert-copy">' + ed('name', e.name) + credential + verify + '</span>', !!e.img));
      });
      c.appendChild(addCard('certs', '+ Add certificate', 'add-card cert-add'));
    }

    function renderContact() {
      var w = $('#contact-list');
      if (!w) return;
      w.innerHTML = '';
      S.contact.forEach(function (e: any, i: number) {
        var ic = cIcon(e),
          b = icBox(ic);
        var brandOnly = BRANDONLY.indexOf(ic.k) > -1;
        var body = brandOnly ? ed('label', e.label, 'cval') : '<span class="clabel2">' + esc(e.label) + '</span>' + ed('value', e.value || '', !e.value ? 'sname' : 'cval');
        w.appendChild(card('boxed contact-tile', 'contact', i, e, '<span class="ic" style="' + b.s + '">' + b.h + '</span><span class="ctext">' + body + '</span>'));
      });
      w.appendChild(addCard('contact', '+ Add contact card'));
    }

    function applyEditable() {
      var on = document.body.classList.contains('editing');
      document.querySelectorAll('[data-k],.ed').forEach(function (e) {
        e.setAttribute('contenteditable', on ? 'true' : 'false');
      });
    }

    function renderAll() {
      renderSkills();
      renderProjects();
      renderExp();
      renderEdu();
      renderContact();
      applyEditable();
    }

    /* ---------- Undo System ---------- */
    var UNDO: string[] = [],
      MAXU = 50;
    function snapshot() {
      UNDO.push(JSON.stringify(S));
      if (UNDO.length > MAXU) UNDO.shift();
      updateUndoBtn();
    }
    function updateUndoBtn() {
      var b = $('#t-undo');
      if (b) b.disabled = !UNDO.length;
    }
    function restoreTextsAndOrder() {
      document.querySelectorAll('[data-k]').forEach(function (e: any) {
        if (S.texts && S.texts[e.dataset.k] != null) e.innerHTML = S.texts[e.dataset.k];
        else if (ORIG[e.dataset.k] != null) e.innerHTML = ORIG[e.dataset.k];
      });
      if (S.order) setOrder(S.order);
    }
    function undo() {
      if (!UNDO.length) return;
      S = JSON.parse(UNDO.pop()!);
      applyTheme(clone(S.theme));
      applyFonts();
      renderAll();
      restoreTextsAndOrder();
      updateUndoBtn();
    }

    function refreshIcon(cd: HTMLElement) {
      var l = cd.dataset.list,
        it = getList(l)[+(cd.dataset.i || '0')],
        b: any,
        t: any;
      if (!it) return;
      if (ty(l) === 'skills') {
        b = icBox(iconFor(it.n));
        t = cd.querySelector('.icon');
      } else if (l === 'contact') {
        b = icBox(cIcon(it));
        t = cd.querySelector('.ic');
      }
      if (t) {
        t.setAttribute('style', b.s);
        t.innerHTML = b.h;
      }
    }

    /* ---------- Event Listeners ---------- */
    function addItem(l: string) {
      snapshot();
      var t = ty(l);
      if (t === 'skills') getList(l).push({ n: 'New skill' });
      else getList(l).push(clone(NEWI[t]));
      renderAll();
      var c = document.querySelector('[data-lst="' + l + '"]'),
        cs = c ? c.querySelectorAll('[data-list]') : [],
        last = cs[cs.length - 1],
        e: any = last && last.querySelector('.ed');
      if (e) {
        e.focus();
        var r = document.createRange();
        r.selectNodeContents(e);
        var s = getSelection();
        if (s) {
          s.removeAllRanges();
          s.addRange(r);
        }
      }
      if (t === 'contact') openLink('contact', S.contact.length - 1);
      if (t === 'certs') openLink('certs', S.certs.length - 1);
    }

    var onClick = function (e: MouseEvent) {
      var t = e.target as HTMLElement;
      if (!t || !t.closest) return;
      var mv: HTMLElement | null = t.closest('[data-move]');
      if (mv) {
        var sec = mv.closest('section'),
          m = $('main'),
          d = +(mv.dataset.move || '0');
        if (sec && m) {
          if (d < 0 && sec.previousElementSibling) m.insertBefore(sec, sec.previousElementSibling);
          else if (d > 0 && sec.nextElementSibling) m.insertBefore(sec.nextElementSibling, sec);
          sec.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return;
      }
      var ad: HTMLElement | null = t.closest('[data-add]');
      if (ad && ad.dataset.add) {
        addItem(ad.dataset.add);
        return;
      }
      var ac: HTMLElement | null = t.closest('[data-act]');
      if (ac) {
        e.preventDefault();
        e.stopPropagation();
        var a = ac.dataset.act,
          cd: HTMLElement | null = ac.closest('[data-list]');
        if (a === 'link' && cd) openLink(cd.dataset.list!, +cd.dataset.i!);
        else if (a === 'del' && cd) {
          snapshot();
          getList(cd.dataset.list!).splice(+cd.dataset.i!, 1);
          renderAll();
        } else if (a === 'delgroup' && ac.dataset.gi != null) {
          snapshot();
          S.skillGroups.splice(+ac.dataset.gi, 1);
          renderSkills();
          applyEditable();
        }
        return;
      }
      var verifyLink: HTMLElement | null = t.closest('[data-verify-url]');
      if (verifyLink && !document.body.classList.contains('editing')) {
        e.preventDefault();
        e.stopPropagation();
        var verifyUrl = verifyLink.dataset.verifyUrl;
        if (verifyUrl) window.open(verifyUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      var iv: HTMLImageElement | null = t.closest('.cert-badge img.thumb');
      if (iv) {
        e.preventDefault();
        openCertificateView(iv.src, 'image');
        return;
      }
      var c: HTMLAnchorElement | null = t.closest('a.c');
      if (c) {
        if (document.body.classList.contains('editing')) {
          e.preventDefault();
          return;
        }
        var it = getList(c.dataset.list!)[+c.dataset.i!];
        if (it && it.img) {
          e.preventDefault();
          openCertificateView(it.img, it.mediaType === 'pdf' ? 'pdf' : 'image');
        }
      }
    };

    var onFocusIn = function (e: FocusEvent) {
      var t = e.target as HTMLElement;
      if (t && t.isContentEditable && document.body.classList.contains('editing')) snapshot();
    };

    var onInput = function (e: Event) {
      var t = e.target as HTMLElement;
      if (!t || !t.dataset) return;
      var cd: HTMLElement | null = t.closest('[data-list]');
      if (t.dataset.f && cd) {
        var it = getList(cd.dataset.list!)[+cd.dataset.i!];
        if (it) it[t.dataset.f] = t.textContent?.trim() || '';
      } else if (t.dataset.cat !== undefined) {
        S.skillGroups[+t.dataset.cat].cat = t.textContent?.trim() || '';
      }
    };

    var onFocusOut = function (e: FocusEvent) {
      var t = e.target as HTMLElement;
      if (t && t.dataset && t.dataset.f) {
        var cd: HTMLElement | null = t.closest('[data-list]');
        if (cd) refreshIcon(cd);
      }
    };

    document.addEventListener('click', onClick);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('input', onInput);
    document.addEventListener('focusout', onFocusOut);

    var addCatBtn = $('#add-cat');
    if (addCatBtn) {
      addCatBtn.onclick = function () {
        snapshot();
        S.skillGroups.push({ cat: 'New category', items: [] });
        renderSkills();
        applyEditable();
      };
    }

    /* ---------- Pointer Drag & Drop ---------- */
    var DR: any = null;
    function pt(e: any) {
      return e.touches && e.touches.length ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    }
    function findDrop(el: any) {
      if (!DR || !el) return null;
      var c = el.closest && el.closest('[data-list]'),
        ad = el.closest && el.closest('[data-add]'),
        ls = el.closest && el.closest('[data-lst]');
      if (c && c !== DR.el && ty(c.dataset.list) === ty(DR.list)) return { el: c, list: c.dataset.list, i: +c.dataset.i };
      if (ad && ty(ad.dataset.add) === ty(DR.list)) return { el: ad, list: ad.dataset.add, i: getList(ad.dataset.add).length };
      if (ls && ty(ls.dataset.lst) === ty(DR.list)) return { el: ls, list: ls.dataset.lst, i: getList(ls.dataset.lst).length };
      return null;
    }
    function clearOver() {
      document.querySelectorAll('.over').forEach(function (x) {
        x.classList.remove('over');
      });
    }
    function beginDrag(e: any, c: HTMLElement) {
      if (!c) return;
      e.preventDefault();
      e.stopPropagation();
      snapshot();
      DR = { list: c.dataset.list, i: +c.dataset.i!, el: c, drop: null };
      c.classList.add('dragging');
      document.body.style.userSelect = 'none';
    }

    var onMouseDown = function (e: MouseEvent) {
      if (e.button !== 0) return;
      var t = e.target as HTMLElement;
      if (t.isContentEditable || t.closest('.tbtn, input, button, select, a[href^="http"], a[href^="tel"], a[href^="mailto"]')) return;
      var c: HTMLElement | null = t.closest ? t.closest('[data-list]') : null;
      if (c && document.body.classList.contains('editing')) beginDrag(e, c);
    };
    var onTouchStart = function (e: TouchEvent) {
      var t = e.target as HTMLElement;
      if (t.isContentEditable || t.closest('.tbtn, input, button, select, a[href^="http"], a[href^="tel"], a[href^="mailto"]')) return;
      var c: HTMLElement | null = t.closest ? t.closest('[data-list]') : null;
      if (c && document.body.classList.contains('editing')) beginDrag(e, c);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('touchstart', onTouchStart, { passive: false });

    function onMove(e: any) {
      if (!DR) return;
      e.preventDefault();
      var p = pt(e),
        el = document.elementFromPoint(p.x, p.y);
      clearOver();
      var d = findDrop(el);
      DR.drop = d;
      if (d) d.el.classList.add('over');
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });

    function endDrag() {
      if (!DR) return;
      if (DR.el) DR.el.classList.remove('dragging');
      if (DR.drop) {
        var a = getList(DR.list),
          b = getList(DR.drop.list),
          idx = DR.drop.i,
          it = a.splice(DR.i, 1)[0];
        if (DR.list === DR.drop.list && DR.i < idx) idx--;
        b.splice(idx, 0, it);
        renderAll();
      }
      clearOver();
      document.body.style.userSelect = '';
      DR = null;
    }

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);

    /* ---------- Link & Certificate Modals ---------- */
    var LM = { list: null as string | null, i: 0 };
    function openLink(l: string, i: number) {
      LM = { list: l, i: i };
      var it = getList(l)[i];
      var isCert = l === 'certs';
      $('#lm-in').value = it.url && !/^https:\/\/mail\.google\.com/.test(it.url) ? it.url : it.url || '';
      var credentialId = $('#lm-credential-id') as HTMLInputElement | null;
      if (credentialId) credentialId.value = isCert ? it.credentialId || '' : '';
      var credentialField = $('#lm-credential-wrap');
      if (credentialField) credentialField.style.display = isCert ? 'block' : 'none';
      var urlLabel = $('#lm-url-label');
      var urlInput = $('#lm-in') as HTMLInputElement | null;
      if (urlLabel) urlLabel.textContent = isCert ? 'Verification URL (optional)' : 'Link or contact value';
      if (urlInput) urlInput.placeholder = isCert ? 'https://www.linkedin.com/learning/certificates/…' : 'https://… or name@email.com';
      $('#lm-photo-wrap').style.display = isCert ? 'block' : 'none';
      $('#lm-title').textContent = isCert ? 'Certificate credential' : 'Card link';
      $('#lm-desc').textContent = isCert
        ? 'Add the credential ID and verification URL. Attach a certificate photo or PDF to open it directly in this portfolio.'
        : 'Paste a website URL, an email address or a phone number. Clicking the card opens it.';
      $('#lm-preview').innerHTML = it.img
        ? it.mediaType === 'pdf'
          ? '<span class="pdf-preview">PDF certificate attached</span>'
          : '<img src="' + it.img + '" style="max-width:100%;max-height:120px;border-radius:8px;" alt="Certificate preview">'
        : '';
      $('#lm-file').value = '';
      $('#lm').classList.add('open');
      setTimeout(function () {
        (isCert ? $('#lm-credential-id') : $('#lm-in')).focus();
      }, 30);
    }
    function closeLM() {
      $('#lm').classList.remove('open');
    }

    $('#lm-save').onclick = function () {
      snapshot();
      var it = getList(LM.list!)[LM.i],
        v = $('#lm-in').value.trim();
      if (LM.list === 'certs') {
        var credentialIdInput = $('#lm-credential-id') as HTMLInputElement | null;
        var credentialId = credentialIdInput ? credentialIdInput.value.trim() : '';
        it.credentialId = credentialId;
        if (credentialId && !v) {
          v = 'https://www.linkedin.com/learning/certificates/' + encodeURIComponent(credentialId);
        }
        if (v) {
          it.url = normUrl(v);
        } else if (!it.img) {
          it.url = '';
        }
      } else if (v) {
        it.url = normUrl(v);
        it.img = '';
      }
      closeLM();
      renderAll();
    };
    $('#lm-rm').onclick = function () {
      snapshot();
      var it = getList(LM.list!)[LM.i];
      it.url = '';
      it.img = '';
      it.mediaType = '';
      closeLM();
      renderAll();
    };
    $('#lm-cx').onclick = closeLM;
    $('#lm').addEventListener('click', function (e: MouseEvent) {
      if ((e.target as HTMLElement).id === 'lm') closeLM();
    });
    $('#lm-in').addEventListener('keydown', function (e: KeyboardEvent) {
      if (e.key === 'Enter') $('#lm-save').click();
      if (e.key === 'Escape') closeLM();
    });
    $('#lm-credential-id').addEventListener('keydown', function (e: KeyboardEvent) {
      if (e.key === 'Enter') $('#lm-save').click();
      if (e.key === 'Escape') closeLM();
    });
    $('#lm-file').addEventListener('change', function (this: HTMLInputElement) {
      var f = this.files && this.files[0];
      if (!f) return;
      var isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      var isImage = /^image\/(png|jpeg|jpg|webp|gif)$/i.test(f.type);
      if (f.size > 4 * 1024 * 1024) {
        this.value = '';
        $('#lm-preview').textContent = 'Please choose a file smaller than 4 MB.';
        return;
      }
      if (!isImage && !isPdf) {
        this.value = '';
        $('#lm-preview').textContent = 'Please choose an image or PDF certificate.';
        return;
      }
      var r = new FileReader();
      var selectedList = LM.list;
      var selectedIndex = LM.i;
      snapshot();
      r.onload = function () {
        if (!selectedList || LM.list !== selectedList || LM.i !== selectedIndex) return;
        var it = getList(selectedList)[selectedIndex];
        if (!it) return;
        it.img = r.result as string;
        it.mediaType = isPdf ? 'pdf' : 'image';
        $('#lm-preview').innerHTML = it.mediaType === 'pdf'
          ? '<span class="pdf-preview">PDF certificate attached</span>'
          : '<img src="' + r.result + '" style="max-width:100%;max-height:120px;border-radius:8px;" alt="Certificate preview">';
      };
      r.readAsDataURL(f);
    });

    function openCertificateView(src: string, mediaType: 'image' | 'pdf') {
      var image = $('#imgview-img') as HTMLImageElement | null;
      var pdf = $('#imgview-pdf') as HTMLIFrameElement | null;
      var fallback = $('#imgview-fallback');
      if (image) {
        image.style.display = mediaType === 'image' ? 'block' : 'none';
        image.src = mediaType === 'image' ? src : '';
      }
      if (pdf) {
        pdf.style.display = mediaType === 'pdf' ? 'block' : 'none';
        pdf.src = mediaType === 'pdf' ? src : 'about:blank';
        pdf.onerror = function () {
          if (fallback) fallback.style.display = 'block';
        };
      }
      if (fallback) {
        fallback.style.display = 'none';
        var link = fallback.querySelector('a') as HTMLAnchorElement | null;
        if (link) link.href = mediaType === 'pdf' ? src : '#';
      }
      $('#imgview').classList.add('open');
    }
    $('#imgview').addEventListener('click', function (this: HTMLElement, e: MouseEvent) {
      if (e.target === this || (e.target as HTMLElement).id === 'imgview-close') this.classList.remove('open');
    });
    document.addEventListener('keydown', function (e: KeyboardEvent) {
      if (e.key === 'Escape') $('#imgview').classList.remove('open');
    });

    /* ---------- Theme & Effects & Fonts ---------- */
    function hex2rgb(h: string): [number, number, number] {
      h = h.replace('#', '');
      if (h.length === 3)
        h = h
          .split('')
          .map(function (c) {
            return c + c;
          })
          .join('');
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }

    function applyTheme(t: any) {
      S.theme = t;
      var r = document.documentElement.style,
        b = hex2rgb(t.bg),
        i = hex2rgb(t.ink),
        a = hex2rgb(t.accent),
        a2 = hex2rgb(t.accent2);
      r.setProperty('--bg', t.bg);
      r.setProperty('--bg-rgb', b.join(','));
      r.setProperty('--ink', t.ink);
      r.setProperty('--ink-rgb', i.join(','));
      r.setProperty(
        '--dim',
        'rgb(' +
          b
            .map(function (v, k) {
              return Math.round(i[k] * 0.55 + v * 0.45);
            })
            .join(',') +
          ')'
      );
      r.setProperty('--accent', t.accent);
      r.setProperty('--accent-rgb', a.join(','));
      r.setProperty('--accent2', t.accent2);
      r.setProperty('--accent2-rgb', a2.join(','));
      var gl = t.glow != null ? t.glow : 1,
        sp = t.speed != null ? t.speed : 1;
      r.setProperty('--gmul', gl);
      (window as any).CUR = { acc: a.join(','), accent: t.accent, accent2: t.accent2, glow: gl, speed: sp };
      if ((window as any).__applyThree) (window as any).__applyThree();
      if ($('#c-bg')) $('#c-bg').value = t.bg;
      if ($('#c-ink')) $('#c-ink').value = t.ink;
      if ($('#c-accent')) $('#c-accent').value = t.accent;
      if ($('#c-accent2')) $('#c-accent2').value = t.accent2;
      if ($('#r-glow')) $('#r-glow').value = Math.round(gl * 100);
      if ($('#r-speed')) $('#r-speed').value = Math.round(sp * 100);
    }

    function applyFonts() {
      var r = document.documentElement.style;
      r.setProperty('--font-head', S.fonts.head);
      r.setProperty('--font-body', S.fonts.body);
      if ($('#f-head')) $('#f-head').value = S.fonts.head;
      if ($('#f-body')) $('#f-body').value = S.fonts.body;
    }

    (function () {
      var p = $('#presets');
      if (p) {
        p.innerHTML = '';
        PRESETS.forEach(function (x) {
          var b = document.createElement('button');
          b.className = 'pre';
          b.innerHTML =
            '<span class="sw" style="background:' +
            x[1].bg +
            ';border-color:' +
            x[1].accent +
            '"><i style="background:' +
            x[1].accent +
            '"></i><i style="background:' +
            x[1].accent2 +
            '"></i></span><span>' +
            x[0] +
            '</span>';
          b.onclick = function () {
            snapshot();
            var t = clone(x[1]);
            t.glow = S.theme.glow;
            t.speed = S.theme.speed;
            var f = t.font,
              bf = t.bodyFont;
            delete t.font;
            delete t.bodyFont;
            applyTheme(t);
            if (f) S.fonts.head = f;
            if (bf) S.fonts.body = bf;
            if (f || bf) applyFonts();
          };
          p.appendChild(b);
        });
      }

      ['bg', 'ink', 'accent', 'accent2'].forEach(function (k) {
        var inp = $('#c-' + k);
        if (!inp) return;
        var snapped = false;
        inp.addEventListener('input', function (this: HTMLInputElement) {
          if (!snapped) {
            snapshot();
            snapped = true;
          }
          var t = clone(S.theme);
          t[k] = this.value;
          applyTheme(t);
        });
        inp.addEventListener('change', function () {
          snapped = false;
        });
      });

      (function () {
        var snapped = false;
        var rGlow = $('#r-glow');
        if (rGlow) {
          rGlow.addEventListener('input', function (this: HTMLInputElement) {
            if (!snapped) {
              snapshot();
              snapped = true;
            }
            var t = clone(S.theme);
            t.glow = +this.value / 100;
            applyTheme(t);
          });
          rGlow.addEventListener('change', function () {
            snapped = false;
          });
        }
      })();

      (function () {
        var snapped = false;
        var rSpeed = $('#r-speed');
        if (rSpeed) {
          rSpeed.addEventListener('input', function (this: HTMLInputElement) {
            if (!snapped) {
              snapshot();
              snapped = true;
            }
            var t = clone(S.theme);
            t.speed = +this.value / 100;
            applyTheme(t);
          });
          rSpeed.addEventListener('change', function () {
            snapped = false;
          });
        }
      })();

      function fill(sel: HTMLSelectElement | null, def: string, defLabel: string) {
        if (!sel) return;
        var h = '<optgroup label="Default">' + '<option value="' + def + '">' + defLabel + '</option></optgroup><optgroup label="ATS-friendly fonts">';
        ATS.forEach(function (f) {
          h += '<option value="' + f[1] + '">' + f[0] + ' (ATS)</option>';
        });
        sel.innerHTML = h + '</optgroup>';
      }
      fill($('#f-head'), HEAD0, 'Bodoni Moda — headings');
      fill($('#f-body'), BODY0, 'Manrope — body text');
      if ($('#f-head')) {
        $('#f-head').onchange = function (this: HTMLSelectElement) {
          snapshot();
          S.fonts.head = this.value;
          applyFonts();
        };
      }
      if ($('#f-body')) {
        $('#f-body').onchange = function (this: HTMLSelectElement) {
          snapshot();
          S.fonts.body = this.value;
          applyFonts();
        };
      }
    })();

    /* ---------- Editor PIN protection ---------- */
    var PIN_KEY = 'portfolio_editor_pin';
    var DEFAULT_PIN = '7854';
    var editorUnlocked = false;
    var pendingEditorAction: 'edit' | 'customize' | null = null;

    function getEditorPin() {
      try {
        var stored = localStorage.getItem(PIN_KEY);
        return stored && /^\d{4,12}$/.test(stored) ? stored : DEFAULT_PIN;
      } catch (e) {
        return DEFAULT_PIN;
      }
    }

    function closePinModals() {
      if ($('#pin-gate')) $('#pin-gate').classList.remove('open');
      if ($('#pin-reset')) $('#pin-reset').classList.remove('open');
    }

    function focusPinInput(id: string) {
      window.setTimeout(function () {
        var input = $(id) as HTMLInputElement | null;
        if (input) input.focus();
      }, 0);
    }

    function openPinGate(action: 'edit' | 'customize', message?: string) {
      pendingEditorAction = action;
      var title = $('#pin-gate-title');
      var desc = $('#pin-gate-desc');
      var input = $('#pin-gate-input') as HTMLInputElement | null;
      var error = $('#pin-gate-error');
      if (title) title.textContent = action === 'edit' ? 'Unlock edit mode' : 'Unlock customization';
      if (desc) desc.textContent = message || 'Enter your PIN to access portfolio editing tools.';
      if (input) input.value = '';
      if (error) error.textContent = '';
      if ($('#pin-reset')) $('#pin-reset').classList.remove('open');
      if ($('#pin-gate')) $('#pin-gate').classList.add('open');
      focusPinInput('pin-gate-input');
    }

    function runEditorAction(action: 'edit' | 'customize') {
      if (action === 'customize') {
        $('#drawer').classList.toggle('open');
        return;
      }
      document.body.classList.toggle('editing');
      var on = document.body.classList.contains('editing');
      var editButton = $('#t-edit');
      if (editButton) editButton.textContent = 'Edit mode: ' + (on ? 'on' : 'off');
      applyEditable();
    }

    function unlockEditor() {
      var input = $('#pin-gate-input') as HTMLInputElement | null;
      var error = $('#pin-gate-error');
      if (!input || input.value !== getEditorPin()) {
        if (error) error.textContent = 'Incorrect PIN. Try again.';
        input?.select();
        return;
      }
      editorUnlocked = true;
      var action = pendingEditorAction;
      pendingEditorAction = null;
      closePinModals();
      if (action) runEditorAction(action);
    }

    function openPinReset() {
      if ($('#pin-gate')) $('#pin-gate').classList.remove('open');
      var error = $('#pin-reset-error');
      if (error) error.textContent = '';
      ['pin-old', 'pin-new', 'pin-confirm'].forEach(function (id) {
        var input = $('#' + id) as HTMLInputElement | null;
        if (input) input.value = '';
      });
      if ($('#pin-reset')) $('#pin-reset').classList.add('open');
      focusPinInput('pin-old');
    }

    function resetEditorPin() {
      var oldPin = ($('#pin-old') as HTMLInputElement | null)?.value || '';
      var newPin = ($('#pin-new') as HTMLInputElement | null)?.value || '';
      var confirmPin = ($('#pin-confirm') as HTMLInputElement | null)?.value || '';
      var error = $('#pin-reset-error');
      if (oldPin !== getEditorPin()) {
        if (error) error.textContent = 'The current PIN is incorrect.';
        return;
      }
      if (!/^\d{4,12}$/.test(newPin)) {
        if (error) error.textContent = 'Use a new PIN with 4–12 digits.';
        return;
      }
      if (newPin !== confirmPin) {
        if (error) error.textContent = 'The new PIN entries do not match.';
        return;
      }
      try {
        localStorage.setItem(PIN_KEY, newPin);
        editorUnlocked = false;
        var action = pendingEditorAction || 'customize';
        closePinModals();
        openPinGate(action, 'PIN updated. Enter your new PIN to continue.');
      } catch (e) {
        if (error) error.textContent = 'PIN could not be saved in this browser.';
      }
    }

    if ($('#pin-gate-confirm')) $('#pin-gate-confirm').onclick = unlockEditor;
    if ($('#pin-gate-reset')) $('#pin-gate-reset').onclick = openPinReset;
    if ($('#pin-gate-cancel')) $('#pin-gate-cancel').onclick = closePinModals;
    if ($('#pin-reset-save')) $('#pin-reset-save').onclick = resetEditorPin;
    if ($('#pin-reset-cancel')) $('#pin-reset-cancel').onclick = function () {
      closePinModals();
      pendingEditorAction = null;
    };
    ['pin-gate-input', 'pin-old', 'pin-new', 'pin-confirm'].forEach(function (id) {
      var input = $('#' + id) as HTMLInputElement | null;
      if (input) input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (id === 'pin-gate-input') unlockEditor();
          if (id === 'pin-confirm') resetEditorPin();
        }
      });
    });

    if ($('#t-custom')) $('#t-custom').onclick = function () {
      if (!editorUnlocked) {
        openPinGate('customize');
        return;
      }
      runEditorAction('customize');
    };
    if ($('#d-close')) $('#d-close').onclick = function () {
      $('#drawer').classList.remove('open');
    };

    /* ---------- Persistence & Order ---------- */
    var ORIG: Record<string, string> = {},
      ORDER0: string[] = [];
    document.querySelectorAll('main section').forEach(function (s) {
      ORDER0.push(s.id);
    });
    (function () {
      var n = 0;
      document.querySelectorAll('main [class*="name"],main .kicker,main h1,main h2,main p').forEach(function (e: any) {
        if (e.closest('#skill-groups,#project-list,#exp-list,#edu-list,#cert-list,#contact-list')) return;
        e.dataset.k = 't' + n++;
        ORIG[e.dataset.k] = e.innerHTML;
        if (S.texts && S.texts[e.dataset.k] != null) e.innerHTML = S.texts[e.dataset.k];
      });
    })();

    function setOrder(ids: string[]) {
      var m = $('main');
      if (!m) return;
      ids.forEach(function (id) {
        var s = document.getElementById(id);
        if (s) m.appendChild(s);
      });
    }
    if (S.order) setOrder(S.order);

    function flash(msg: string) {
      var b = $('#t-save'),
        o = 'Save';
      if (!b) return;
      b.textContent = msg;
      setTimeout(function () {
        b.textContent = o;
      }, 1600);
    }

    function save(closeDrawer: boolean) {
      var t: Record<string, string> = {};
      document.querySelectorAll('[data-k]').forEach(function (e: any) {
        t[e.dataset.k] = e.innerHTML;
      });
      S.texts = t;
      S.order = [].map.call(document.querySelectorAll('main section'), function (s: any) {
        return s.id;
      });
      try {
        localStorage.setItem(LS, JSON.stringify(S));
        flash('Saved ✓');
      } catch (err) {
        flash('Storage blocked');
      }
      if (closeDrawer && $('#drawer')) $('#drawer').classList.remove('open');
    }

    if ($('#t-save')) $('#t-save').onclick = function () {
      save(false);
    };
    if ($('#d-save')) $('#d-save').onclick = function () {
      save(true);
    };
    var rs: any = null;
    if ($('#d-reset')) {
      $('#d-reset').onclick = function (this: HTMLButtonElement) {
        var b = this;
        if (!rs) {
          b.textContent = 'Click again to confirm reset';
          rs = setTimeout(function () {
            rs = null;
            b.textContent = 'Reset everything';
          }, 3000);
          return;
        }
        clearTimeout(rs);
        rs = null;
        b.textContent = 'Reset everything';
        try {
          localStorage.removeItem(LS);
        } catch (e) {}
        S = clone(DEF);
        document.querySelectorAll('[data-k]').forEach(function (e: any) {
          if (ORIG[e.dataset.k] != null) e.innerHTML = ORIG[e.dataset.k];
        });
        setOrder(ORDER0);
        applyTheme(clone(S.theme));
        applyFonts();
        renderAll();
      };
    }

    if ($('#t-undo')) $('#t-undo').addEventListener('click', undo);

    var onKeyDown = function (e: KeyboardEvent) {
      if (document.body.classList.contains('editing') && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    var btnEdit = $('#t-edit');
    if (btnEdit) {
      btnEdit.onclick = function (this: HTMLButtonElement) {
        var isEditing = document.body.classList.contains('editing');
        if (!isEditing && !editorUnlocked) {
          openPinGate('edit');
          return;
        }
        runEditorAction('edit');
      };
    }

    applyTheme(clone(S.theme));
    applyFonts();
    renderAll();
    updateUndoBtn();

    /* ---------- 3. Three.js 3D Scene ---------- */
    var threeCleanup: (() => void) | null = null;
    var canvas3d = document.getElementById('c') as HTMLCanvasElement | null;
    if (canvas3d) {
      var renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true });
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0, 6);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      var dirLight = new THREE.DirectionalLight(0xffffff, 0.35);
      dirLight.position.set(3, 4, 3);
      scene.add(dirLight);

      var ambLight = new THREE.AmbientLight(0x0a0a0a, 0.5);
      scene.add(ambLight);

      var rim = new THREE.PointLight(0x818cf8, 2.5, 30);
      rim.position.set(-3, -2, -2);
      scene.add(rim);

      var glow = new THREE.PointLight(0x38bdf8, 2.8, 30);
      glow.position.set(3, 1.5, 2);
      scene.add(glow);

      var core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15, 1),
        new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.7, roughness: 0.2, flatShading: true })
      );
      scene.add(core);

      var wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.32, 1),
        new THREE.MeshBasicMaterial({ color: 0xd7dbe2, wireframe: true, transparent: true, opacity: 0.85 })
      );
      core.add(wire);

      var shardGroup = new THREE.Group();
      var shardGeo = new THREE.OctahedronGeometry(0.09);
      var shardMats: THREE.MeshStandardMaterial[] = [];

      for (var i = 0; i < 6; i++) {
        var m = new THREE.MeshStandardMaterial({ color: 0xc7ccd4, emissive: 0x9aa0aa, emissiveIntensity: 1.1, metalness: 0.6, roughness: 0.15 });
        shardMats.push(m);
        var shard = new THREE.Mesh(shardGeo, m);
        shard.userData.angle = (i / 6) * Math.PI * 2;
        shard.userData.baseRadius = 1.15;
        shardGroup.add(shard);
      }
      scene.add(shardGroup);

      var pGeo = new THREE.BufferGeometry();
      var count = 2200;
      var pos = new Float32Array(count * 3);
      for (var j = 0; j < count; j++) {
        pos[j * 3] = (Math.random() - 0.5) * 24;
        pos[j * 3 + 1] = (Math.random() - 0.5) * 24;
        pos[j * 3 + 2] = (Math.random() - 0.5) * 24;
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var pMat = new THREE.PointsMaterial({ color: 0xc7ccd4, size: 0.024, transparent: true, opacity: 0.65 });
      var particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      (window as any).__applyThree = function () {
        var C = (window as any).CUR;
        if (!C) return;
        var a = new THREE.Color(C.accent),
          b = new THREE.Color(C.accent2),
          gl = C.glow || 1;
        wire.material.color.copy(a);
        wire.material.opacity = Math.min(1, 0.85 * gl);
        rim.color.copy(a);
        rim.intensity = 2.2 * gl;
        glow.color.copy(a);
        glow.intensity = 2.4 * gl;
        shardMats.forEach(function (x) {
          x.color.copy(b);
          x.emissive.copy(b).multiplyScalar(0.77);
          x.emissiveIntensity = 1.1 * gl;
        });
        pMat.color.copy(b);
        pMat.opacity = Math.min(1, 0.55 * gl);
      };
      (window as any).__applyThree();

      function mapRange(v: number, a: number, b: number, c: number, d: number) {
        var t = (v - a) / (b - a);
        t = Math.max(0, Math.min(1, t));
        return c + t * (d - c);
      }
      function lerp(a: number, b: number, t: number) {
        return a + (b - a) * t;
      }

      var progress = 0,
        scrollVelocity = 0;
      function onScroll() {
        var doc = document.documentElement,
          max = doc.scrollHeight - doc.clientHeight,
          next = max > 0 ? window.scrollY / max : 0;
        scrollVelocity = next - progress;
        progress = next;
        var pBar = document.getElementById('progress');
        if (pBar) pBar.style.width = progress * 100 + '%';
      }

      window.addEventListener('scroll', onScroll, { passive: true });

      var threeAnimId: number;
      function animate3D() {
        threeAnimId = requestAnimationFrame(animate3D);
        var sm = ((window as any).CUR && (window as any).CUR.speed) || 1;
        core.rotation.y = lerp(core.rotation.y, progress * Math.PI * 4, Math.min(0.2, 0.06 * sm));
        core.rotation.x = lerp(core.rotation.x, progress * Math.PI * 0.6, Math.min(0.2, 0.06 * sm));
        var dis = Math.sin(progress * Math.PI);
        shardGroup.position.x = lerp(shardGroup.position.x, Math.sin(progress * Math.PI * 3) * 1.8, 0.08);
        shardGroup.position.y = lerp(shardGroup.position.y, (0.5 - progress) * 3.5, 0.08);
        shardGroup.position.z = lerp(shardGroup.position.z, Math.cos(progress * Math.PI * 2) * 1.2, 0.08);

        shardGroup.children.forEach(function (s, idx) {
          var r = s.userData.baseRadius + dis * 1.8 + Math.sin(progress * Math.PI * 4 + idx) * 0.4,
            a = s.userData.angle + progress * Math.PI * 5 + (idx * Math.PI) / 3;
          s.position.x = Math.cos(a) * r;
          s.position.y = Math.sin(a * 2.2 + progress * 6) * r * 0.85;
          s.position.z = Math.sin(a) * r;
          s.rotation.x += 0.03 * sm;
          s.rotation.y += 0.025 * sm;
        });
        var tz = progress > 0.85 ? mapRange(progress, 0.85, 1, 0, -3.5) : (progress * -1.5);
        core.position.z = lerp(core.position.z, tz, 0.05);
        core.position.x = lerp(core.position.x, Math.sin(progress * Math.PI * 2) * 1.2, 0.06);
        core.position.y = lerp(core.position.y, (0.5 - progress) * 2.5, 0.06);
        var speed = (0.0025 + Math.min(Math.abs(scrollVelocity) * 10, 0.06)) * sm;
        particles.rotation.y += speed;
        particles.rotation.x += speed * 0.4;
        particles.position.z = lerp(particles.position.z, -scrollVelocity * 30, 0.15);
        scrollVelocity *= 0.9;
        renderer.render(scene, camera);
      }

      var onThreeResize = function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onThreeResize);

      onScroll();
      animate3D();

      threeCleanup = function () {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onThreeResize);
        cancelAnimationFrame(threeAnimId);
        renderer.dispose();
      };
    }

    /* ---------- 4. Remote Simple-Icons Loader ---------- */
    (function () {
      function clean() {
        try {
          delete (window as any).module;
          delete (window as any).exports;
        } catch (e) {
          (window as any).module = undefined;
          (window as any).exports = undefined;
        }
      }
      function load(urls: string[]) {
        if (!urls.length) return;
        var u = urls.shift()!;
        (window as any).module = { exports: {} };
        (window as any).exports = (window as any).module.exports;
        var sc = document.createElement('script');
        sc.src = u;
        sc.onload = function () {
          var ex = ((window as any).module && (window as any).module.exports) || {},
            map: Record<string, any> = {},
            n = 0;
          clean();
          Object.keys(ex).forEach(function (k) {
            var v = ex[k];
            if (v && v.slug && v.path) {
              map[v.slug] = v;
              n++;
            }
          });
          if (n > 50) {
            SI = map;
            var a = document.activeElement;
            if (!(a && (a as HTMLElement).isContentEditable)) {
              renderSkills();
              renderContact();
              applyEditable();
            }
          } else load(urls);
        };
        sc.onerror = function () {
          clean();
          load(urls);
        };
        document.head.appendChild(sc);
      }
      load([
        'https://cdn.jsdelivr.net/npm/simple-icons@13/index.js',
        'https://cdn.jsdelivr.net/npm/simple-icons@11/index.js',
        'https://cdn.jsdelivr.net/npm/simple-icons@9/index.js',
      ]);
    })();

    /* ---------- 5. Welcome Screen TTS + Dismiss ---------- */
    var overlay = document.getElementById('welcome-overlay');
    if (overlay && !(window as any).__hasSpokenWelcome) {
      (window as any).__hasSpokenWelcome = true;
      var spoken = false;
      function speakWelcome() {
        if (spoken) return;
        spoken = true;
        try {
          if (speechSynthesis.speaking || speechSynthesis.pending) {
            speechSynthesis.cancel();
          }
          var utter = new SpeechSynthesisUtterance('Welcome To My Portfolio');
          utter.rate = 0.95;
          utter.pitch = 1.15;
          utter.volume = 1;
          // Pick a female voice
          var voices = speechSynthesis.getVoices();
          var femaleVoice = voices.find(function (v) {
            return /female|zira|hazel|susan|samantha|karen|moira|tessa|fiona|victoria|google.*uk.*female/i.test(v.name);
          }) || voices.find(function (v) {
            return /female/i.test(v.name);
          }) || voices.find(function (v) {
            return /Microsoft.*Online|Google.*Female|Google.*UK/i.test(v.name);
          });
          if (femaleVoice) utter.voice = femaleVoice;
          utter.onend = function () {
            dismissWelcome();
          };
          speechSynthesis.speak(utter);
        } catch (e) {
          // If TTS fails, auto-dismiss after timeout
        }
      }

      var fallbackTimer: any = null;
      var onVoices = function () {
        speechSynthesis.removeEventListener('voiceschanged', onVoices);
        if (fallbackTimer) clearTimeout(fallbackTimer);
        speakWelcome();
      };

      // Voices may load async
      if (speechSynthesis.getVoices().length > 0) {
        speakWelcome();
      } else {
        speechSynthesis.addEventListener('voiceschanged', onVoices);
        fallbackTimer = setTimeout(function () {
          speechSynthesis.removeEventListener('voiceschanged', onVoices);
          speakWelcome();
        }, 500);
      }

      // Dismiss welcome screen
      var dismissed = false;
      function dismissWelcome() {
        if (dismissed) return;
        dismissed = true;
        if (overlay) {
          overlay.classList.add('leaving');
          setTimeout(function () {
            if (overlay) {
              overlay.style.display = 'none';
            }
          }, 750);
        }
      }

      // Auto-dismiss after 4 seconds max (in case TTS is slow or unavailable)
      setTimeout(dismissWelcome, 4000);
    }

    /* ---------- 6. Scroll-Reveal Animations (IntersectionObserver) ---------- */
    function setupScrollReveal() {
      // Add scroll-reveal class to all cards
      var selectors = '.skill-card, .proj-card, .edu-card, .cert-badge, .contact-tile, .tl-item, .add-card';
      document.querySelectorAll(selectors).forEach(function (el) {
        el.classList.add('scroll-reveal');
      });

      // Observe sections for header slide-in
      var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var panel = entry.target.querySelector('.panel');
          if (panel) {
            if (entry.isIntersecting) {
              panel.classList.add('section-visible');
            } else {
              panel.classList.remove('section-visible');
            }
          }
        });
      }, { threshold: 0.15 });

      document.querySelectorAll('main section').forEach(function (sec) {
        sectionObserver.observe(sec);
      });

      // Observe individual cards for reveal — replay every scroll
      var cardObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            entry.target.classList.remove('revealed');
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

      document.querySelectorAll('.scroll-reveal').forEach(function (el) {
        cardObserver.observe(el);
      });
    }

    // Hook into renderAll for scroll reveal re-application
    function triggerScrollReveal() {
      renderAll();
      setTimeout(setupScrollReveal, 50);
    }

    // Initial setup
    setTimeout(setupScrollReveal, 100);

    return () => {
      if (plexusCleanup) plexusCleanup();
      if (threeCleanup) threeCleanup();
      // Cancel pen handwriting animation
      penTimeoutIds.forEach(function(tid) { clearTimeout(tid); });
      cancelAnimationFrame(penRafId);
      document.removeEventListener('click', onClick);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('input', onInput);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchend', endDrag);
      document.removeEventListener('touchcancel', endDrag);
      document.removeEventListener('keydown', onKeyDown);
      try { speechSynthesis.cancel(); } catch (e) {}
    };
  }, []);

  // Generate deterministic particles for welcome screen to avoid SSR hydration mismatch
  const particles = Array.from({ length: 45 }, (_, i) => {
    const left = ((i * 37 + 13) % 100);
    const delay = ((i * 17) % 40) / 10;
    const duration = 4 + ((i * 23) % 40) / 10;
    const size = 2 + ((i * 11) % 30) / 10;
    return (
      <span
        key={i}
        style={{
          left: left + '%',
          bottom: '-10px',
          width: size + 'px',
          height: size + 'px',
          animationDelay: delay + 's',
          animationDuration: duration + 's',
          background: i % 3 === 0
            ? 'rgba(56,189,248,.6)'
            : i % 3 === 1
            ? 'rgba(129,140,248,.6)'
            : 'rgba(192,132,246,.5)',
        }}
      />
    );
  });

  return (
    <>
      {/* Welcome Screen Overlay */}
      <div id="welcome-overlay">
        <div className="welcome-particles">
          {particles}
        </div>
        <div className="welcome-text">
          <div className="welcome-avatar-wrap">
            <img
              src="https://avatars.githubusercontent.com/u/180313099?v=4"
              alt="Chiranjeeb Dash"
              className="welcome-avatar"
            />
          </div>
          <h1>Welcome To My Portfolio</h1>
          <div className="welcome-line" />
          <div className="welcome-sub">Loading experience…</div>
        </div>
      </div>

      <div id="progress"></div>
      <canvas id="plexus"></canvas>
      <div id="canvas-wrap">
        <canvas id="c"></canvas>
      </div>

      <div id="toolbar">
        <button
          className="tb"
          id="t-edit"
        >
          Edit mode: off
        </button>
        <button className="tb" id="t-custom">
          Customize
        </button>
        <button className="tb" id="t-undo">
          Undo
        </button>
        <button className="tb" id="t-save">
          Save
        </button>
      </div>

      <div id="drawer">
        <h3>
          Customize <span className="x" id="d-close">×</span>
        </h3>
        <div className="dl">THEMES</div>
        <div className="presets" id="presets"></div>
        <div className="dl">CUSTOM COLORS</div>
        <div className="crow">
          <span>Background</span>
          <input type="color" id="c-bg" />
        </div>
        <div className="crow">
          <span>Text</span>
          <input type="color" id="c-ink" />
        </div>
        <div className="crow">
          <span>Accent / glow</span>
          <input type="color" id="c-accent" />
        </div>
        <div className="crow">
          <span>Accent 2</span>
          <input type="color" id="c-accent2" />
        </div>
        <div className="dl">EFFECTS</div>
        <div className="crow">
          <span>Glow intensity</span>
          <input type="range" id="r-glow" min="0" max="200" defaultValue="100" />
        </div>
        <div className="crow">
          <span>Animation speed</span>
          <input type="range" id="r-speed" min="25" max="200" defaultValue="100" />
        </div>
        <div className="dl">FONTS</div>
        <select id="f-head"></select>
        <select id="f-body"></select>
        <button className="db" id="d-save">
          Save all changes
        </button>
        <button className="db ghost" id="d-reset">
          Reset everything
        </button>
        <div className="note">Fonts marked ATS are standard, resume-safe choices. Changes save in this browser only.</div>
      </div>

      <div className="modal" id="pin-gate" role="dialog" aria-modal="true" aria-labelledby="pin-gate-title">
        <div className="mbox pin-box">
          <h3 id="pin-gate-title">Unlock editor</h3>
          <p id="pin-gate-desc">Enter your PIN to access portfolio editing tools.</p>
          <label className="pin-label" htmlFor="pin-gate-input">PIN</label>
          <input id="pin-gate-input" className="pin-input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={12} autoComplete="off" />
          <div className="pin-error" id="pin-gate-error" role="alert" />
          <div className="mrow">
            <button id="pin-gate-cancel">Cancel</button>
            <button id="pin-gate-reset" className="ghost-action">Reset PIN</button>
            <button id="pin-gate-confirm" className="primary">Unlock</button>
          </div>
        </div>
      </div>

      <div className="modal" id="pin-reset" role="dialog" aria-modal="true" aria-labelledby="pin-reset-title">
        <div className="mbox pin-box">
          <h3 id="pin-reset-title">Reset editor PIN</h3>
          <p>Confirm your current PIN, then choose a new 4–12 digit PIN.</p>
          <label className="pin-label" htmlFor="pin-old">Current PIN</label>
          <input id="pin-old" className="pin-input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={12} autoComplete="off" />
          <label className="pin-label" htmlFor="pin-new">New PIN</label>
          <input id="pin-new" className="pin-input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={12} autoComplete="new-password" />
          <label className="pin-label" htmlFor="pin-confirm">Confirm new PIN</label>
          <input id="pin-confirm" className="pin-input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={12} autoComplete="new-password" />
          <div className="pin-error" id="pin-reset-error" role="alert" />
          <div className="mrow">
            <button id="pin-reset-cancel">Cancel</button>
            <button id="pin-reset-save" className="primary">Save new PIN</button>
          </div>
        </div>
      </div>

      <div className="modal" id="lm">
        <div className="mbox">
          <h3 id="lm-title">Card link</h3>
          <p id="lm-desc">Paste a website URL, an email address or a phone number. Clicking the card opens it.</p>
          <div id="lm-credential-wrap" style={{ display: 'none' }}>
            <label className="credential-form-label" htmlFor="lm-credential-id">Credential ID</label>
            <input id="lm-credential-id" placeholder="e.g. ABC123XYZ" autoComplete="off" />
          </div>
          <label className="credential-form-label" id="lm-url-label" htmlFor="lm-in">Verification URL</label>
          <input id="lm-in" placeholder="https://… or name@email.com" autoComplete="off" />
          <div id="lm-photo-wrap" style={{ display: 'none' }}>
            <div className="orsep">or</div>
            <label className="filebtn">
              📎 Attach certificate photo or PDF for direct viewing
              <input type="file" id="lm-file" accept="image/*,.pdf,application/pdf" style={{ display: 'none' }} />
            </label>
            <div id="lm-preview" style={{ marginTop: '8px', textAlign: 'center' }}></div>
          </div>
          <div className="mrow">
            <button id="lm-cx">Cancel</button>
            <button id="lm-rm">Remove</button>
            <button className="primary" id="lm-save">
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="modal" id="imgview">
        <div className="certificate-viewer" role="dialog" aria-modal="true" aria-label="Certificate preview">
          <button className="x" id="imgview-close" type="button" aria-label="Close certificate preview">×</button>
          <img id="imgview-img" src={undefined} alt="Certificate" />
          <iframe id="imgview-pdf" title="Certificate PDF preview" src="about:blank" />
          <div id="imgview-fallback" className="certificate-fallback">
            <p>Your browser could not preview this PDF inline.</p>
            <a href="#" target="_blank" rel="noopener noreferrer">Open PDF in a new tab</a>
          </div>
        </div>
      </div>

      <main>
        <section id="hero">
          <div className="panel">
            <div className="ctl sec-ctl">
              <span className="tbtn" data-move="-1">
                ↑
              </span>
              <span className="tbtn" data-move="1">
                ↓
              </span>
            </div>
            <div className="name-pen-container" id="name-pen-wrap">
              <canvas id="name-canvas" className="name-canvas" />
              <div className="pen-nib" id="pen-nib-el">✒️</div>
            </div>
            <div className="kicker">MERN stack developer · AI agent builder</div>
            <h1>B.Tech graduate in Computer Science, based in Bhubaneswar. I work across the MERN stack and Next.js, and build agentic AI systems with LangChain.js on top.</h1>
            <p>
              Strong foundation in the MERN stack, proficient across frontend and backend, third-party API integration, and agentic AI orchestration using Next.js 15+ and
              LangChain.js. Three major projects shipped, spanning full-stack apps and AI-driven agents.
            </p>
          </div>
        </section>

        <section id="skills">
          <div className="panel mid">
            <div className="ctl sec-ctl">
              <span className="tbtn" data-move="-1">
                ↑
              </span>
              <span className="tbtn" data-move="1">
                ↓
              </span>
            </div>
            <div className="kicker">Skills</div>
            <h2>What I work with.</h2>
            <div id="skill-groups"></div>
            <button className="add-line" id="add-cat">
              + Add category
            </button>
          </div>
        </section>

        <section id="projects">
          <div className="panel wide">
            <div className="ctl sec-ctl">
              <span className="tbtn" data-move="-1">
                ↑
              </span>
              <span className="tbtn" data-move="1">
                ↓
              </span>
            </div>
            <div className="kicker">Projects</div>
            <h2>Things I've shipped.</h2>
            <div className="proj-grid" id="project-list" data-lst="projects"></div>
          </div>
        </section>

        <section id="experience">
          <div className="panel">
            <div className="ctl sec-ctl">
              <span className="tbtn" data-move="-1">
                ↑
              </span>
              <span className="tbtn" data-move="1">
                ↓
              </span>
            </div>
            <div className="kicker">Experience</div>
            <h2>Where I've worked.</h2>
            <div className="timeline" id="exp-list" data-lst="exp"></div>
          </div>
        </section>

        <section id="education">
          <div className="panel mid">
            <div className="ctl sec-ctl">
              <span className="tbtn" data-move="-1">
                ↑
              </span>
              <span className="tbtn" data-move="1">
                ↓
              </span>
            </div>
            <div className="kicker">Education &amp; certificates</div>
            <h2>What I've studied.</h2>
            <div className="edu-grid" id="edu-list" data-lst="edu"></div>
            <div className="cert-row" id="cert-list" data-lst="certs"></div>
          </div>
        </section>

        <section id="contact">
          <div className="panel wide">
            <div className="ctl sec-ctl">
              <span className="tbtn" data-move="-1">
                ↑
              </span>
              <span className="tbtn" data-move="1">
                ↓
              </span>
            </div>
            <div className="kicker">Contact</div>
            <h2>Let's build something.</h2>
            <div className="contact-grid" id="contact-list" data-lst="contact"></div>
          </div>
        </section>
      </main>
    </>
  );
}
