/* ==========================================================================
   CHARACTER HEAD TRACKER — PREMIUM 2D PSEUDO-3D MOUSE TRACKING SYSTEM
   Vansh Arora Portfolio — character-tracker.js

   Strategy:
   - 9 "orientation anchor" frames selected from the 240-frame animation
   - Each frame analytically mapped to (headX, headY) look direction
   - Mouse normalized to [-1,1] relative to character head center
   - Spring physics interpolate the "look direction" smoothly
   - The NEAREST two anchor frames are blended on a Canvas via opacity crossfade
   - Additional Canvas 2D transforms add pseudo-3D depth:
       scaleX compression (face narrows when turning)
       translateY shift (head bob on up/down look)
       subtle pivot-based skew for 3D depth illusion
   - Body region stays STABLE (drawn from a fixed front frame)
   - Idle breathing + micro-drift when mouse is absent
   - Mobile: smooth idle float animation
   ========================================================================== */

'use strict';

class CharacterHeadTracker {
  constructor(options) {
    options = options || {};
    this.FRAME_BASE_PATH = options.framePath || 'assets/character_frames/';
    this.CANVAS_W = 540;
    this.CANVAS_H = 960;

    // Head region in the 540x960 canvas
    this.HEAD_BOTTOM = 400;  // px — approximate neck line
    this.NECK_BLEND  = 60;   // px — overlap blend zone

    /* ORIENTATION ANCHOR FRAMES
       hx: horizontal look -1=far right, 0=center, +1=far left
       hy: vertical look   -1=looking up, 0=center, +1=looking down
       Derived from Python skin-tone analysis on original PNGs. */
    this.ANCHORS = [
      { file: 'frame_000.webp', hx:  0.00, hy:  0.00 },  // front neutral
      { file: 'frame_019.webp', hx: -0.40, hy:  0.00 },  // 25% right
      { file: 'frame_026.webp', hx: -0.70, hy:  0.00 },  // 50% right
      { file: 'frame_033.webp', hx: -1.00, hy:  0.00 },  // max right
      { file: 'frame_059.webp', hx: +0.40, hy:  0.00 },  // 25% left
      { file: 'frame_067.webp', hx: +0.70, hy:  0.00 },  // 50% left
      { file: 'frame_077.webp', hx: +1.00, hy:  0.00 },  // max left
      { file: 'frame_119.webp', hx:  0.00, hy: -1.00 },  // looking up
      { file: 'frame_176.webp', hx: -0.45, hy:  0.15 },  // slight right-down
    ];

    // Spring physics state
    this.lookX = 0;
    this.lookY = 0;
    this.velX  = 0;
    this.velY  = 0;
    this.targetX = 0;
    this.targetY = 0;

    this.SPRING_K        = 0.055;
    this.DAMPING         = 0.82;
    this.IDLE_DRIFT_SPEED = 0.0004;

    this.mouseActive = false;
    this.lastMouseMoveTime = 0;
    this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    this.images = new Array(this.ANCHORS.length).fill(null);
    this.loadedCount = 0;
    this.ready = false;

    this.canvasEl = null;
    this.ctx      = null;
    this.rafId    = null;
    this._lastTs  = 0;
  }

  init(canvasElement) {
    this.canvasEl = canvasElement;
    this.ctx = canvasElement.getContext('2d', { alpha: true, desynchronized: true });
    canvasElement.width  = this.CANVAS_W;
    canvasElement.height = this.CANVAS_H;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this._preloadImages();
    this._bindMouseEvents();
    this._startLoop();
  }

  _preloadImages() {
    var self = this;
    this.ANCHORS.forEach(function(anchor, i) {
      var img = new Image();
      img.onload = function() {
        self.images[i] = img;
        self.loadedCount++;
        if (i === 0) self._drawFrame(); // show front frame immediately
        if (self.loadedCount === self.ANCHORS.length) self.ready = true;
      };
      img.onerror = function() { self.loadedCount++; };
      img.src = self.FRAME_BASE_PATH + anchor.file;
    });
  }

  _bindMouseEvents() {
    if (this.isMobile) return;
    var self = this;
    document.addEventListener('mousemove', function(e) {
      self._onMouseMove(e.clientX, e.clientY);
    }, { passive: true });
    document.addEventListener('mouseleave', function() {
      self.mouseActive = false;
    }, { passive: true });
  }

  _onMouseMove(cx, cy) {
    var canvas = this.canvasEl;
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();

    // Head center: horizontally centered, ~28% from canvas top (eye level)
    var headCx = rect.left + rect.width  * 0.50;
    var headCy = rect.top  + rect.height * 0.28;

    var dx = cx - headCx;
    var dy = cy - headCy;

    // Influence radius
    var radiusX = Math.max(rect.width  * 1.8, window.innerWidth  * 0.4);
    var radiusY = Math.max(rect.height * 1.2, window.innerHeight * 0.35);

    var nx = Math.max(-1, Math.min(1, dx / radiusX));
    var ny = Math.max(-1, Math.min(1, dy / radiusY));

    // Cubic ease-in-out for natural response
    nx = this._ease(nx);
    ny = this._ease(ny) * 0.7;

    this.targetX = nx;
    this.targetY = ny;
    this.mouseActive = true;
    this.lastMouseMoveTime = performance.now();
  }

  _ease(t) {
    var s = t < 0 ? -1 : 1;
    var a = Math.abs(t);
    return s * (a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2);
  }

  _computeBlend(lx, ly) {
    var dists = this.ANCHORS.map(function(a, i) {
      return { i: i, d: Math.sqrt(Math.pow(a.hx - lx, 2) + Math.pow(a.hy - ly, 2)) };
    });
    dists.sort(function(a, b) { return a.d - b.d; });
    var best   = dists[0];
    var second = dists[1];
    var total  = best.d + second.d;
    var t      = total < 0.0001 ? 0 : best.d / total;
    return { idxA: best.i, idxB: second.i, t: t };
  }

  _startLoop() {
    var self = this;
    var tick = function(ts) {
      self.rafId = requestAnimationFrame(tick);
      var dt = Math.min((ts - self._lastTs) / 16.667, 2.5);
      self._lastTs = ts;
      self._updatePhysics(dt, ts);
      self._drawFrame();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _updatePhysics(dt, ts) {
    var tX = this.targetX;
    var tY = this.targetY;

    var now = performance.now();
    var timeSince = now - this.lastMouseMoveTime;

    if (!this.mouseActive || timeSince > 2000) {
      var idleAmt = Math.min(1, Math.max(0, (timeSince - 2000) / 1500));
      var idleT   = ts * this.IDLE_DRIFT_SPEED;
      var driftX  = Math.sin(idleT * 0.7) * 0.05 * idleAmt;
      var driftY  = Math.cos(idleT * 0.5) * 0.03 * idleAmt;
      tX = tX * (1 - idleAmt) + driftX;
      tY = tY * (1 - idleAmt) + driftY;
    }

    var fx = -this.SPRING_K * (this.lookX - tX);
    var fy = -this.SPRING_K * (this.lookY - tY);

    this.velX = (this.velX + fx * dt) * Math.pow(this.DAMPING, dt);
    this.velY = (this.velY + fy * dt) * Math.pow(this.DAMPING, dt);
    this.lookX += this.velX * dt;
    this.lookY += this.velY * dt;

    this.lookX = Math.max(-1.05, Math.min(1.05, this.lookX));
    this.lookY = Math.max(-1.05, Math.min(1.05, this.lookY));
  }

  _drawFrame() {
    if (!this.ctx || !this.canvasEl) return;
    var ctx = this.ctx;
    var W   = this.CANVAS_W;
    var H   = this.CANVAS_H;
    var lx  = this.lookX;
    var ly  = this.lookY;

    if (!this.images[0]) { ctx.clearRect(0, 0, W, H); return; }

    var blend = this._computeBlend(lx, ly);
    var imgA  = this.images[blend.idxA];
    var imgB  = this.images[blend.idxB];
    var t     = blend.t;

    // Head pseudo-3D transforms
    var hShift = lx * 18;
    var scaleX = 1 - Math.abs(lx) * 0.075;
    var vShift = ly * 12;
    var scaleY = 1 - Math.abs(ly) * 0.04;

    var headH  = this.HEAD_BOTTOM;
    var cx     = W / 2;
    var cy     = headH * 0.28;  // pivot at eye level

    ctx.clearRect(0, 0, W, H);

    // ── PASS 1: STABLE BODY (front frame, no transform) ──────────────
    var frontImg = this.images[0];
    if (frontImg && frontImg.complete && frontImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, headH - this.NECK_BLEND, W, H - headH + this.NECK_BLEND);
      ctx.clip();
      ctx.drawImage(frontImg, 0, 0, W, H);
      ctx.restore();
    }

    // ── PASS 2: TRANSFORMED HEAD (blended between two nearest anchors) ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, headH + 2); // +2px to avoid sub-pixel gap at seam
    ctx.clip();

    // Apply pseudo-3D head transform centred on face/eye pivot
    ctx.translate(cx + hShift, cy + vShift);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-cx, -cy);

    // Primary frame
    if (imgA && imgA.complete && imgA.naturalWidth > 0) {
      ctx.globalAlpha = 1.0;
      ctx.drawImage(imgA, 0, 0, W, H);
    }
    // Blended secondary frame
    if (imgB && imgB !== imgA && imgB.complete && imgB.naturalWidth > 0 && t > 0.02) {
      ctx.globalAlpha = t;
      ctx.drawImage(imgB, 0, 0, W, H);
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // ── PASS 3: NECK SEAM SMOOTHER ───────────────────────────────────
    // Soft erase bottom of head region to blend with body seamlessly
    var seamTop    = headH - this.NECK_BLEND;
    var seamBottom = headH + 5;
    var grad = ctx.createLinearGradient(0, seamTop, 0, seamBottom);
    grad.addColorStop(0,   'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    // The seam blend is handled by the overlapping clip regions, not an erase
    // (transparent background means the body layer shows through perfectly)
  }

  setVisible(visible) {
    if (!visible) {
      this.mouseActive = false;
      this.targetX = 0;
      this.targetY = 0;
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

// Export for use in main.js (non-module compatible attach to window)
window.CharacterHeadTracker = CharacterHeadTracker;
