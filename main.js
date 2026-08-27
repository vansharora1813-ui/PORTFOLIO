/* ==========================================================================
   PORTFOLIO INTERACTIVE LOGIC — VANSH ARORA
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const preloader = document.getElementById('preloader');
  const loaderBar = document.getElementById('loaderBar');
  
  const heroSection = document.getElementById('hero');
  const characterContainer = document.getElementById('heroCharacterContainer');
  const characterCanvas = document.getElementById('heroCharacterCanvas');
  const ctx = characterCanvas ? characterCanvas.getContext('2d', { alpha: true }) : null;
  
  const solidLines = document.querySelectorAll('.hero-line-solid');
  const outlineLines = document.querySelectorAll('.hero-line-outline');
  const allLines = document.querySelectorAll('.hero-line');
  
  const heroScroll = document.getElementById('heroScroll');
  const heroFooterInfo = document.getElementById('heroFooterInfo');
  const navbar = document.querySelector('.navbar');

  // Total frames in the character sequence
  const TOTAL_FRAMES = 240;
  const characterFrames = [];
  let isFramesReady = false;

  // Preload initial keyframes & project images
  const projectAssets = [
    'assets/character_frames/frame_000.webp',
    'assets/projects/aura.png',
    'assets/projects/vortex.png',
    'assets/projects/chronos.png'
  ];

  let loadedAssetsCount = 0;
  const essentialAssets = projectAssets.length + 30; // essential threshold to start

  function startPreloading() {
    // 1. Preload project images & initial character frames
    projectAssets.forEach(src => {
      const img = new Image();
      img.onload = onAssetProgress;
      img.onerror = onAssetProgress;
      img.src = src;
    });

    // 2. Load all 240 character frames asynchronously
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.onload = () => {
        if (i < 30) onAssetProgress();
        if (i === 0 && ctx) {
          drawCharacterFrame(0);
        }
      };
      img.src = `assets/character_frames/frame_${String(i).padStart(3, '0')}.webp`;
      characterFrames.push(img);
    }
  }

  function onAssetProgress() {
    loadedAssetsCount++;
    const progress = Math.min(100, (loadedAssetsCount / essentialAssets) * 100);
    if (loaderBar) loaderBar.style.width = `${progress}%`;

    if (loadedAssetsCount >= essentialAssets && !isFramesReady) {
      isFramesReady = true;
      setTimeout(completeLoading, 350);
    }
  }

  function completeLoading() {
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
        startEntranceSequence();
      }, 800);
    }
  }

  // Draw a specific frame to the hero character canvas
  let lastDrawnFrame = -1;
  function drawCharacterFrame(frameIndex) {
    if (!ctx || !characterCanvas) return;
    const safeIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameIndex)));
    if (safeIdx === lastDrawnFrame) return;
    
    const img = characterFrames[safeIdx];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.clearRect(0, 0, characterCanvas.width, characterCanvas.height);
      ctx.drawImage(img, 0, 0, characterCanvas.width, characterCanvas.height);
      lastDrawnFrame = safeIdx;
    }
  }

  // Trigger CSS Entrance Sequence
  function startEntranceSequence() {
    document.body.classList.add('loaded');

    setTimeout(() => {
      if (characterContainer) characterContainer.style.transition = 'none';
      if (heroFooterInfo) heroFooterInfo.style.transition = 'none';
      allLines.forEach(line => {
        line.style.transition = 'none';
      });
    }, 1800);
  }

  // Direction Mapping: select exact crisp directional pose frame
  // Frame 0: Center Neutral
  // Frame 30: Looking Left
  // Frame 78: Looking Right
  // Frame 135: Looking Down
  // Frame 175: Looking Up
  function getFrameForDirection(nx, ny) {
    const r = Math.hypot(nx, ny);
    if (r < 0.12) return 0; // neutral center
    
    const absX = Math.abs(nx);
    const absY = Math.abs(ny);
    
    if (absX >= absY) {
      return nx < 0 ? 30 : 78;
    } else {
      return ny < 0 ? 175 : 135;
    }
  }

  // Mouse & Physics State
  let isMouseInHero = false;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  let targetNx = 0, targetNy = 0;
  let currentNx = 0, currentNy = 0;
  let currentFrameFloat = 0;

  let targetCharX = 0, targetCharY = 0;
  let currentCharX = 0, currentCharY = 0;
  let targetSolidX = 0, targetSolidY = 0;
  let currentSolidX = 0, currentSolidY = 0;
  let targetOutlineX = 0, targetOutlineY = 0;
  let currentOutlineX = 0, currentOutlineY = 0;

  let charScrollOffset = 0;
  let textScrollOffset = 0;
  let heroScale = 1;
  let heroOpacity = 1;

  // Cached hero dimensions
  let heroRect = heroSection ? heroSection.getBoundingClientRect() : null;
  function updateHeroBounds() {
    if (heroSection) heroRect = heroSection.getBoundingClientRect();
  }
  window.addEventListener('resize', updateHeroBounds);

  // 60 FPS Physics & Render Loop
  function updateHeroKinetics() {
    const ease = 0.08; // Damping factor

    // Interpolate normalized position
    currentNx += (targetNx - currentNx) * ease;
    currentNy += (targetNy - currentNy) * ease;

    currentCharX += (targetCharX - currentCharX) * ease;
    currentCharY += (targetCharY - currentCharY) * ease;

    currentSolidX += (targetSolidX - currentSolidX) * ease;
    currentSolidY += (targetSolidY - currentSolidY) * ease;

    currentOutlineX += (targetOutlineX - currentOutlineX) * ease;
    currentOutlineY += (targetOutlineY - currentOutlineY) * ease;

    // Select target directional frame without wild timeline jumps
    const targetFrameIdx = getFrameForDirection(currentNx, currentNy);
    
    // Smooth frame transition
    const frameDiff = targetFrameIdx - currentFrameFloat;
    if (Math.abs(frameDiff) > 0.5) {
      currentFrameFloat += frameDiff * 0.2;
    } else {
      currentFrameFloat = targetFrameIdx;
    }

    drawCharacterFrame(currentFrameFloat);

    // 1. Character Container: Continuous 60 FPS mouse float + 3D perspective tilt
    if (characterContainer) {
      const tiltX = -currentNy * 8; // smooth 3D tilt pitch
      const tiltY = currentNx * 10;  // smooth 3D tilt yaw
      characterContainer.style.transform = `translateX(calc(-50% + ${currentCharX}px)) translateY(${currentCharY + charScrollOffset}px) scale(${heroScale}) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      characterContainer.style.opacity = heroOpacity;
    }

    // 2. Solid Typography Lines
    solidLines.forEach(line => {
      line.style.transform = `translate(${currentSolidX}px, ${currentSolidY + textScrollOffset}px) scale(${heroScale})`;
      line.style.opacity = heroOpacity;
    });

    // 3. Outline Typography Lines
    outlineLines.forEach(line => {
      line.style.transform = `translate(${currentOutlineX}px, ${currentOutlineY + textScrollOffset}px) scale(${heroScale})`;
      line.style.opacity = heroOpacity * 0.65;
    });

    // 4. Hero Footer Info
    if (heroFooterInfo) {
      heroFooterInfo.style.opacity = heroOpacity;
    }

    requestAnimationFrame(updateHeroKinetics);
  }

  // Launch kinetics loop
  requestAnimationFrame(updateHeroKinetics);

  // Mouse Listeners (Desktop only)
  if (!isTouchDevice) {
    document.addEventListener('mouseenter', () => {
      isMouseInHero = true;
    });

    document.addEventListener('mouseleave', () => {
      isMouseInHero = false;
      targetNx = 0;
      targetNy = 0;
      targetCharX = 0;
      targetCharY = 0;
      targetSolidX = 0;
      targetSolidY = 0;
      targetOutlineX = 0;
      targetOutlineY = 0;
    });

    document.addEventListener('mousemove', (e) => {
      if (window.scrollY > window.innerHeight) return;
      isMouseInHero = true;

      const heroW = window.innerWidth;
      const heroH = window.innerHeight;
      const centerX = heroW / 2;
      const centerY = heroH * 0.45;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // Normalized coordinates [-1.0, 1.0]
      const ndx = Math.max(-1, Math.min(1, dx / (heroW * 0.45)));
      const ndy = Math.max(-1, Math.min(1, dy / (heroH * 0.45)));

      targetNx = ndx;
      targetNy = ndy;

      // Multi-layer parallax depth targets
      targetCharX = ndx * 12;
      targetCharY = ndy * 10;

      targetSolidX = -ndx * 8;
      targetSolidY = -ndy * 6;

      targetOutlineX = -ndx * 5;
      targetOutlineY = -ndy * 4;
    });
  }

  // Scroll Offsets Update
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    
    if (scrollY <= heroHeight) {
      if (heroSection) heroSection.style.visibility = 'visible';
      charScrollOffset = -scrollY * 0.15;
      textScrollOffset = scrollY * 0.2;
      
      const progress = scrollY / heroHeight;
      heroScale = 1 - progress * 0.15;
      heroOpacity = Math.max(0, 1 - progress * 1.25);
      
      const fadeRatio = Math.max(0, 1 - scrollY / (heroHeight * 0.3));
      if (heroScroll) heroScroll.style.opacity = fadeRatio * 0.85;
    } else {
      if (heroSection) heroSection.style.visibility = 'hidden';
      heroOpacity = 0;
    }
  }, { passive: true });

  // Start preloading
  startPreloading();

  // --------------------------------------------------------------------------
  // INTERACTIVE ID CARD PHYSICS ENGINE
  // --------------------------------------------------------------------------
  const aboutInteractiveCol = document.getElementById('aboutInteractiveCol');
  const idCardWrapper = document.getElementById('idCardWrapper');
  const idCard = document.getElementById('idCard');
  const threadPath = document.getElementById('threadPath');
  const clickCue = document.getElementById('clickCue');
  const aboutSection = document.getElementById('about');

  if (aboutInteractiveCol && idCardWrapper && idCard && threadPath) {
    // Column dimensions
    let colWidth = aboutInteractiveCol.clientWidth;
    let colHeight = aboutInteractiveCol.clientHeight;
    
    // Anchor point for hanging thread (top center of column in SVG coordinates)
    const anchor = { x: colWidth / 2, y: 0 };
    const cardWidth = 275;
    const cardHeight = 390;

    // Reset card wrapper initial positioning so JS translation controls it completely
    idCardWrapper.style.left = '0px';
    idCardWrapper.style.top = '0px';
    idCardWrapper.style.position = 'absolute';
    idCardWrapper.style.transformOrigin = 'center top';

    // Physics simulation state variables
    let state = 'hanging'; // hanging, tension, releasing, floating
    let stateTimer = 0;

    const card = {
      x: anchor.x,
      y: anchor.y + 260, // initial hang distance
      vx: 0,
      vy: 0,
      angle: 0,
      vAngle: 0
    };

    // Thread intermediate control point for smooth curving behavior
    const ctrl = {
      x: anchor.x,
      y: anchor.y + 130,
      vx: 0,
      vy: 0
    };

    // Physics targets
    const target = { x: card.x, y: card.y, angle: 0 };

    // Mouse proximity tracking
    let mouse = { x: 0, y: 0, active: false };
    let mouseParallax = { x: 0, y: 0 };

    // Handle interactive column sizing changes dynamically
    window.addEventListener('resize', () => {
      colWidth = aboutInteractiveCol.clientWidth;
      colHeight = aboutInteractiveCol.clientHeight;
      anchor.x = colWidth / 2;
      
      if (state === 'hanging' || state === 'tension') {
        card.x = anchor.x;
        target.x = anchor.x;
      }
    });

    // Track mouse coordinates over the About section
    aboutSection.addEventListener('mousemove', (e) => {
      const rect = aboutInteractiveCol.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;

      // Calculate distance to card center
      const cardCenterX = card.x;
      const cardCenterY = card.y + cardHeight / 2 - 140; // adjust coordinate system offset
      const dx = mouse.x - cardCenterX;
      const dy = mouse.y - cardCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 380) {
        // Subtle magnetic pull and rotation towards cursor
        const forceIntensity = (1 - dist / 380) * 16;
        mouseParallax.x = (dx / dist) * forceIntensity;
        mouseParallax.y = (dy / dist) * forceIntensity;
      } else {
        mouseParallax.x = 0;
        mouseParallax.y = 0;
      }
    });

    aboutSection.addEventListener('mouseleave', () => {
      mouse.active = false;
      mouseParallax.x = 0;
      mouseParallax.y = 0;
    });

    // Click handler to initiate transition sequences
    idCardWrapper.addEventListener('click', () => {
      if (state === 'hanging') {
        state = 'tension';
        stateTimer = Date.now();
        
        // Stiffen card visual feedback
        idCard.style.cursor = 'default';
        if (clickCue) {
          clickCue.style.opacity = '0';
          setTimeout(() => {
            clickCue.style.display = 'none';
          }, 300);
        }
      }
    });

    let lastTime = performance.now();

    // 60FPS Physics Engine Loop
    function updateCardPhysics(now) {
      const dt = Math.min((now - lastTime) / 16.666, 2.0); // Normalize timestep (1.0 = 60fps)
      lastTime = now;

      // Physics model constants
      let springK = 0.035;
      let damping = 0.88;
      let angK = 0.045;
      let angDamping = 0.88;
      let curveDrape = 0;

      const timeSec = now * 0.001;

      // State Resolver
      if (state === 'hanging') {
        // Natural idle sway
        const swayAmpX = 14;
        const swayAmpY = 3;
        const swayFreq = 1.1;

        target.x = anchor.x + Math.sin(timeSec * swayFreq) * swayAmpX;
        target.y = anchor.y + 260 + Math.cos(timeSec * swayFreq * 2) * swayAmpY;
        target.angle = Math.sin(timeSec * swayFreq) * 0.035;

        // Apply mouse proximity reactions
        if (mouse.active) {
          target.x += mouseParallax.x * 0.85;
          target.y += mouseParallax.y * 0.85;
          target.angle += (mouseParallax.x / 16) * 0.06;
        }

      } else if (state === 'tension') {
        // Pull card straight upward tightening the thread
        springK = 0.14; // Stiff response
        damping = 0.72;
        target.x = anchor.x;
        target.y = anchor.y + 225; // upward pull
        target.angle = -0.015;

        if (Date.now() - stateTimer > 250) {
          // Release phase: Launch and swing card rightward
          state = 'releasing';
          stateTimer = Date.now();
          card.vx = 24;      // launch velocity
          card.vy = -7;
          card.vAngle = 0.22; // rotation spin kick
        }

      } else if (state === 'releasing') {
        // Swing state with high momentum and low damping
        springK = 0.024;
        damping = 0.95;
        angK = 0.028;
        angDamping = 0.95;

        const targetFloatX = anchor.x + colWidth * 0.18;
        const targetFloatY = anchor.y + 360;

        target.x = targetFloatX;
        target.y = targetFloatY;
        target.angle = (card.x - anchor.x) * 0.0016;

        if (Date.now() - stateTimer > 1800) {
          state = 'floating';
        }

      } else if (state === 'floating') {
        // Idle organic float state
        springK = 0.024;
        damping = 0.91;
        angK = 0.036;
        angDamping = 0.9;
        curveDrape = 90; // allow curve drape

        // Complex sine combinations for noise-free organic drifting
        const floatX = Math.sin(timeSec * 0.7) * 18 + Math.cos(timeSec * 1.4) * 6;
        const floatY = Math.cos(timeSec * 0.5) * 15 + Math.sin(timeSec * 1.15) * 6;
        const floatAngle = Math.sin(timeSec * 0.4) * 0.05 + Math.cos(timeSec * 1.1) * 0.02;

        const sideOffset = window.innerWidth < 768 ? colWidth * 0.05 : colWidth * 0.22;
        const targetFloatX = anchor.x + sideOffset + floatX;
        const targetFloatY = anchor.y + (window.innerWidth < 768 ? 260 : 360) + floatY;

        target.x = targetFloatX;
        target.y = targetFloatY;
        target.angle = floatAngle;

        // Mouse displacement react
        if (mouse.active) {
          target.x += mouseParallax.x * 1.15;
          target.y += mouseParallax.y * 1.15;
          target.angle += (mouseParallax.x / 16) * 0.08;
        }
      }

      // Card Vector Solver (Hooke's spring + Damping)
      const fx = -springK * (card.x - target.x);
      const fy = -springK * (card.y - target.y);

      card.vx += fx * dt;
      card.vy += fy * dt;
      card.vx *= Math.pow(damping, dt);
      card.vy *= Math.pow(damping, dt);

      card.x += card.vx * dt;
      card.y += card.vy * dt;

      // Angular Rotational Solver
      const ropeAngle = (card.x - anchor.x) * 0.0016;
      const targetRotation = target.angle + (state === 'floating' ? ropeAngle * 0.45 : ropeAngle);
      const torque = -angK * (card.angle - targetRotation);

      card.vAngle += torque * dt;
      card.vAngle *= Math.pow(angDamping, dt);
      card.angle += card.vAngle * dt;

      // Mobile edge-pin safety bounds
      if (window.innerWidth < 768) {
        const minX = cardWidth / 2 - 10;
        const maxX = colWidth - cardWidth / 2 + 10;
        if (card.x < minX) { card.x = minX; card.vx = 0; }
        if (card.x > maxX) { card.x = maxX; card.vx = 0; }
      }

      // Thread Control Point Solver (middle coordinate follow with drag/lag physics)
      const midX = (anchor.x + card.x) / 2;
      const midY = (anchor.y + card.y) / 2;

      // Shift control point slightly left/right against pull for natural curve curvature
      const targetCtrlX = midX + (state === 'floating' ? (card.x - anchor.x) * -0.15 : 0);
      const targetCtrlY = midY + curveDrape;

      const kCtrl = 0.05;
      const dCtrl = 0.86;

      const ctrlForceX = -kCtrl * (ctrl.x - targetCtrlX);
      const ctrlForceY = -kCtrl * (ctrl.y - targetCtrlY);

      ctrl.vx += ctrlForceX * dt;
      ctrl.vy += ctrlForceY * dt;
      ctrl.vx *= Math.pow(dCtrl, dt);
      ctrl.vy *= Math.pow(dCtrl, dt);

      ctrl.x += ctrl.vx * dt;
      ctrl.y += ctrl.vy * dt;

      // Connect anchor -> ctrl -> card attachment point via Quadratic Bezier curve
      threadPath.setAttribute('d', `M ${anchor.x} ${anchor.y} Q ${ctrl.x} ${ctrl.y} ${card.x} ${card.y}`);

      // Transform card wrapper position
      const wrapperLeft = card.x - cardWidth / 2;
      const wrapperTop = card.y - 140; // Offset SVG height offset
      idCardWrapper.style.transform = `translate3d(${wrapperLeft}px, ${wrapperTop}px, 0px) rotate(${card.angle}rad)`;

      // Subtle real-time glare deflection effect on card shine overlay
      const cardShine = idCard.querySelector('.id-card-shine');
      if (cardShine) {
        const skewDeg = card.angle * (180 / Math.PI) * -0.7;
        const glossTranslate = card.vx * 0.45;
        cardShine.style.transform = `skewX(${skewDeg}deg) translateX(${glossTranslate}%)`;
      }

      requestAnimationFrame(updateCardPhysics);
    }

    // Initialize coordinate values & launch loop
    card.x = anchor.x;
    card.y = anchor.y + 260;
    ctrl.x = anchor.x;
    ctrl.y = anchor.y + 130;

    requestAnimationFrame(updateCardPhysics);
  }

  // Scroll Reveal Observer for Sections
  const revealElements = document.querySelectorAll('.reveal-element');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });
});
