import './style.css'
import * as THREE from 'three'

let scene, camera, renderer, particles, scrollY = 0;
const geometries = [];
const imagePlanes = [];
let currentSection = 0;
let currentPage = 'home';

const exploreState = {
  enabled: false,
  activeIndex: 0,
  spacing: 2.2,
  depth: -2,
  cameraPosition: new THREE.Vector3(0, 0.4, 2.4),
  cameraLookAt: new THREE.Vector3(0, 0, -2),
  scrollCooldown: 450,
  lastScrollAt: 0,
  isTransitioning: false,
  transition: null,
  lastDirection: 0,
  intro: null,
  ready: false
};

const baseScale = new THREE.Vector3(1, 1, 1);
const hoverScale = new THREE.Vector3(1.15, 1.15, 1.15);
const tmpVec3A = new THREE.Vector3();
const tmpVec3B = new THREE.Vector3();
const tmpVec3C = new THREE.Vector3();

const portfolioWorks = [
  {
    title: "Project Alpha",
    description: "Interactive 3D Experience",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop",
    fullDescription: "A cutting-edge 3D interactive experience that showcases advanced WebGL rendering techniques. This project demonstrates real-time particle systems, dynamic lighting, and complex mesh animations.",
    technologies: [
      { name: "WebGL 2.0", difficulty: "advanced", score: "9/10" },
      { name: "GLSL Shaders", difficulty: "advanced", score: "9/10" },
      { name: "Three.js", difficulty: "intermediate", score: "7/10" }
    ]
  },
  {
    title: "Project Beta", 
    description: "WebGL Animation Showcase",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600&fit=crop",
    fullDescription: "A comprehensive animation showcase featuring smooth transitions, morphing geometries, and fluid motion graphics. Optimized for performance across different devices.",
    technologies: [
      { name: "Three.js", difficulty: "intermediate", score: "8/10" },
      { name: "GSAP", difficulty: "intermediate", score: "7/10" },
      { name: "Canvas API", difficulty: "intermediate", score: "7/10" }
    ]
  },
  {
    title: "Project Gamma",
    description: "Immersive Storytelling",
    image: "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=800&h=600&fit=crop",
    fullDescription: "An immersive narrative experience combining 3D graphics with interactive storytelling. Users navigate through a richly detailed virtual environment with branching narratives.",
    technologies: [
      { name: "Babylon.js", difficulty: "intermediate", score: "8/10" },
      { name: "Game Physics", difficulty: "advanced", score: "8/10" },
      { name: "State Management", difficulty: "advanced", score: "8/10" }
    ]
  },
  {
    title: "Project Delta",
    description: "Digital Art Installation",
    image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&h=600&fit=crop",
    fullDescription: "A generative art installation that creates unique visual outputs based on real-time data inputs. Features algorithmic design patterns and dynamic color manipulation.",
    technologies: [
      { name: "Generative Art", difficulty: "advanced", score: "9/10" },
      { name: "Data Visualization", difficulty: "intermediate", score: "8/10" },
      { name: "WebGL", difficulty: "advanced", score: "8/10" }
    ]
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

function getDifficultyClass(difficulty) {
  switch(difficulty) {
    case 'beginner': return 'difficulty-beginner';
    case 'intermediate': return 'difficulty-intermediate';
    case 'advanced': return 'difficulty-advanced';
    default: return '';
  }
}

// REPLACE the openProjectModal function in main.js with this:

function openProjectModal(projectIndex) {
  const work = portfolioWorks[projectIndex];
  if (!work || work.placeholder) return;

  const modal = document.getElementById('cardModal');
  if (!modal) return;

  const modalImage = modal.querySelector('.modal-image');
  const modalTitle = modal.querySelector('h2');
  const modalDescription = modal.querySelector('.modal-description');
  const techTableBody = modal.querySelector('tbody');

  modalImage.src = work.image;
  modalImage.alt = work.title;
  modalTitle.textContent = work.title;
  modalDescription.textContent = work.fullDescription;

  techTableBody.innerHTML = work.technologies.map(tech => `
    <tr>
      <td>${tech.name}</td>
      <td><span class="difficulty-badge ${getDifficultyClass(tech.difficulty)}">${tech.difficulty}</span></td>
      <td>${tech.score}</td>
    </tr>
  `).join('');

  modal.classList.add('active');
}

function init() {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('canvas-container').appendChild(renderer.domElement);

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

  createImagePlanes();

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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xff006e, 1);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x3a86ff, 0.8);
  pointLight2.position.set(-5, -5, 5);
  scene.add(pointLight2);

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('scroll', onScroll);
  window.addEventListener('mousemove', onMouseMove);
}

function createImagePlanes() {
  const textureLoader = new THREE.TextureLoader();
  ensurePlaceholderWorks();
  
  portfolioWorks.forEach((work, index) => {
    const texture = work.placeholder
      ? createPlaceholderTexture(work)
      : textureLoader.load(work.image);
    
    const planeGeometry = new THREE.PlaneGeometry(1.5, 2.5);
    const planeMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    });
    
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    
    const angle = (index / portfolioWorks.length) * Math.PI * 2;
    const radius = 3.0;
    
    plane.position.x = Math.cos(angle) * radius * 3.7;
    plane.position.z = Math.sin(angle) * radius - 4;
    plane.position.y = (Math.random() - 2.5) * 1;
    
    plane.userData = {
      originalPosition: plane.position.clone(),
      originalRotation: plane.rotation.clone(),
      originalScale: plane.scale.clone(),
      index: index,
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
  
  setupInteraction();
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
      const index = clickedPlane.userData.index;

      if (work && !work.placeholder && work.fullDescription) {
        openProjectModal(index);
      }
    }
  }
  
  function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(imagePlanes);
    
    imagePlanes.forEach(plane => {
      plane.userData.hovered = false;
    });
    
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

function navigateTo(page) {
  if (exploreState.isTransitioning) return;
  if (currentPage === page) return;
  
  if (page === 'explore') {
    transitionToExplore();
  } else if (page === 'home') {
    transitionToHome();
  }
}

function transitionToExplore() {
  exploreState.enabled = true;
  exploreState.isTransitioning = true;
  exploreState.activeIndex = 0;
  exploreState.lastDirection = 0;
  currentPage = 'explore';

  document.querySelector('[data-page="home"]').style.display = 'none';
  document.querySelector('[data-page="explore"]').style.display = 'block';
  document.body.style.overflow = 'hidden';
  scrollY = 0;
  window.scrollTo(0, 0);

  prepareExploreLayout();

  exploreState.transition = {
    start: performance.now(),
    duration: 1200,
    fromCameraPosition: camera.position.clone(),
    fromCameraRotation: camera.rotation.clone()
  };

  imagePlanes.forEach((plane) => {
    plane.userData.transitionStartPosition = plane.position.clone();
    plane.userData.transitionStartRotation = plane.rotation.clone();
    plane.userData.transitionStartScale = plane.scale.clone();
    plane.userData.transitionStartOpacity = plane.material.opacity;
  });

  window.addEventListener('wheel', handleExploreWheel, { passive: false });
  window.addEventListener('keydown', handleExploreKeydown);
}

function transitionToHome() {
  exploreState.enabled = false;
  exploreState.isTransitioning = true;
  currentPage = 'home';

  document.querySelector('[data-page="explore"]').style.display = 'none';
  document.querySelector('[data-page="home"]').style.display = 'block';
  document.body.style.overflow = '';

  exploreState.transition = {
    start: performance.now(),
    duration: 1200,
    fromCameraPosition: camera.position.clone(),
    fromCameraRotation: camera.rotation.clone(),
    toHome: true
  };

  imagePlanes.forEach((plane) => {
    plane.userData.transitionStartPosition = plane.position.clone();
    plane.userData.transitionStartRotation = plane.rotation.clone();
    plane.userData.transitionStartScale = plane.scale.clone();
    plane.userData.transitionStartOpacity = plane.material.opacity;
  });

  window.removeEventListener('wheel', handleExploreWheel);
  window.removeEventListener('keydown', handleExploreKeydown);
}

function setupNavigation() {
  document.querySelectorAll('[data-navigate]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const target = button.getAttribute('data-navigate');
      navigateTo(target);
    });
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

function maintainExploreLayout() {
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

function updateTransition(now) {
  const { transition } = exploreState;
  if (!transition) return;

  const elapsed = now - transition.start;
  const progress = Math.min(1, elapsed / transition.duration);
  const eased = easeInOutCubic(progress);

  if (transition.toHome) {
    const targetPos = new THREE.Vector3(0, 0, 5);
    camera.position.copy(tmpVec3A.copy(transition.fromCameraPosition).lerp(targetPos, eased));
    camera.lookAt(0, 0, 0);

    imagePlanes.forEach((plane) => {
      plane.position.copy(
        tmpVec3B.copy(plane.userData.transitionStartPosition).lerp(plane.userData.originalPosition, eased)
      );
      
      const startScale = plane.userData.transitionStartScale.x;
      plane.scale.setScalar(THREE.MathUtils.lerp(startScale, 1, eased));

      plane.material.opacity = THREE.MathUtils.lerp(plane.userData.transitionStartOpacity, 1, eased);
      plane.material.needsUpdate = true;
    });
  } else {
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
  }

  if (progress >= 1) {
    exploreState.isTransitioning = false;
    exploreState.transition = null;
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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onScroll() {
  if (currentPage === 'home') {
    scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const section = Math.floor(scrollY / windowHeight);
    currentSection = Math.min(section, 2);
  }
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

  if (exploreState.isTransitioning && exploreState.transition) {
    updateTransition(now);
  } else if (exploreState.enabled) {
    maintainExploreLayout();
  } else {
    updateHomeCamera(scrollProgress);
    updateFloatingPlanes();
  }

  updateBackgroundGeometries();
  updateParticles(scrollProgress);

  renderer.render(scene, camera);
}

const cardData = {
  graphics: {
    title: "Graphics Programming",
    description: "Specializing in high-performance 3D graphics rendering with WebGL and advanced shader programming. Create stunning visual effects, particle systems, and real-time rendering pipelines that push the boundaries of web-based graphics.",
    tech: [
      { name: "WebGL 2.0", difficulty: "advanced", score: "9/10" },
      { name: "GLSL Shaders", difficulty: "advanced", score: "9/10" },
      { name: "Three.js", difficulty: "intermediate", score: "7/10" }
    ],
    links: [
      { text: "View Project Alpha", href: "/project-alpha" },
      { text: "View Project Beta", href: "/project-beta" }
    ]
  },
  game: {
    title: "Game Developer",
    description: "Create engaging game mechanics and interactive experiences using modern game engines and frameworks. From physics simulations to player controls and AI systems, bringing interactive entertainment to life.",
    tech: [
      { name: "Babylon.js", difficulty: "intermediate", score: "8/10" },
      { name: "Game Physics", difficulty: "advanced", score: "8/10" },
      { name: "Animation", difficulty: "intermediate", score: "7/10" }
    ],
    links: [
      { text: "View Project Gamma", href: "/project-gamma" },
      { text: "View Project Delta", href: "/project-delta" }
    ]
  },
  backend: {
    title: "Back-end Driven Programs",
    description: "Building robust server-side applications and real-time data synchronization systems. Seamlessly integrate frontend experiences with powerful backend infrastructure for scalable, production-grade applications.",
    tech: [
      { name: "Node.js", difficulty: "intermediate", score: "7/10" },
      { name: "Database Design", difficulty: "advanced", score: "8/10" },
      { name: "API Architecture", difficulty: "intermediate", score: "7/10" }
    ],
    links: [
      { text: "View Case Study", href: "/case-study-backend" },
      { text: "GitHub Repository", href: "https://github.com" }
    ]
  }
};

const modal = document.getElementById('cardModal');
const modalClose = modal.querySelector('.modal-close');
const cards = document.querySelectorAll('.project-card');

function openModal(cardKey) {
  const data = cardData[cardKey];
  
  const modalTitle = modal.querySelector('h2');
  const modalDescription = modal.querySelector('.modal-description');
  const tbody = modal.querySelector('tbody');
  
  modalTitle.textContent = data.title;
  modalDescription.textContent = data.description;
  
  tbody.innerHTML = data.tech.map(tech => `
    <tr>
      <td>${tech.name}</td>
      <td><span class="difficulty-badge ${getDifficultyClass(tech.difficulty)}">${tech.difficulty}</span></td>
      <td>${tech.score}</td>
    </tr>
  `).join('');
  
  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
}

cards.forEach(card => {
  card.addEventListener('click', () => {
    const cardKey = card.getAttribute('data-card');
    openModal(cardKey);
  });
});

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

const modalContent = modal.querySelector('.modal-content');
if (modalContent) {
  modalContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

init();
setupNavigation();
animate();

// Project Modal Event Listeners
const projectModal = document.getElementById('cardModal');
const projectModalClose = projectModal.querySelector('.modal-close');
const projectModalContent = projectModal.querySelector('.modal-content');

projectModalClose.addEventListener('click', () => {
  projectModal.classList.remove('active');
});

projectModal.addEventListener('click', (e) => {
  if (e.target === projectModal) {
    projectModal.classList.remove('active');
  }
});

projectModalContent.addEventListener('click', (e) => {
  e.stopPropagation();
});