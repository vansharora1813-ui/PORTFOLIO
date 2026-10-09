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
  const essentialAssets = projectAssets.length;

  function startPreloading() {
    // Hide loader smoothly after preloading or max 800ms
    const fallbackTimer = setTimeout(() => {
      if (!isFramesReady) {
        isFramesReady = true;
        if (loaderBar) loaderBar.style.width = '100%';
        completeLoading();
      }
    }, 800);

    // 1. Preload project images and avatar
    projectAssets.forEach(src => {
      const img = new Image();
      img.onload = () => {
        onAssetProgress();
        if (src.includes('frame_000') && ctx) {
          drawCharacterFrame(0);
        }
      };
      img.onerror = onAssetProgress;
      img.src = src;
      characterFrames.push(img);
    });
  }

  function onAssetProgress() {
    loadedAssetsCount++;
    const progress = Math.min(100, (loadedAssetsCount / essentialAssets) * 100);
    if (loaderBar) loaderBar.style.width = `${progress}%`;

    if (loadedAssetsCount >= essentialAssets && !isFramesReady) {
      isFramesReady = true;
      setTimeout(completeLoading, 200);
    }
  }

  function completeLoading() {
    if (preloader) {
      preloader.style.pointerEvents = 'none';
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
        startEntranceSequence();
      }, 700);
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

    // Organic idle floating breathing waves (subtle, luxurious floating kinetics)
    const nowSec = performance.now() * 0.001;
    const idleWaveY = Math.sin(nowSec * 1.2) * 4.5;
    const idleWaveX = Math.cos(nowSec * 0.8) * 2.5;
    const idleOutlineY = Math.sin(nowSec * 0.95 + 1.2) * 3.5;
    const idleOutlineX = Math.cos(nowSec * 0.7 + 0.8) * -2;

    // 1. Character Container: Continuous 60 FPS mouse float + 3D perspective tilt
    if (characterContainer) {
      const tiltX = -currentNy * 8; // smooth 3D tilt pitch
      const tiltY = currentNx * 10;  // smooth 3D tilt yaw
      const charIdleY = Math.sin(nowSec * 1.4 + 0.5) * 3.5;
      characterContainer.style.transform = `translateX(calc(-50% + ${currentCharX}px)) translateY(${currentCharY + charScrollOffset + charIdleY}px) scale(${heroScale}) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      characterContainer.style.opacity = heroOpacity;
    }

    // 2. Solid Typography Lines (compounded with organic idle breathing wave)
    solidLines.forEach(line => {
      line.style.transform = `translate(${currentSolidX + idleWaveX}px, ${currentSolidY + idleWaveY + textScrollOffset}px) scale(${heroScale})`;
      line.style.opacity = heroOpacity;
    });

    // 3. Outline Typography Lines (phase-offset drift for kinetic depth)
    outlineLines.forEach(line => {
      line.style.transform = `translate(${currentOutlineX + idleOutlineX}px, ${currentOutlineY + idleOutlineY + textScrollOffset}px) scale(${heroScale})`;
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
      const centerY = heroH * 0.46;

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

  // Scroll Parallax & Stacking Card Dynamics
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    
    if (scrollY <= heroHeight * 1.1) {
      if (heroSection) heroSection.style.visibility = 'visible';
      charScrollOffset = -scrollY * 0.1;
      textScrollOffset = scrollY * 0.14;
      
      const progress = Math.min(1, Math.max(0, scrollY / heroHeight));
      // Subtle cinematic depth shrink as About card rises over hero
      heroScale = 1 - progress * 0.08;
      heroOpacity = Math.max(0.35, 1 - progress * 0.55);
      
      const fadeRatio = Math.max(0, 1 - scrollY / (heroHeight * 0.25));
      if (heroScroll) heroScroll.style.opacity = fadeRatio * 0.85;
    } else {
      if (heroSection) heroSection.style.visibility = 'hidden';
      heroOpacity = 0;
    }

    // Dynamic Navbar Theme Switch (White over Hero -> Blue over Light Sections)
    if (navbar) {
      if (scrollY > heroHeight * 0.45) {
        navbar.classList.add('scrolled-light');
      } else {
        navbar.classList.remove('scrolled-light');
      }
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
    
    // Anchor point for hanging thread (top center of column in unified coordinates)
    const anchor = { x: colWidth / 2, y: 0 };
    const cardWidth = 230;
    const cardHeight = 330;

    // Physics simulation state variables
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragOffset = { x: 0, y: 0 };
    let lastDragPos = { x: 0, y: 0 };

    const originalHang = { x: anchor.x, y: 120 };

    // Reset card wrapper initial positioning so JS translation controls it completely
    idCardWrapper.style.left = '0px';
    idCardWrapper.style.top = '0px';
    idCardWrapper.style.position = 'absolute';
    idCardWrapper.style.transformOrigin = 'center top';

    const card = {
      x: originalHang.x,
      y: originalHang.y, // top hook attachment position
      vx: 0,
      vy: 0,
      angle: 0,
      vAngle: 0
    };

    // Thread intermediate control point for smooth curving behavior
    const ctrl = {
      x: anchor.x,
      y: anchor.y + 60,
      vx: 0,
      vy: 0
    };

    // Physics targets
    const target = { x: card.x, y: card.y, angle: 0 };

    // Mouse proximity & 3D tilt tracking
    let mouse = { x: 0, y: 0, active: false };
    let mouseParallax = { x: 0, y: 0 };
    let tiltTarget = { x: 0, y: 0 };
    let currentTilt = { x: 0, y: 0 };

    // Handle interactive column sizing changes dynamically
    window.addEventListener('resize', () => {
      colWidth = aboutInteractiveCol.clientWidth;
      colHeight = aboutInteractiveCol.clientHeight;
      anchor.x = colWidth / 2;
      originalHang.x = anchor.x;
      if (!isDragging) {
        target.x = anchor.x;
      }
    });

    // Helper to get relative coordinates inside aboutInteractiveCol
    function getPointerPos(e) {
      const rect = aboutInteractiveCol.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    // Drag start handler (mousedown / touchstart)
    function onDragStart(e) {
      isDragging = true;
      idCardWrapper.classList.add('dragging');
      
      const pos = getPointerPos(e);
      dragStart.x = pos.x;
      dragStart.y = pos.y;
      
      // Store offset between click location and card center
      dragOffset.x = pos.x - card.x;
      dragOffset.y = pos.y - card.y;
      lastDragPos = { x: pos.x, y: pos.y };

      // Hide cue badge on drag
      if (clickCue) {
        clickCue.style.opacity = '0';
      }
    }

    // Drag move handler (mousemove / touchmove)
    function onDragMove(e) {
      const pos = getPointerPos(e);
      
      if (isDragging) {
        // Direct interactive tracking while dragging
        target.x = pos.x - dragOffset.x;
        target.y = pos.y - dragOffset.y;

        // Velocity tracking for natural release momentum
        card.vx = (pos.x - lastDragPos.x) * 0.85;
        card.vy = (pos.y - lastDragPos.y) * 0.85;
        lastDragPos = { x: pos.x, y: pos.y };

        // Card tilts naturally in drag direction
        const dragDx = target.x - anchor.x;
        target.angle = Math.max(-0.4, Math.min(0.4, dragDx * 0.0025));

        // 3D perspective tilt towards drag offset
        tiltTarget.y = Math.max(-20, Math.min(20, (pos.x - dragStart.x) * 0.15));
        tiltTarget.x = Math.max(-18, Math.min(18, -(pos.y - dragStart.y) * 0.15));
      } else {
        // Hover magnetic pull & tilt when not dragging
        mouse.x = pos.x;
        mouse.y = pos.y;
        mouse.active = true;

        const cardCenterX = card.x;
        const cardCenterY = card.y + cardHeight / 2;
        const dx = mouse.x - cardCenterX;
        const dy = mouse.y - cardCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 380) {
          const forceIntensity = (1 - dist / 380) * 16;
          mouseParallax.x = (dx / dist) * forceIntensity;
          mouseParallax.y = (dy / dist) * forceIntensity;

          const relX = Math.max(-1, Math.min(1, dx / (cardWidth * 0.8)));
          const relY = Math.max(-1, Math.min(1, dy / (cardHeight * 0.8)));
          tiltTarget.y = relX * 14;
          tiltTarget.x = -relY * 12;
        } else {
          mouseParallax.x = 0;
          mouseParallax.y = 0;
          tiltTarget.x = 0;
          tiltTarget.y = 0;
        }
      }
    }

    // Drag end / release handler (mouseup / touchend)
    function onDragEnd() {
      if (isDragging) {
        isDragging = false;
        idCardWrapper.classList.remove('dragging');

        // Snap back target to resting hanging position
        target.x = originalHang.x;
        target.y = originalHang.y;
        target.angle = 0;

        // Reset 3D tilt
        tiltTarget.x = 0;
        tiltTarget.y = 0;

        // Re-fade click cue badge
        if (clickCue) {
          setTimeout(() => {
            if (!isDragging) clickCue.style.opacity = '0.9';
          }, 600);
        }
      }
    }

    // Bind event listeners for Drag & Drop
    idCardWrapper.addEventListener('mousedown', onDragStart);
    idCardWrapper.addEventListener('touchstart', onDragStart, { passive: true });

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove', onDragMove, { passive: true });

    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);

    aboutSection.addEventListener('mouseleave', () => {
      onDragEnd();
      mouse.active = false;
      mouseParallax.x = 0;
      mouseParallax.y = 0;
      tiltTarget.x = 0;
      tiltTarget.y = 0;
    });

    let lastTime = performance.now();

    // 60FPS Physics Engine Loop
    function updateCardPhysics(now) {
      const dt = Math.min((now - lastTime) / 16.666, 2.0); // Normalize timestep (1.0 = 60fps)
      lastTime = now;

      // Physics model constants: snappy spring & soft damped bounce on release
      let springK = isDragging ? 0.35 : 0.045; // High responsiveness when dragging, soft rubber-band spring on snap back
      let damping = isDragging ? 0.65 : 0.87; // Smooth bounce on release
      let angK = 0.05;
      let angDamping = 0.86;

      const timeSec = now * 0.001;

      if (!isDragging) {
        // Natural idle sway when resting
        const swayAmpX = 10;
        const swayAmpY = 2.5;
        const swayFreq = 1.1;

        target.x = originalHang.x + Math.sin(timeSec * swayFreq) * swayAmpX;
        target.y = originalHang.y + Math.cos(timeSec * swayFreq * 2) * swayAmpY;
        target.angle = Math.sin(timeSec * swayFreq) * 0.03;

        if (mouse.active) {
          target.x += mouseParallax.x * 0.85;
          target.y += mouseParallax.y * 0.85;
          target.angle += (mouseParallax.x / 16) * 0.05;
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
      const ropeAngle = (card.x - anchor.x) * 0.0018;
      const targetRotation = isDragging ? target.angle : target.angle + ropeAngle;
      const torque = -angK * (card.angle - targetRotation);

      card.vAngle += torque * dt;
      card.vAngle *= Math.pow(angDamping, dt);
      card.angle += card.vAngle * dt;

      // Smooth 3D tilt spring solver
      currentTilt.x += (tiltTarget.x - currentTilt.x) * 0.12 * dt;
      currentTilt.y += (tiltTarget.y - currentTilt.y) * 0.12 * dt;

      // Mobile edge-pin safety bounds
      if (window.innerWidth < 768) {
        const minX = cardWidth / 2 - 10;
        const maxX = colWidth - cardWidth / 2 + 10;
        if (card.x < minX) { card.x = minX; card.vx = 0; }
        if (card.x > maxX) { card.x = maxX; card.vx = 0; }
      }

      // Thread Control Point Solver (dynamic curve bending while dragging)
      const attachX = card.x;
      const attachY = card.y + 136; // Exact center of top alloy hook ring in threadSvg space

      const midX = (anchor.x + attachX) / 2;
      const midY = (0 + attachY) / 2;

      // Control point sways away from anchor-to-hook vector for natural rope curve
      const pullDistX = attachX - anchor.x;
      const targetCtrlX = midX - pullDistX * 0.15;
      const targetCtrlY = midY + Math.min(100, Math.abs(pullDistX) * 0.2);

      const kCtrl = 0.08;
      const dCtrl = 0.82;

      const ctrlForceX = -kCtrl * (ctrl.x - targetCtrlX);
      const ctrlForceY = -kCtrl * (ctrl.y - targetCtrlY);

      ctrl.vx += ctrlForceX * dt;
      ctrl.vy += ctrlForceY * dt;
      ctrl.vx *= Math.pow(dCtrl, dt);
      ctrl.vy *= Math.pow(dCtrl, dt);

      ctrl.x += ctrl.vx * dt;
      ctrl.y += ctrl.vy * dt;

      // Connect top section border (0) -> ctrl -> card top hook attachment point
      threadPath.setAttribute('d', `M ${anchor.x} 0 Q ${ctrl.x} ${ctrl.y} ${attachX} ${attachY}`);
      
      const anchorRing = document.getElementById('threadAnchorRing');
      const anchorDot = document.getElementById('threadAnchorDot');
      if (anchorRing && anchorDot) {
        anchorRing.setAttribute('cx', anchor.x);
        anchorRing.setAttribute('cy', 0);
        anchorDot.setAttribute('cx', anchor.x);
        anchorDot.setAttribute('cy', 0);
      }

      // Transform card wrapper position
      const wrapperLeft = card.x - cardWidth / 2;
      const wrapperTop = card.y;
      idCardWrapper.style.transform = `translate3d(${wrapperLeft}px, ${wrapperTop}px, 0px) rotate(${card.angle}rad)`;

      // Apply 3D perspective tilt to idCard
      if (idCard) {
        idCard.style.transform = `rotateX(${currentTilt.x}deg) rotateY(${currentTilt.y}deg)`;
      }

      // Real-time specular glare deflection on holographic shine layer
      const cardShine = idCard.querySelector('.id-card-shine');
      if (cardShine) {
        const glossX = (currentTilt.y * 3) + (card.vx * 1.2);
        const glossY = (-currentTilt.x * 3) + (card.vy * 1.2);
        cardShine.style.transform = `translate3d(${glossX}px, ${glossY}px, 0px)`;
      }

      requestAnimationFrame(updateCardPhysics);
    }

    // Initialize coordinate values & launch loop
    card.x = anchor.x;
    card.y = 120;
    ctrl.x = anchor.x;
    ctrl.y = 130;

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

  // --------------------------------------------------------------------------
  // DYNAMIC SCROLL BACKGROUND TRANSITION ENGINE
  // --------------------------------------------------------------------------
  // Smoothly morphs background color as user scrolls down the page
  const bodyEl = document.body;
  const isHomePage = !!heroSection;

  function updateDynamicBackgroundOnScroll() {
    const scrollY = window.scrollY;
    const maxScroll = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    const progress = Math.min(1, Math.max(0, scrollY / maxScroll));

    if (isHomePage) {
      const heroHeight = window.innerHeight;
      if (scrollY <= 50) {
        bodyEl.style.backgroundColor = '#0574C5'; // pure hero blue
      } else if (scrollY > 50 && scrollY < heroHeight) {
        // Shift from hero blue to crisp surface light cream
        const ratio = (scrollY - 50) / (heroHeight - 50);
        bodyEl.style.backgroundColor = interpolateColor('#0574C5', '#FAF9F5', ratio);
      } else {
        // As you scroll deeper past About into bottom teasers: smooth subtle shift to dynamic teal/accent background tint
        const ratio = Math.min(1, (scrollY - heroHeight) / (heroHeight * 1.5));
        bodyEl.style.backgroundColor = interpolateColor('#FAF9F5', '#EBF4FA', ratio);
      }
    } else {
      // Subpages: skills.html maintains the signature light sky-blue from index.html (#C3E0F5)
      const isSkills = window.location.pathname.includes('skills');
      const ratio = Math.min(1, scrollY / (window.innerHeight * 0.8));
      if (isSkills) {
        bodyEl.style.backgroundColor = interpolateColor('#C3E0F5', '#B8DAF4', ratio);
      } else {
        bodyEl.style.backgroundColor = interpolateColor('#FAF9F5', '#EAF3FA', ratio);
      }
    }
  }

  // Color interpolation helper
  function interpolateColor(color1, color2, factor) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  window.addEventListener('scroll', updateDynamicBackgroundOnScroll, { passive: true });
  updateDynamicBackgroundOnScroll();

  // --------------------------------------------------------------------------
  // NAVIGATION ACTIVE LINK HIGHLIGHTER
  // --------------------------------------------------------------------------
  const path = window.location.pathname.toLowerCase();
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href').toLowerCase();
    if ((path.includes('work.html') && href.includes('work.html')) ||
        (path.includes('skills.html') && href.includes('skills.html')) ||
        (path.includes('contact.html') && href.includes('contact.html')) ||
        ((path.endsWith('/') || path.includes('index.html')) && (href === 'index.html' || href === '#about' || href === '#hero'))) {
      link.classList.add('active');
    }
  });

  // Navbar background change on scroll for subpages
  if (!isHomePage && navbar) {
    navbar.classList.add('navbar-subpage');
  }

  // --------------------------------------------------------------------------
  // WORK PAGE: CATEGORY FILTER TABS
  // --------------------------------------------------------------------------
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectItems = document.querySelectorAll('.project-item');

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.getAttribute('data-filter');
        projectItems.forEach(item => {
          const itemCat = item.getAttribute('data-category');
          if (category === 'all' || itemCat === category) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });
      });
    });
  }

  // --------------------------------------------------------------------------
  // SKILLS PAGE: ANIMATED PROGRESS BARS
  // --------------------------------------------------------------------------
  const skillFills = document.querySelectorAll('.skill-progress-fill');
  if (skillFills.length > 0) {
    const skillObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fill = entry.target;
          const targetWidth = fill.getAttribute('data-width') || '85%';
          fill.style.width = targetWidth;
          skillObserver.unobserve(fill);
        }
      });
    }, { threshold: 0.2 });

    skillFills.forEach(fill => skillObserver.observe(fill));
  }

  // --------------------------------------------------------------------------
  // CONTACT PAGE: FORM SUBMIT & COPY EMAIL
  // --------------------------------------------------------------------------
  const copyEmailBtn = document.getElementById('copyEmailBtn');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      const email = 'vansharora.contact@gmail.com';
      navigator.clipboard.writeText(email).then(() => {
        const origText = copyEmailBtn.innerHTML;
        copyEmailBtn.innerHTML = 'COPIED TO CLIPBOARD ✓';
        copyEmailBtn.style.background = '#00C853';
        copyEmailBtn.style.color = '#FFFFFF';
        setTimeout(() => {
          copyEmailBtn.innerHTML = origText;
          copyEmailBtn.style.background = '';
          copyEmailBtn.style.color = '';
        }, 2200);
      });
    });
  }

  const contactForm = document.getElementById('contactForm');
  const formSuccessMsg = document.getElementById('formSuccessMsg');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('.form-submit-btn');
      if (submitBtn) {
        submitBtn.innerHTML = 'SENDING... ⏳';
        submitBtn.disabled = true;
      }
      setTimeout(() => {
        if (submitBtn) submitBtn.innerHTML = 'MESSAGE SENT! ✓';
        if (formSuccessMsg) formSuccessMsg.style.display = 'block';
        contactForm.reset();
      }, 1000);
    });
  }

  // --------------------------------------------------------------------------
  // CRAFT ACCORDION: Interactive strip expansion
  // --------------------------------------------------------------------------
  const craftStrips = document.querySelectorAll('.craft-strip');
  craftStrips.forEach(strip => {
    strip.addEventListener('click', () => {
      if (strip.classList.contains('is-active')) return;
      craftStrips.forEach(s => s.classList.remove('is-active'));
      strip.classList.add('is-active');
    });
  });
});


/* ─────────────────────────────────────────────────────────────
   DISCIPLINES SECTION — Animated stat counters
   Counts up from 0 → target when section enters the viewport
   ───────────────────────────────────────────────────────────── */
(function initDisCounters() {
  const counters = document.querySelectorAll(
    '.craft-metric-val[data-target]'
  );
  if (!counters.length) return;

  const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(ease(progress) * target);
      el.textContent = value;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach((el) => observer.observe(el));
})();


/* ─────────────────────────────────────────────────────────────
   CRAFT SECTION — GSAP ScrollTrigger entrance animations
   ───────────────────────────────────────────────────────────── */
(function initCraftGSAP() {
  // Wait for GSAP to be available
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    // Retry after scripts load
    window.addEventListener('load', initCraftGSAP);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Stagger the strips in from below
  gsap.from('.craft-strip', {
    y: 80,
    opacity: 0,
    duration: 1,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.craft-accordion',
      start: 'top 80%',
      once: true
    }
  });

  // Animate the section header
  gsap.from('.dis-header', {
    y: 40,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.disciplines-section',
      start: 'top 75%',
      once: true
    }
  });

  // Animate closing statement
  gsap.from('.dis-closing', {
    y: 30,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.dis-closing',
      start: 'top 90%',
      once: true
    }
  });
})();

/* ─────────────────────────────────────────────────────────────
   GLOBAL SOUND EFFECTS SYSTEM (Web Audio API Synthesizer)
   ───────────────────────────────────────────────────────────── */
(function initSoundEffects() {
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Audio unlock listener for browser autoplay policy
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => getAudioCtx(), { once: true });
  });

  function playButtonClick() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (err) {}
  }

  function playCardClick() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch (err) {}
  }

  function playHoverTick() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1700, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch (err) {}
  }

  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button, .craft-strip, .id-card, .about-stats-strip, .nav-link, .nav-cta, .editorial-compact-initiate-btn, .editorial-primary-btn, .card, .project-card, [role="button"]');
    if (!target) return;
    if (target.matches('.craft-strip, .id-card, .about-stats-strip, .card, .project-card')) {
      playCardClick();
    } else {
      playButtonClick();
    }
  });

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('a, button, .craft-strip, .id-card, .about-stats-strip, .nav-link, .card, .project-card');
    if (target && !target.dataset.sfxHover) {
      playHoverTick();
      target.dataset.sfxHover = 'true';
      setTimeout(() => { delete target.dataset.sfxHover; }, 180);
    }
  });
})();

