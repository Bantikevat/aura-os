// AURA 3D Avatar & Voice Engine
let scene, camera, renderer, controls;
let avatarGroup, headMesh, mouthMesh, eyeLeft, eyeRight, neck, bodyMesh, armLeft, armRight;
let isSpeaking = false;
let currentActivity = 'idle';
let clock = new THREE.Clock();
let customGltfModel = null;
let mixer = null;

// Speech Synthesis
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
const openSelfieModalBtn = document.getElementById('openSelfieModalBtn');
const rpmModal = document.getElementById('rpmModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const rpmIframe = document.getElementById('rpmIframe');
const loadingSpinner = document.getElementById('loadingSpinner');

function populateVoices() {
  voices = synth.getVoices();
  voiceSelect.innerHTML = '';
  
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
// Three.js 3D Setup
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
  controls.target.set(0, 1.35, 0);
  controls.minDistance = 1.0;
  controls.maxDistance = 4.5;
  controls.maxPolarAngle = Math.PI / 2;

  // Studio Lighting
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 1.0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
  keyLight.position.set(3, 4, 3);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc084fc, 1.0);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x34d399, 1.2);
  rimLight.position.set(0, 3, -3);
  scene.add(rimLight);

  const grid = new THREE.GridHelper(20, 40, 0x38bdf8, 0x112233);
  grid.position.y = 0;
  scene.add(grid);

  createProceduralAvatar();

  window.addEventListener('resize', onWindowResize);
  animate();
}

function createProceduralAvatar() {
  avatarGroup = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5 });
  const suitMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.3 });

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.65, 32);
  bodyMesh = new THREE.Mesh(bodyGeo, suitMat);
  bodyMesh.position.y = 0.95;
  avatarGroup.add(bodyMesh);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.12, 16);
  neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 1.32;
  avatarGroup.add(neck);

  // Head
  const headGeo = new THREE.SphereGeometry(0.16, 32, 32);
  headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 1.48;
  headMesh.scale.set(0.95, 1.15, 1.0);
  avatarGroup.add(headMesh);

  // Hair
  const hairGeo = new THREE.SphereGeometry(0.168, 24, 24);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.9 });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.set(0, 0.04, -0.02);
  headMesh.add(hair);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.025, 16, 16);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.4 });
  eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
  eyeLeft.position.set(-0.06, 0.02, 0.14);
  headMesh.add(eyeLeft);

  eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
  eyeRight.position.set(0.06, 0.02, 0.14);
  headMesh.add(eyeRight);

  // Mouth for Lip-sync
  const mouthGeo = new THREE.BoxGeometry(0.06, 0.015, 0.02);
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x881337 });
  mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.position.set(0, -0.07, 0.14);
  headMesh.add(mouthMesh);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.5, 16);
  armLeft = new THREE.Mesh(armGeo, suitMat);
  armLeft.position.set(-0.3, 0.95, 0);
  avatarGroup.add(armLeft);

  armRight = new THREE.Mesh(armGeo, suitMat);
  armRight.position.set(0.3, 0.95, 0);
  avatarGroup.add(armRight);

  scene.add(avatarGroup);
}

// ----------------------------------------------------
// Load Custom GLTF/GLB Avatar (From URL or File)
// ----------------------------------------------------
function loadGLBAvatar(urlOrBuffer) {
  loadingSpinner.style.display = 'flex';
  const loader = new THREE.GLTFLoader();

  const onLoaded = (gltf) => {
    loadingSpinner.style.display = 'none';
    if (avatarGroup) scene.remove(avatarGroup);
    
    customGltfModel = gltf.scene;
    customGltfModel.position.set(0, 0, 0);
    customGltfModel.scale.set(1, 1, 1);

    // Adjust camera target to character face
    controls.target.set(0, 1.45, 0);
    camera.position.set(0, 1.5, 1.8);

    scene.add(customGltfModel);
    avatarGroup = customGltfModel;

    speakText("Shabash Banti! Tumhara asli 3D avatar load ho gaya hai. Ab main bilkul tumhari tarah dikh raha hoon!");
  };

  const onError = (err) => {
    loadingSpinner.style.display = 'none';
    console.error('Error loading GLB:', err);
    alert('Failed to load 3D Avatar: ' + err.message);
  };

  if (typeof urlOrBuffer === 'string') {
    loader.load(urlOrBuffer, onLoaded, undefined, onError);
  } else {
    loader.parse(urlOrBuffer, '', onLoaded, onError);
  }
}

// ----------------------------------------------------
// Speech & Lip-Sync
// ----------------------------------------------------
function speakText(text) {
  if (!text) return;
  synth.cancel();

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
// Animation Loop
// ----------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (avatarGroup) {
    // Breathing
    const breath = Math.sin(time * 2.5) * 0.006;
    avatarGroup.position.y = breath;

    // Head movement
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

    // Lip sync
    if (isSpeaking && mouthMesh) {
      const mouthOpen = 1.0 + Math.abs(Math.sin(time * 18)) * 3.2;
      const mouthWidth = 1.0 + Math.sin(time * 12) * 0.3;
      mouthMesh.scale.set(mouthWidth, mouthOpen, 1);
    }

    // Arms
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

    // Blink
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
// UI Events & Ready Player Me Modal Integration
// ----------------------------------------------------
speakBtn.addEventListener('click', () => speakText(speakInput.value.trim()));
speakInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') speakText(speakInput.value.trim());
});

document.querySelectorAll('.act-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    currentActivity = action;
    updateActivityButtons(action);
    if (action === 'wave') speakText("Hello Banti! Main aapke sath hoon.");
    else if (action === 'think') speakText("Soch raha hoon...");
    else if (action === 'nod') speakText("Haan, bilkul sahi baat hai!");
  });
});

function updateActivityButtons(action) {
  document.querySelectorAll('.act-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.action === action);
  });
}

// Open Ready Player Me Selfie Creator
openSelfieModalBtn.addEventListener('click', () => {
  rpmIframe.src = 'https://demo.readyplayer.me/avatar?frameApi';
  rpmModal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
  rpmModal.style.display = 'none';
  rpmIframe.src = '';
});

// Listen for Avatar Created Event from Ready Player Me
window.addEventListener('message', (event) => {
  const data = event.data;
  let json;
  try {
    json = typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return;
  }

  // When user clicks 'Next' in Ready Player Me after taking selfie
  if (json?.source === 'readyplayerme' && json.eventName === 'v1.avatar.exported') {
    const avatarGlbUrl = json.data.url;
    console.log('Exported Avatar GLB URL:', avatarGlbUrl);
    rpmModal.style.display = 'none';
    rpmIframe.src = '';
    loadGLBAvatar(avatarGlbUrl);
  }
});

// Manual File Upload (.glb)
avatarUploadBtn.addEventListener('click', () => glbFileInput.click());
glbFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    loadGLBAvatar(event.target.result);
  };
  reader.readAsArrayBuffer(file);
});

// Microphone Voice Input
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRec();
  recognition.lang = 'hi-IN';

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

  micBtn.addEventListener('click', () => recognition.start());
}

window.addEventListener('DOMContentLoaded', () => init3D());
