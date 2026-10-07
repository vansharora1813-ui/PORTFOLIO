/* ==========================================================================
   INTERACTIVE 360° CHARACTER HEAD TRACKER & STATIC BODY CONTROLLER
   Vansh Arora Portfolio — character-tracker.js
   
   Architecture:
   - Body & Cargo/Shoes: 100% rock-solid and static from clean front frame (000deg).
   - Head: 360° interactive rotation tracking horizontal cursor position (frames 00-35)
     combined with vertical up/down gaze shift and 3D depth tilt.
   - 60 FPS physics spring loop for organic, premium following motion without snapping.
   - Idle breathing floating state when mouse is stationary.
   ========================================================================== */

'use strict';

class InteractiveCharacter360 {
  constructor(options) {
    options = options || {};
    this.totalFrames = 36;
    this.frameDegreeStep = 10;
    
    this.basePath = options.basePath || 'assets/character/';
    this.fileExtension = options.extension || '.png';
    
    // Native canvas coordinate resolution (720x1280)
    this.CANVAS_W = 720;
    this.CANVAS_H = 1280;
    
    // Anatomical split: Head is top 0-390px, Body is 370-1280px
    this.HEAD_SPLIT_Y = 390;
    this.NECK_BLEND_ZONE = 35;
    
    // Canvas & Context
    this.canvas = null;
    this.ctx = null;
    this.container = options.container || null;
    
    // Preloaded image instances
    this.images = new Array(this.totalFrames).fill(null);
    this.loadedCount = 0;
    this.isReady = false;
    this.onLoadProgress = options.onProgress || null;
    this.onReadyCallback = options.onReady || null;
    
    // Physics & Interaction State
    this.targetX = 0; // [-1.0 = far left, 0 = center, +1.0 = far right]
    this.targetY = 0; // [-1.0 = top/up, 0 = center, +1.0 = bottom/down]
    this.currentX = 0;
    this.currentY = 0;
    this.velX = 0;
    this.velY = 0;
    
    // Physics Damping Parameters
    this.SPRING_K = 0.07;
    this.DAMPING = 0.80;
    
    // Idle Animation
    this.lastMouseMoveTime = performance.now();
    this.isMouseActive = false;
    this.idleTime = 0;
    
    // Touch & Accessibility
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Loop
    this.rafId = null;
    this.lastTs = performance.now();
    this.scrollOffsetY = 0;
    this.scaleFactor = 1.0;
    this.opacity = 1.0;
  }

  /**
   * Initialize on the hero canvas element
   */
  init(canvasElement, containerElement) {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.container = containerElement || canvasElement.parentElement;
    
    this.canvas.width = this.CANVAS_W;
    this.canvas.height = this.CANVAS_H;
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
    
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }

    this.preloadFrames();
    this.bindEvents();
    this.startLoop();
  }

  /**
   * Preload all 36 frames
   */
  preloadFrames() {
    for (let i = 0; i < this.totalFrames; i++) {
      const frameNum = String(i).padStart(2, '0');
      const degrees = String(i * this.frameDegreeStep).padStart(3, '0');
      const filename = `frame_${frameNum}_${degrees}deg${this.fileExtension}`;
      
      const img = new Image();
      img.onload = () => {
        this.images[i] = img;
        this.loadedCount++;
        
        // Draw front frame immediately
        if (i === 0) this.drawFrame();
        
        if (this.onLoadProgress) {
          this.onLoadProgress(this.loadedCount, this.totalFrames);
        }
        
        if (this.loadedCount === this.totalFrames) {
          this.isReady = true;
          if (this.onReadyCallback) this.onReadyCallback();
        }
      };
      
      img.onerror = () => {
        // Try fallback to webp if available
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          this.images[i] = fallbackImg;
          this.loadedCount++;
          if (i === 0) this.drawFrame();
          if (this.loadedCount === this.totalFrames) {
            this.isReady = true;
            if (this.onReadyCallback) this.onReadyCallback();
          }
        };
        fallbackImg.src = `${this.basePath}frame_${frameNum}_${degrees}deg.webp`;
      };
      
      img.src = `${this.basePath}${filename}`;
    }
  }

  /**
   * Bind mouse & scroll listeners
   */
  bindEvents() {
    if (this.prefersReducedMotion) return;

    const onMouseMove = (e) => {
      if (window.scrollY > window.innerHeight * 1.1) return;
      
      this.isMouseActive = true;
      this.lastMouseMoveTime = performance.now();
      
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      
      // Calculate normalized offset from screen center [-1.0, 1.0]
      const dx = (e.clientX - (winW * 0.5)) / (winW * 0.45);
      const dy = (e.clientY - (winH * 0.45)) / (winH * 0.45);
      
      this.targetX = Math.max(-1.0, Math.min(1.0, dx));
      this.targetY = Math.max(-1.0, Math.min(1.0, dy));
    };

    const onMouseLeave = () => {
      this.isMouseActive = false;
      this.targetX = 0;
      this.targetY = 0;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });

    // Reduced motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      if (this.prefersReducedMotion) {
        this.targetX = 0;
        this.targetY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.drawFrame();
      }
    });
  }

  /**
   * 60 FPS Loop
   */
  startLoop() {
    const loop = (timestamp) => {
      this.rafId = requestAnimationFrame(loop);
      
      const dt = Math.min((timestamp - this.lastTs) / 16.667, 2.0);
      this.lastTs = timestamp;
      
      if (!this.prefersReducedMotion) {
        this.updatePhysics(dt, timestamp);
      }
      
      this.drawFrame();
    };
    
    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Physics spring simulation & idle breathing
   */
  updatePhysics(dt, timestamp) {
    const now = performance.now();
    const timeSinceMove = now - this.lastMouseMoveTime;
    
    let tX = this.targetX;
    let tY = this.targetY;
    
    // Idle breathing & micro drift when cursor is idle
    if (!this.isMouseActive || timeSinceMove > 1000 || this.isTouchDevice) {
      this.idleTime += dt * 0.03;
      const idleFloatY = Math.sin(this.idleTime * 1.6) * 0.08;
      const idleDriftX = Math.sin(this.idleTime * 0.7) * 0.03;
      tY = tY * 0.5 + idleFloatY;
      tX = tX * 0.5 + idleDriftX;
    }
    
    // Spring physics integration
    const fx = -this.SPRING_K * (this.currentX - tX);
    const fy = -this.SPRING_K * (this.currentY - tY);
    
    this.velX = (this.velX + fx * dt) * Math.pow(this.DAMPING, dt);
    this.velY = (this.velY + fy * dt) * Math.pow(this.DAMPING, dt);
    
    this.currentX += this.velX * dt;
    this.currentY += this.velY * dt;
    
    this.currentX = Math.max(-1.0, Math.min(1.0, this.currentX));
    this.currentY = Math.max(-1.0, Math.min(1.0, this.currentY));
    
    // Update container perspective tilt subtly
    if (this.container) {
      const tiltX = -this.currentY * 5; // vertical pitch
      const tiltY = this.currentX * 7;  // horizontal yaw
      const floatY = this.currentY * 6;  // subtle body lift
      this.container.style.transform = `translateX(-50%) translateY(${floatY + this.scrollOffsetY}px) scale(${this.scaleFactor}) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      this.container.style.opacity = this.opacity;
    }
  }

  /**
   * Convert normalized horizontal lookX to nearest rotation frame
   * - Center (lookX = 0) -> Frame 00 (000deg)
   * - Look Right (lookX > 0) -> Frames 01 to 09 (010deg to 090deg)
   * - Look Left (lookX < 0) -> Frames 35 down to 27 (350deg down to 270deg)
   */
  getHeadFrameIndex(lookX) {
    if (Math.abs(lookX) < 0.04) return 0;
    
    if (lookX > 0) {
      // Look Right: 0..+1.0 maps across frames 0 to 9 (up to 90 degrees)
      const f = Math.round(lookX * 9);
      return Math.min(9, Math.max(0, f));
    } else {
      // Look Left: 0..-1.0 maps across frames 36 down to 27
      const f = Math.round(Math.abs(lookX) * 9);
      if (f === 0) return 0;
      return (36 - f) % 36;
    }
  }

  /**
   * Draw static base body (cargo & shoes intact) + dynamic rotating head
   */
  drawFrame() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const W = this.CANVAS_W;
    const H = this.CANVAS_H;
    
    ctx.clearRect(0, 0, W, H);
    
    const baseImg = this.images[0];
    if (!baseImg || !baseImg.complete) return;
    
    const splitY = this.HEAD_SPLIT_Y;
    const blendZone = this.NECK_BLEND_ZONE;
    
    // -----------------------------------------------------------------
    // PASS 1: STATIC ROCK-SOLID BODY (Jacket, Cargo Pants, Shoes)
    // -----------------------------------------------------------------
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, splitY - blendZone, W, H - (splitY - blendZone));
    ctx.clip();
    ctx.drawImage(baseImg, 0, 0, W, H);
    ctx.restore();
    
    // -----------------------------------------------------------------
    // PASS 2: RESPONSIVE 360° HEAD (Horizontal Turn + Vertical Gaze)
    // -----------------------------------------------------------------
    const headFrameIdx = this.getHeadFrameIndex(this.currentX);
    const headImg = this.images[headFrameIdx] || baseImg;
    
    if (headImg && headImg.complete) {
      ctx.save();
      ctx.beginPath();
      // Clip head region with soft overlap at the collar
      ctx.rect(0, 0, W, splitY + 4);
      ctx.clip();
      
      // Vertical Up/Down Gaze kinematics + subtle horizontal translation
      const vShift = this.currentY * 14;      // up/down head translation (looking up/down)
      const hShift = this.currentX * 6;       // subtle horizontal head center shift
      const vScale = 1.0 - Math.abs(this.currentY) * 0.025; // perspective head height adjust
      const hScale = 1.0 - Math.abs(this.currentX) * 0.02;  // subtle profile narrowing
      
      const pivotX = W * 0.5;
      const pivotY = 280; // Eye/Nose center level
      
      // Apply smooth 2D/3D head transformation
      ctx.translate(pivotX + hShift, pivotY + vShift);
      ctx.scale(hScale, vScale);
      ctx.translate(-pivotX, -pivotY);
      
      ctx.drawImage(headImg, 0, 0, W, H);
      ctx.restore();
    }
  }

  /**
   * Update scroll offset from external scroll handler
   */
  setScrollState(offsetY, scale, opacity) {
    this.scrollOffsetY = offsetY;
    this.scaleFactor = scale;
    this.opacity = opacity;
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

window.InteractiveCharacter360 = InteractiveCharacter360;
