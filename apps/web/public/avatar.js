// AURA 3D Avatar & Voice Engine
let scene, camera, renderer, controls;
let avatarGroup, headMesh, mouthMesh, eyeLeft, eyeRight, neck, bodyMesh, armLeft, armRight;
let isSpeaking = false;
let currentActivity = 'idle';
let clock = new THREE.Clock();

// Initialize Speech Synthesis
const synth = window.speechSynthesis;
let voices = [];
const voiceSelect = document.getElementById('voiceSelect');
const subtitlesBox = document.getElementById('subtitlesBox');
const speakInput = document.getElementById('speakInput');
const speakBtn = document.getElementById('speakBtn');
const micBtn = document.getElementById('micBtn');
const avatarStateText = document.getElementById('avatarStateText');
const avatarUploadBtn = document.getElementById('avatarUploadBtn');
const glbFileInput = document.getElementById('glbFileInput');

function populateVoices() {
  voices = synth.getVoices();
  voiceSelect.innerHTML = '';
  
  // Prioritize Hindi / Indian voices
  const sorted = voices.sort((a, b) => {
    const aIsHi = a.lang.includes('hi') || a.lang.includes('IN');
    const bIsHi = b.lang.includes('hi') || b.lang.includes('IN');
    return bIsHi - aIsHi;
  });

  sorted.forEach((v, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = `${v.name} (${v.lang})`;
    if (v.lang.includes('hi') || v.lang.includes('IN')) {
      opt.selected = true;
    }
    voiceSelect.appendChild(opt);
  });
}

populateVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoices;
}

// ----------------------------------------------------
// Three.js 3D Avatar Setup
// ----------------------------------------------------
function init3D() {
  const container = document.getElementById('canvasContainer');
  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a13, 0.08);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 1.45, 2.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1.4, 0);
  controls.minDistance = 1.2;
  controls.maxDistance = 4.5;
  controls.maxPolarAngle = Math.PI / 2;

  // Studio Lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 0.8);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
  keyLight.position.set(3, 4, 3);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc084fc, 0.8);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x34d399, 1.2);
  rimLight.position.set(0, 3, -3);
  scene.add(rimLight);

  // Ground Grid Floor
  const grid = new THREE.GridHelper(20, 40, 0x38bdf8, 0x112233);
  grid.position.y = 0;
  scene.add(grid);

  // Build Procedural High-Detail 3D Cyber-Humanoid Avatar
  createHumanoidAvatar();

  window.addEventListener('resize', onWindowResize);
  animate();
}

function createHumanoidAvatar() {
  avatarGroup = new THREE.Group();

  // Materials
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0ac69, // Warm skin tone
    roughness: 0.45,
    metalness: 0.1
  });

  const suitMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.4
  });

  const glowCyanMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.6
  });

  // Body / Torso
  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.6, 32);
  bodyMesh = new THREE.Mesh(bodyGeo, suitMaterial);
  bodyMesh.position.y = 1.0;
  avatarGroup.add(bodyMesh);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.12, 16);
  neck = new THREE.Mesh(neckGeo, skinMaterial);
  neck.position.y = 1.34;
  avatarGroup.add(neck);

  // Head (Parent for face, eyes, mouth)
  const headGeo = new THREE.SphereGeometry(0.16, 32, 32);
  headMesh = new THREE.Mesh(headGeo, skinMaterial);
  headMesh.position.y = 1.50;
  headMesh.scale.set(0.95, 1.15, 1.0);
  avatarGroup.add(headMesh);

  // Hair / Stylized Crown
  const hairGeo = new THREE.SphereGeometry(0.17, 24, 24);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.9 });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.set(0, 0.04, -0.02);
  headMesh.add(hair);

  // Eyes (Left & Right)
  const eyeGeo = new THREE.SphereGeometry(0.025, 16, 16);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.4 });
  eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
  eyeLeft.position.set(-0.06, 0.02, 0.14);
  headMesh.add(eyeLeft);

  eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
  eyeRight.position.set(0.06, 0.02, 0.14);
  headMesh.add(eyeRight);

  // Mouth for Real-Time Lip-Sync
  const mouthGeo = new THREE.BoxGeometry(0.06, 0.015, 0.02);
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x881337 });
  mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.position.set(0, -0.07, 0.14);
  headMesh.add(mouthMesh);

  // Arms (Left & Right)
  const armGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.5, 16);
  armLeft = new THREE.Mesh(armGeo, suitMaterial);
  armLeft.position.set(-0.32, 0.95, 0);
  avatarGroup.add(armLeft);

  armRight = new THREE.Mesh(armGeo, suitMaterial);
  armRight.position.set(0.32, 0.95, 0);
  avatarGroup.add(armRight);

  // Glowing Cyber Accent on Chest (Life Core)
  const coreGeo = new THREE.RingGeometry(0.03, 0.05, 32);
  const coreMesh = new THREE.Mesh(coreGeo, glowCyanMaterial);
  coreMesh.position.set(0, 1.1, 0.22);
  avatarGroup.add(coreMesh);

  scene.add(avatarGroup);
}

// ----------------------------------------------------
// Real-Time Lip Sync & Speech Activity
// ----------------------------------------------------
function speakText(text) {
  if (!text) return;
  synth.cancel(); // Stop any ongoing speech

  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoiceIdx = voiceSelect.value;
  if (voices[selectedVoiceIdx]) {
    utterance.voice = voices[selectedVoiceIdx];
  }
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  subtitlesBox.textContent = `"${text}"`;
  avatarStateText.textContent = 'SPEAKING · ACTIVE';
  avatarStateText.style.color = '#38bdf8';

  utterance.onstart = () => {
    isSpeaking = true;
    currentActivity = 'talk';
    updateActivityButtons('talk');
  };

  utterance.onend = () => {
    isSpeaking = false;
    currentActivity = 'idle';
    updateActivityButtons('idle');
    avatarStateText.textContent = 'IDLE · LISTENING';
    avatarStateText.style.color = '#34d399';
    if (mouthMesh) mouthMesh.scale.set(1, 1, 1);
  };

  synth.speak(utterance);
}

// ----------------------------------------------------
// Animation Loop (Breathing, Gestures, Mouth Moving)
// ----------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (avatarGroup) {
    // 1. Idle Breathing (Spine & chest subtle bounce)
    const breath = Math.sin(time * 2.5) * 0.008;
    avatarGroup.position.y = breath;

    // 2. Head Subtle Natural Movement
    if (headMesh) {
      if (currentActivity === 'idle') {
        headMesh.rotation.y = Math.sin(time * 0.8) * 0.08;
        headMesh.rotation.x = Math.sin(time * 1.2) * 0.04;
      } else if (currentActivity === 'think') {
        headMesh.rotation.y = 0.25;
        headMesh.rotation.x = -0.15;
      } else if (currentActivity === 'nod') {
        headMesh.rotation.x = Math.sin(time * 8) * 0.12;
      } else if (currentActivity === 'talk') {
        headMesh.rotation.y = Math.sin(time * 3) * 0.06;
        headMesh.rotation.x = Math.sin(time * 4) * 0.05;
      }
    }

    // 3. Real-Time Lip-Sync (Mouth opening & viseme simulation)
    if (isSpeaking && mouthMesh) {
      const mouthOpen = 1.0 + Math.abs(Math.sin(time * 18)) * 3.2;
      const mouthWidth = 1.0 + Math.sin(time * 12) * 0.3;
      mouthMesh.scale.set(mouthWidth, mouthOpen, 1);
    }

    // 4. Arms & Gestures
    if (armRight) {
      if (currentActivity === 'wave') {
        armRight.rotation.z = Math.PI / 1.6 + Math.sin(time * 10) * 0.35;
        armRight.position.y = 1.15;
      } else if (currentActivity === 'think') {
        armRight.rotation.z = Math.PI / 2.8;
        armRight.position.y = 1.05;
      } else {
        armRight.rotation.z = Math.sin(time * 1.5) * 0.04;
        armRight.position.y = 0.95;
      }
    }

    // 5. Eye Blinking
    if (eyeLeft && eyeRight) {
      const blink = (Math.sin(time * 3) > 0.96) ? 0.1 : 1.0;
      eyeLeft.scale.y = blink;
      eyeRight.scale.y = blink;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  const container = document.getElementById('canvasContainer');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// ----------------------------------------------------
// UI Event Handlers
// ----------------------------------------------------
speakBtn.addEventListener('click', () => {
  speakText(speakInput.value.trim());
});

speakInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') speakText(speakInput.value.trim());
});

// Activity buttons
document.querySelectorAll('.act-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    currentActivity = action;
    updateActivityButtons(action);
    if (action === 'wave') {
      speakText("Hello Banti! Main aapki activity mirror kar raha hoon.");
    } else if (action === 'think') {
      speakText("Aapki baat par soch raha hoon...");
    } else if (action === 'nod') {
      speakText("Haan bilkul, main aapse poori tarah sahmat hoon!");
    }
  });
});

function updateActivityButtons(action) {
  document.querySelectorAll('.act-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.action === action);
  });
}

// ----------------------------------------------------
// Ready Player Me / Custom .GLB Avatar Loader
// ----------------------------------------------------
avatarUploadBtn.addEventListener('click', () => {
  glbFileInput.click();
});

glbFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const contents = event.target.result;
    const loader = new THREE.GLTFLoader();
    loader.parse(contents, '', (gltf) => {
      if (avatarGroup) scene.remove(avatarGroup);
      avatarGroup = gltf.scene;
      avatarGroup.position.set(0, 0, 0);
      avatarGroup.scale.set(1, 1, 1);
      scene.add(avatarGroup);
      speakText("Aapka custom 3D avatar successfully load ho gaya hai!");
    }, (err) => {
      console.error('Error loading GLB:', err);
      alert('Error parsing 3D model: ' + err.message);
    });
  };
  reader.readAsArrayBuffer(file);
});

// Microphone Voice Input (Web Speech Recognition)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRec();
  recognition.lang = 'hi-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    micBtn.classList.add('recording');
    avatarStateText.textContent = 'LISTENING TO YOU...';
    avatarStateText.style.color = '#ef4444';
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    speakInput.value = transcript;
    speakText("Aapne bola: " + transcript);
  };

  recognition.onend = () => {
    micBtn.classList.remove('recording');
    avatarStateText.textContent = 'IDLE · READY';
    avatarStateText.style.color = '#34d399';
  };

  micBtn.addEventListener('click', () => {
    recognition.start();
  });
} else {
  micBtn.title = 'Speech Recognition not supported in this browser';
}

// Start 3D Engine on load
window.addEventListener('DOMContentLoaded', () => {
  init3D();
});
