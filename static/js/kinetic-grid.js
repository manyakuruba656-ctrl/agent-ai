/**
 * 🌌 NEBULA AI Physics & Particle Canvas Engine
 * GroqBot 2.0 — Supports Dark (Nebula) and Light Modes
 *
 * Features:
 * - Dynamic Dark Mode (#070B14 space navy with ambient nebula & star field)
 * - Dynamic Light Mode (#F8FAFC clean daylight with soft sky blue/lavender glow & crisp indigo grid)
 * - Real-time cursor warp with boundary edge-pinning
 * - Radial ripple waves on click or tap
 * - Seamless live theme switching via window.setKineticTheme()
 */

(function () {
    const CELL_SIZE = 58;
    const INFLUENCE_RADIUS = 260;
    const MAX_WARP = 22;
    const LERP_SPEED = 0.07;
    const NUM_STARS = 65;

    const THEMES = {
        dark: {
            bg: "#070B14",
            nebula1: "rgba(37, 99, 235, 0.15)",
            nebula2: "rgba(139, 92, 246, 0.13)",
            lineBase: { r: 148, g: 163, b: 184, a: 0.08 },
            lineActive: { r: 96, g: 165, b: 250, a: 0.85 },
            nodeActive: { r: 192, g: 132, b: 252, a: 1.0 },
            glow: "168, 85, 247",
            ripple: "96, 165, 250",
            showStars: true
        },
        light: {
            bg: "#f8fafc",
            nebula1: "rgba(59, 130, 246, 0.08)",
            nebula2: "rgba(147, 51, 234, 0.06)",
            lineBase: { r: 148, g: 163, b: 184, a: 0.22 },
            lineActive: { r: 37, g: 99, b: 235, a: 0.85 },
            nodeActive: { r: 79, g: 70, b: 229, a: 1.0 },
            glow: "99, 102, 241",
            ripple: "37, 99, 235",
            showStars: false
        }
    };

    function lerpN(a, b, t) {
        return a + (b - a) * t;
    }

    function lerpColor(base, active, t) {
        const r = Math.round(lerpN(base.r, active.r, t));
        const g = Math.round(lerpN(base.g, active.g, t));
        const b = Math.round(lerpN(base.b, active.b, t));
        const a = lerpN(base.a, active.a, t);
        return `rgba(${r},${g},${b},${a.toFixed(3)})`;
    }

    let canvas = null;
    let ctx = null;
    let currentThemeKey = "dark";
    const mouse = { x: -9999, y: -9999 };
    const targetMouse = { x: -9999, y: -9999 };
    const ripples = [];
    const size = { w: 0, h: 0 };
    let rafId = null;
    let stars = [];

    function initStars(W, H) {
        stars = [];
        for (let i = 0; i < NUM_STARS; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.2 + 0.4,
                alpha: Math.random() * 0.5 + 0.2,
                speed: Math.random() * 0.002 + 0.001,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function getWarpedPoint(gx, gy, col, row, mousePos, ripplesList, cols, rows) {
        const edgeMargin = 1.6;
        const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
        const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
        const pinFactor = colPin * colPin * rowPin * rowPin;

        const dx = gx - mousePos.x;
        const dy = gy - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

        let rx = 0;
        let ry = 0;
        for (let i = 0; i < ripplesList.length; i++) {
            const r = ripplesList[i];
            const rdx = gx - r.x;
            const rdy = gy - r.y;
            const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
            const waveWidth = 60;
            const diff = rdist - r.radius;
            if (Math.abs(diff) < waveWidth) {
                const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 16 * pinFactor;
                const angle = Math.atan2(rdy, rdx);
                const sign = diff < 0 ? -1 : 1;
                rx += Math.cos(angle) * strength * sign * -1;
                ry += Math.sin(angle) * strength * sign * -1;
            }
        }

        if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
            const t = dist / INFLUENCE_RADIUS;
            const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
            const warpAmt = eased * MAX_WARP * pinFactor;
            const angle = Math.atan2(dy, dx);
            return {
                pt: {
                    x: gx - Math.cos(angle) * warpAmt + rx,
                    y: gy - Math.sin(angle) * warpAmt + ry
                },
                proximity: proximity
            };
        }

        return { pt: { x: gx + rx, y: gy + ry }, proximity: proximity };
    }

    function draw(now) {
        if (!canvas || !ctx) return;
        const W = size.w;
        const H = size.h;
        if (W <= 0 || H <= 0) return;

        const theme = THEMES[currentThemeKey] || THEMES.dark;

        // 1. Background Fill
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, W, H);

        // 2. Ambient Radial Nebula Glows
        const timeSec = now * 0.0005;
        const neb1X = W * 0.35 + Math.sin(timeSec) * 70;
        const neb1Y = H * 0.4 + Math.cos(timeSec * 0.8) * 50;
        const neb2X = W * 0.7 + Math.cos(timeSec * 0.9) * 80;
        const neb2Y = H * 0.6 + Math.sin(timeSec * 0.7) * 60;

        const rad1 = Math.max(W, H) * 0.48;
        const grd1 = ctx.createRadialGradient(neb1X, neb1Y, 0, neb1X, neb1Y, rad1);
        grd1.addColorStop(0, theme.nebula1);
        grd1.addColorStop(1, currentThemeKey === "light" ? "rgba(248, 250, 252, 0)" : "rgba(7, 11, 20, 0)");
        ctx.fillStyle = grd1;
        ctx.fillRect(0, 0, W, H);

        const rad2 = Math.max(W, H) * 0.5;
        const grd2 = ctx.createRadialGradient(neb2X, neb2Y, 0, neb2X, neb2Y, rad2);
        grd2.addColorStop(0, theme.nebula2);
        grd2.addColorStop(1, currentThemeKey === "light" ? "rgba(248, 250, 252, 0)" : "rgba(7, 11, 20, 0)");
        ctx.fillStyle = grd2;
        ctx.fillRect(0, 0, W, H);

        // 3. Star Field (Dark Mode Only)
        if (theme.showStars) {
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                const twinkle = Math.sin(now * s.speed + s.phase);
                const currentAlpha = Math.max(0.1, s.alpha + twinkle * 0.25);
                ctx.fillStyle = `rgba(224, 231, 255, ${currentAlpha.toFixed(2)})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 4. Update Ripple Waves
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            const age = (now - r.born) / 1000;
            r.radius = Math.max(0, age * 380);
            r.opacity = Math.max(0, 1 - age * 1.1);
            if (r.opacity <= 0) ripples.splice(i, 1);
        }

        // 5. Warped Grid Calculation
        const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
        const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
        const cellW = W / (cols - 1);
        const cellH = H / (rows - 1);

        const pts = [];
        const prox = [];

        for (let row = 0; row < rows; row++) {
            pts[row] = [];
            prox[row] = [];
            for (let col = 0; col < cols; col++) {
                const res = getWarpedPoint(
                    col * cellW,
                    row * cellH,
                    col,
                    row,
                    mouse,
                    ripples,
                    cols,
                    rows
                );
                pts[row][col] = res.pt;
                prox[row][col] = res.proximity;
            }
        }

        // 6. Draw Grid Segments
        const drawSeg = (p1, p2, pr1, pr2) => {
            const avg = (pr1 + pr2) / 2;
            const t = avg * avg * (3 - 2 * avg);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = lerpColor(theme.lineBase, theme.lineActive, t);
            ctx.lineWidth = lerpN(0.7, 1.5, t);
            ctx.stroke();
        };

        ctx.lineCap = "butt";

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols - 1; col++) {
                drawSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);
            }
        }

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows - 1; row++) {
                drawSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);
            }
        }

        // 7. Active Nodes
        const nodeBase = currentThemeKey === "light" 
            ? { r: 100, g: 116, b: 139, a: 0.25 } 
            : { r: 255, g: 255, b: 255, a: 0.15 };

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const p = pts[row][col];
                const pr = prox[row][col];
                if (pr < 0.05) continue;

                const t = pr * pr * (3 - 2 * pr);
                const r = lerpN(1.2, 3.2, t);

                if (t > 0.25) {
                    const glowR = r + lerpN(0, 6, (t - 0.25) / 0.75);
                    const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR);
                    grd.addColorStop(0, `rgba(${theme.glow}, ${(t * 0.4).toFixed(3)})`);
                    grd.addColorStop(1, `rgba(${theme.glow}, 0)`);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
                    ctx.fillStyle = grd;
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = lerpColor(nodeBase, theme.nodeActive, t);
                ctx.fill();
            }
        }

        // 8. Ripple Rings
        for (let i = 0; i < ripples.length; i++) {
            const rp = ripples[i];
            const safeRadius = Math.max(0, rp.radius);
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, safeRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${theme.ripple}, ${(rp.opacity * 0.35).toFixed(3)})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();
        }
    }

    function animate(now) {
        mouse.x = lerpN(mouse.x, targetMouse.x, LERP_SPEED);
        mouse.y = lerpN(mouse.y, targetMouse.y, LERP_SPEED);

        draw(now);
        rafId = requestAnimationFrame(animate);
    }

    function setSize() {
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.scale(dpr, dpr);
        size.w = w;
        size.h = h;

        initStars(w, h);

        if (mouse.x === -9999) {
            mouse.x = w / 2;
            mouse.y = h / 2;
            targetMouse.x = w / 2;
            targetMouse.y = h / 2;
        }
    }

    function addRipple(clientX, clientY) {
        ripples.push({
            x: clientX,
            y: clientY,
            radius: 0,
            opacity: 1,
            born: performance.now()
        });
        if (ripples.length > 6) ripples.shift();
    }

    function initNebula() {
        canvas = document.getElementById("kineticGridCanvas");
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "kineticGridCanvas";
            canvas.className = "kinetic-grid-canvas";
            document.body.prepend(canvas);
        }

        ctx = canvas.getContext("2d");
        if (!ctx) return;

        const saved = localStorage.getItem("groq_theme");
        currentThemeKey = (saved === "light" || saved === "solar") ? "light" : "dark";

        setSize();
        window.addEventListener("resize", setSize);

        window.addEventListener("mousemove", (e) => {
            targetMouse.x = e.clientX;
            targetMouse.y = e.clientY;
        });

        window.addEventListener("touchmove", (e) => {
            if (e.touches && e.touches[0]) {
                targetMouse.x = e.touches[0].clientX;
                targetMouse.y = e.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener("click", (e) => {
            addRipple(e.clientX, e.clientY);
        });

        window.addEventListener("touchstart", (e) => {
            if (e.touches && e.touches[0]) {
                const t = e.touches[0];
                targetMouse.x = t.clientX;
                targetMouse.y = t.clientY;
                addRipple(t.clientX, t.clientY);
            }
        }, { passive: true });

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(animate);
    }

    window.setKineticTheme = function (themeKey) {
        currentThemeKey = (themeKey === "light" || themeKey === "solar") ? "light" : "dark";
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNebula);
    } else {
        initNebula();
    }
})();
