import './style.css'
import * as THREE from 'three'

const pageType = document.body.dataset.page || 'home';

let scene, camera, renderer, particles, scrollY = 0;
const geometries = [];
const imagePlanes = [];
let currentSection = 0;

const exploreState = {
  enabled: pageType === 'explore',
  activeIndex: 0,
  spacing: 2.2,
  depth: -2,
  cameraPosition: new THREE.Vector3(0, 0.4, 2.4),
  cameraLookAt: new THREE.Vector3(0, 0, -2),
  scrollCooldown: 450,
  lastScrollAt: 0,
  isTransitioning: false,
  transition: null,
  navigationQueued: false,
  lastDirection: 0,
  transitionCover: null,
  intro: null,
  ready: pageType !== 'explore'
};

const baseScale = new THREE.Vector3(1, 1, 1);
const hoverScale = new THREE.Vector3(1.15, 1.15, 1.15);
const tmpVec3A = new THREE.Vector3();
const tmpVec3B = new THREE.Vector3();
const tmpVec3C = new THREE.Vector3();

// Portfolio works - Replace these URLs with your actual project images
const portfolioWorks = [
  {
    title: "Project Alpha",
    description: "Interactive 3D Experience",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop"
  },
  {
    title: "Project Beta", 
    description: "WebGL Animation Showcase",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600&fit=crop"
  },
  {
    title: "Project Gamma",
    description: "Immersive Storytelling",
    image: "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=800&h=600&fit=crop"
  },
  {
    title: "Project Delta",
    description: "Digital Art Installation",
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&h=600&fit=crop"
  }
];

const MIN_PLANE_COUNT = 7;
const placeholderColors = [
  '#1f2933',
  '#264653',
  '#233044',
  '#3d405b',
  '#2b2d42'
];

function ensurePlaceholderWorks() {
  if (portfolioWorks.length >= MIN_PLANE_COUNT) return;

  const needed = MIN_PLANE_COUNT - portfolioWorks.length;
  for (let i = 0; i < needed; i++) {
    const index = portfolioWorks.length + 1;
    portfolioWorks.push({
      title: `Upcoming ${index}`,
      description: "New project launching soon",
      placeholder: true,
      color: placeholderColors[i % placeholderColors.length]
    });
  }
}

function createPlaceholderTexture(work) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = work.color || '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 42px "Arial", sans-serif';
  ctx.textAlign = 'center';

  ctx.fillText('COMING SOON', canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = '28px "Arial", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(work.title, canvas.width / 2, canvas.height / 2 + 20);

  return new THREE.CanvasTexture(canvas);
}

function init() {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;
  if (exploreState.enabled) {
    camera.position.copy(exploreState.cameraPosition);
    camera.lookAt(exploreState.cameraLookAt);
  }

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  // Create floating geometric shapes
  const shapes = [
    new THREE.OctahedronGeometry(0.6),
    new THREE.IcosahedronGeometry(0.5),
    new THREE.TetrahedronGeometry(0.7)
  ];

  for (let i = 0; i < 20; i++) {
    const geometry = shapes[Math.floor(Math.random() * shapes.length)];
    const material = new THREE.MeshNormalMaterial({ 
      wireframe: true,
      transparent: true,
      opacity: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.x = (Math.random() - 0.5) * 20;
    mesh.position.y = (Math.random() - 0.5) * 20;
    mesh.position.z = (Math.random() - 0.5) * 15 - 5;
    
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    
    mesh.userData = {
      speedX: (Math.random() - 0.5) * 0.002,
      speedY: (Math.random() - 0.5) * 0.002,
      rotationSpeed: (Math.random() - 0.5) * 0.02
    };
    
    scene.add(mesh);
    geometries.push(mesh);
  }

  // Create image planes for portfolio works
  createImagePlanes();

  // Create particle system
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesCount = 8000;
  const positions = new Float32Array(particlesCount * 3);

  for (let i = 0; i < particlesCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 50;
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    color: 0xFFFF00,
    size: 0.02,
    transparent: true,
    opacity: 1.6
  });

  particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xff006e, 1);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x3a86ff, 0.8);
  pointLight2.position.set(-5, -5, 5);
  scene.add(pointLight2);

  window.addEventListener('resize', onWindowResize);
  if (pageType === 'home') {
    window.addEventListener('scroll', onScroll);
  }
  window.addEventListener('mousemove', onMouseMove);
}

function createImagePlanes() {
  const textureLoader = new THREE.TextureLoader();
  ensurePlaceholderWorks();
  
  portfolioWorks.forEach((work, index) => {
    // Load texture
    const texture = work.placeholder
      ? createPlaceholderTexture(work)
      : textureLoader.load(work.image);
    
    // Create plane geometry - closer view, smaller size
    const planeGeometry = new THREE.PlaneGeometry(1.5, 2.5);
    const planeMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    });
    
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    
    // Position planes closer to camera in a tighter arrangement
    const angle = (index / portfolioWorks.length) * Math.PI * 2;
    const radius = 3.0; // Much closer to camera
    
    plane.position.x = Math.cos(angle) * radius * 2;
    plane.position.z = Math.sin(angle) * radius - 4;
    plane.position.y = (Math.random() - 2.5) * 2;
    
    // Make planes face the camera
    // plane.lookAt(camera.position);
    
    plane.userData = {
      originalPosition: plane.position.clone(),
      originalRotation: plane.rotation.clone(),
      originalScale: plane.scale.clone(),
      index: index,
      targetOpacity: 1,
      currentOpacity: 1,
      work: work,
      hovered: false,
      linePosition: new THREE.Vector3(),
      lineRotation: new THREE.Euler(0, 0, 0),
      lineScale: 1,
      lineOpacity: 1,
      transitionStartPosition: null,
      transitionStartRotation: null,
      transitionStartScale: null,
      transitionStartOpacity: 1,
      introDelay: 0,
      introStartPosition: null,
      introStartScale: 1,
      introStartOpacity: 0
    };
    
    scene.add(plane);
    imagePlanes.push(plane);
  });
  
  // Add click and hover detection
  setupInteraction();

  initializeExploreLayoutIfNeeded();
}

function setupInteraction() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(imagePlanes);
    
    if (intersects.length > 0) {
      const clickedPlane = intersects[0].object;
      const work = clickedPlane.userData.work;

      if (work && work.link && !work.placeholder) {
        window.location.href = work.link;
      }
    }
  }
  
  function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(imagePlanes);
    
    // Reset all planes
    imagePlanes.forEach(plane => {
      plane.userData.hovered = false;
    });
    
    // Set hovered state
    if (intersects.length > 0) {
      document.body.style.cursor = 'pointer';
      intersects[0].object.userData.hovered = true;
    } else {
      document.body.style.cursor = 'default';
    }
  }
  
  window.addEventListener('click', onMouseClick);
  window.addEventListener('mousemove', onMouseMove);
}

function setupUIBindings() {
  if (pageType === 'home') {
    const exploreButton = document.querySelector('[data-action="explore"]');
    if (exploreButton) {
      exploreButton.addEventListener('click', (event) => {
        event.preventDefault();
        if (exploreState.isTransitioning || imagePlanes.length === 0) return;
        startExploreTransition();
      });
    }

    if (!exploreState.transitionCover) {
      const cover = document.createElement('div');
      cover.className = 'page-transition-cover';
      document.body.appendChild(cover);
      exploreState.transitionCover = cover;
    }
  }

  const backButton = document.querySelector('[data-action="back-home"]');
  if (backButton) {
    backButton.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = './index.html';
    });
  }
}

function initializeExploreLayoutIfNeeded() {
  if (!exploreState.enabled || imagePlanes.length === 0) return;

  exploreState.lastDirection = 0;

  if (!exploreState.transitionCover) {
    const cover = document.createElement('div');
    cover.className = 'page-transition-cover is-active';
    document.body.appendChild(cover);
    exploreState.transitionCover = cover;
  } else {
    exploreState.transitionCover.classList.add('is-active');
  }

  prepareExploreLayout();
  setupExploreIntro();

  camera.position.copy(exploreState.cameraPosition);
  camera.lookAt(exploreState.cameraLookAt);

  if (pageType === 'explore') {
    window.addEventListener('wheel', handleExploreWheel, { passive: false });
    window.addEventListener('keydown', handleExploreKeydown);
  }
}

function setupExploreIntro() {
  const now = performance.now();
  const delayStep = 110;
  const verticalSwing = 1.6;
  const depthOffset = 1.3;

  exploreState.intro = {
    start: now,
    duration: 900,
    delayStep,
    done: false
  };

  exploreState.ready = false;

  imagePlanes.forEach((plane, idx) => {
    plane.userData.introDelay = idx * delayStep;

    if (!plane.userData.linePosition) {
      plane.userData.linePosition = new THREE.Vector3();
    }

    const wobble = idx % 2 === 0 ? 1 : -1;
    plane.userData.introStartPosition = plane.userData.linePosition
      .clone()
      .add(new THREE.Vector3(wobble * 1.1, wobble * verticalSwing, -depthOffset));
    plane.userData.introStartScale = plane.userData.lineScale * 0.7;
    plane.userData.introStartOpacity = 0;

    plane.position.copy(plane.userData.introStartPosition);
    plane.scale.setScalar(plane.userData.introStartScale);
    plane.material.opacity = plane.userData.introStartOpacity;
    plane.material.needsUpdate = true;
  });
}

function startExploreTransition() {
  exploreState.enabled = true;
  exploreState.isTransitioning = true;
  exploreState.navigationQueued = false;
  exploreState.activeIndex = 0;
  exploreState.lastDirection = 0;

  prepareExploreLayout();

  exploreState.transition = {
    start: performance.now(),
    duration: 1300,
    fromCameraPosition: camera.position.clone(),
    fromCameraRotation: camera.rotation.clone()
  };

  if (exploreState.transitionCover) {
    exploreState.transitionCover.classList.remove('is-active');
  }

  imagePlanes.forEach((plane) => {
    plane.userData.transitionStartPosition = plane.position.clone();
    plane.userData.transitionStartRotation = plane.rotation.clone();
    plane.userData.transitionStartScale = plane.scale.clone();
    plane.userData.transitionStartOpacity = plane.material.opacity;
  });
}

function prepareExploreLayout() {
  if (imagePlanes.length === 0) return;

  const count = imagePlanes.length;
  const half = count / 2;
  const direction = exploreState.lastDirection;

  imagePlanes.forEach((plane, idx) => {
    let offset = idx - exploreState.activeIndex;

    if (offset > half || (direction > 0 && offset === half)) {
      offset -= count;
    }
    if (offset < -half || (direction < 0 && offset === -half)) {
      offset += count;
    }

    plane.userData.linePosition.set(offset * exploreState.spacing, 0, exploreState.depth);
    plane.userData.lineRotation.set(0, 0, 0);

    const isActive = idx === exploreState.activeIndex;
    plane.userData.lineScale = isActive ? 1.2 : 0.9;
    plane.userData.lineOpacity = isActive ? 1 : 0.55;
  });
}

function snapToExploreLayout() {
  imagePlanes.forEach((plane) => {
    plane.position.copy(plane.userData.linePosition);
    plane.rotation.copy(plane.userData.lineRotation);
    plane.scale.setScalar(plane.userData.lineScale);

    if (Math.abs(plane.material.opacity - plane.userData.lineOpacity) > 0.001) {
      plane.material.opacity = plane.userData.lineOpacity;
      plane.material.needsUpdate = true;
    }
  });

  camera.position.copy(exploreState.cameraPosition);
  camera.lookAt(exploreState.cameraLookAt);
}

function maintainExploreLayout(now) {
  if (exploreState.intro && !exploreState.ready) {
    if (playExploreIntro(now)) {
      exploreState.ready = true;
      exploreState.intro = null;
      snapToExploreLayout();
      if (exploreState.transitionCover) {
        requestAnimationFrame(() => {
          exploreState.transitionCover.classList.remove('is-active');
        });
      }
    }
    return;
  }

  imagePlanes.forEach((plane) => {
    plane.position.lerp(plane.userData.linePosition, 0.18);
    plane.rotation.x = THREE.MathUtils.lerp(plane.rotation.x, plane.userData.lineRotation.x, 0.18);
    plane.rotation.y = THREE.MathUtils.lerp(plane.rotation.y, plane.userData.lineRotation.y, 0.18);
    plane.rotation.z = THREE.MathUtils.lerp(plane.rotation.z, plane.userData.lineRotation.z, 0.18);

    const targetScale = plane.userData.lineScale * (plane.userData.hovered ? 1.05 : 1);
    tmpVec3C.setScalar(targetScale);
    plane.scale.lerp(tmpVec3C, 0.2);

    const targetOpacity = plane.userData.lineOpacity;
    const newOpacity = THREE.MathUtils.lerp(plane.material.opacity, targetOpacity, 0.22);
    if (Math.abs(newOpacity - plane.material.opacity) > 0.0001) {
      plane.material.opacity = newOpacity;
      plane.material.needsUpdate = true;
    }
  });

  camera.position.lerp(exploreState.cameraPosition, 0.12);
  camera.lookAt(exploreState.cameraLookAt);
}

function playExploreIntro(now) {
  if (!exploreState.intro) return true;

  const { start, duration } = exploreState.intro;
  let allComplete = true;

  imagePlanes.forEach((plane) => {
    const delay = plane.userData.introDelay || 0;
    const elapsed = now - start - delay;
    const clamped = Math.min(1, Math.max(0, elapsed / duration));

    if (clamped < 1) {
      allComplete = false;
    }

    const eased = easeOutQuint(clamped);

    if (plane.userData.introStartPosition) {
      plane.position.copy(
        tmpVec3B
          .copy(plane.userData.introStartPosition)
          .lerp(plane.userData.linePosition, eased)
      );
    }

    const startScale = plane.userData.introStartScale ?? plane.userData.lineScale;
    const targetScale = plane.userData.lineScale;
    plane.scale.setScalar(THREE.MathUtils.lerp(startScale, targetScale, eased));

    const startOpacity = plane.userData.introStartOpacity ?? 0;
    const targetOpacity = plane.userData.lineOpacity;
    const opacity = THREE.MathUtils.lerp(startOpacity, targetOpacity, eased);
    if (Math.abs(opacity - plane.material.opacity) > 0.0001) {
      plane.material.opacity = opacity;
      plane.material.needsUpdate = true;
    }
  });

  return allComplete;
}

function updateExploreTransition(now) {
  const { transition } = exploreState;
  if (!transition) return;

  const elapsed = now - transition.start;
  const progress = Math.min(1, elapsed / transition.duration);
  const eased = easeInOutCubic(progress);

  camera.position.copy(tmpVec3A.copy(transition.fromCameraPosition).lerp(exploreState.cameraPosition, eased));
  camera.lookAt(exploreState.cameraLookAt);

  imagePlanes.forEach((plane) => {
    if (plane.userData.transitionStartPosition) {
      plane.position.copy(
        tmpVec3B.copy(plane.userData.transitionStartPosition).lerp(plane.userData.linePosition, eased)
      );
    }

    if (plane.userData.transitionStartRotation) {
      plane.rotation.set(
        THREE.MathUtils.lerp(plane.userData.transitionStartRotation.x, plane.userData.lineRotation.x, eased),
        THREE.MathUtils.lerp(plane.userData.transitionStartRotation.y, plane.userData.lineRotation.y, eased),
        THREE.MathUtils.lerp(plane.userData.transitionStartRotation.z, plane.userData.lineRotation.z, eased)
      );
    }

    if (plane.userData.transitionStartScale) {
      const startScale = plane.userData.transitionStartScale.x;
      const targetScale = plane.userData.lineScale;
      plane.scale.setScalar(THREE.MathUtils.lerp(startScale, targetScale, eased));
    }

    const targetOpacity = plane.userData.lineOpacity;
    const startOpacity = plane.userData.transitionStartOpacity ?? plane.material.opacity;
    plane.material.opacity = THREE.MathUtils.lerp(startOpacity, targetOpacity, eased);
    plane.material.needsUpdate = true;
  });

  if (progress >= 1) {
    exploreState.isTransitioning = false;
    exploreState.transition = null;
    snapToExploreLayout();

    if (pageType === 'home' && !exploreState.navigationQueued) {
      exploreState.navigationQueued = true;
      if (exploreState.transitionCover) {
        requestAnimationFrame(() => {
          exploreState.transitionCover.classList.add('is-active');
        });
      }
      setTimeout(() => {
        window.location.href = './explore.html';
      }, 400);
    }
  }
}

function cycleExplore(direction) {
  if (!exploreState.enabled || exploreState.isTransitioning || !direction) return;

  const now = performance.now();
  if (now - exploreState.lastScrollAt < exploreState.scrollCooldown) return;

  exploreState.lastScrollAt = now;

  const count = imagePlanes.length;
  if (count === 0) return;

  exploreState.activeIndex = (exploreState.activeIndex + direction + count) % count;
  exploreState.lastDirection = direction;
  prepareExploreLayout();
}

function handleExploreWheel(event) {
  if (!exploreState.enabled || exploreState.isTransitioning) return;

  const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (Math.abs(delta) < 5) return;

  event.preventDefault();
  cycleExplore(delta > 0 ? 1 : -1);
}

function handleExploreKeydown(event) {
  if (!exploreState.enabled || exploreState.isTransitioning) return;

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault();
    cycleExplore(1);
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    cycleExplore(-1);
  }
}

function updateHomeCamera(scrollProgress) {
  camera.position.z = 5 - scrollProgress * 10;
  camera.position.y = scrollProgress * 3;
  camera.rotation.x = -scrollProgress * 0.3;
  camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.1;
}

function updateFloatingPlanes() {
  const time = Date.now() * 0.001;

  imagePlanes.forEach((plane, index) => {
    const floatY = Math.sin(time + index * 1.5) * 0.3;
    const floatX = Math.cos(time * 0.5 + index) * 0.5;

    plane.position.y = plane.userData.originalPosition.y + floatY;
    plane.position.x = plane.userData.originalPosition.x + floatX;

    plane.rotation.y += 0.008;
    plane.rotation.x = Math.sin(time + index) * 0.5;

    if (plane.userData.hovered) {
      plane.scale.lerp(hoverScale, 0.1);
    } else {
      plane.scale.lerp(baseScale, 0.1);
    }
  });
}

function updateBackgroundGeometries() {
  geometries.forEach(mesh => {
    mesh.rotation.x += mesh.userData.rotationSpeed;
    mesh.rotation.y += mesh.userData.rotationSpeed;
    mesh.position.x += mesh.userData.speedX;
    mesh.position.y += mesh.userData.speedY;

    if (Math.abs(mesh.position.x) > 10) mesh.userData.speedX *= -1;
    if (Math.abs(mesh.position.y) > 10) mesh.userData.speedY *= -1;
  });
}

function updateParticles(scrollProgress) {
  particles.rotation.y += 0.0003;
  particles.rotation.x = scrollProgress * Math.PI;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onScroll() {
  scrollY = window.scrollY;
  
  // Determine which section we're in (0 = hero, 1 = portfolio, 2 = contact)
  const windowHeight = window.innerHeight;
  const section = Math.floor(scrollY / windowHeight);
  currentSection = Math.min(section, 2);
}

let mouseX = 0, mouseY = 0;
function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
}

function animate(now = performance.now()) {
  requestAnimationFrame(animate);

  const scrollRange = Math.max(1, document.body.scrollHeight - window.innerHeight);
  const scrollProgress = scrollY / scrollRange;

  if (!exploreState.enabled) {
    updateHomeCamera(scrollProgress);
    updateFloatingPlanes();
  } else if (exploreState.isTransitioning && exploreState.transition) {
    updateExploreTransition(now);
  } else {
    maintainExploreLayout(now);
  }

  updateBackgroundGeometries();
  updateParticles(scrollProgress);

  renderer.render(scene, camera);
}

init();
setupUIBindings();
animate();