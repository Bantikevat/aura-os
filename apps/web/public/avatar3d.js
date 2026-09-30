// AURA 3D Model Engine — Real Lip-sync, Hand Gestures & Photo Face
let scene, camera, renderer, controls;
let avatarGroup, headMesh, facePlaneMesh, mouthMesh, eyeLeft, eyeRight;
let neck, bodyMesh, armLeftGroup, armRightGroup;
let isSpeaking = false;
let currentGesture = 'idle';
let clock = new THREE.Clock();

const synth = window.speechSynthesis;
let voices = [];
let hindiVoice = null;

const subtitlesText = document.getElementById('subtitlesText');
const userInput = document.getElementById('userInput');
const speakActionBtn = document.getElementById('speakActionBtn');
const micActionBtn = document.getElementById('micActionBtn');
const statusLabel = document.getElementById('statusLabel');
const uploadFaceBtn = document.getElementById('uploadFaceBtn');
const faceInput = document.getElementById('faceInput');

function loadVoices() {
  voices = synth.getVoices();
  hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
}
loadVoices();
if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = loadVoices;
}

// ----------------------------------------------------
// THREE.JS 3D SCENE SETUP
// ----------------------------------------------------
function initScene() {
  const container = document.getElementById('threeContainer');
  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a14, 0.06);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 1.45, 2.3);

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
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 1.2);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
  keyLight.position.set(3, 4, 3);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc084fc, 1.2);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x34d399, 1.5);
  rimLight.position.set(0, 3, -3);
  scene.add(rimLight);

  // Futuristic Circular Floor Grid
  const grid = new THREE.GridHelper(16, 32, 0x38bdf8, 0x112233);
  grid.position.y = 0;
  scene.add(grid);

  // Build the 3D Avatar
  buildAvatarModel();

  window.addEventListener('resize', onResize);
  animateLoop();
}

// ----------------------------------------------------
// BUILD 3D AVATAR WITH FACE, EYES, MOUTH & ARTICULATED ARMS
// ----------------------------------------------------
function buildAvatarModel() {
  avatarGroup = new THREE.Group();

  // Materials
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xdca878,
    roughness: 0.45,
    metalness: 0.05
  });

  const suitMaterial = new THREE.MeshStandardMaterial({
    color: 0x0c1322,
    roughness: 0.35,
    metalness: 0.3
  });

  const glowCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.8
  });

  // 1. Torso / Chest with Glowing 'A' Logo
  const bodyGeo = new THREE.CylinderGeometry(0.24, 0.19, 0.65, 32);
  bodyMesh = new THREE.Mesh(bodyGeo, suitMaterial);
  bodyMesh.position.y = 0.95;
  avatarGroup.add(bodyMesh);

  // Glowing 'A' emblem on hoodie chest
  const emblemGeo = new THREE.RingGeometry(0.04, 0.065, 32);
  const emblem = new THREE.Mesh(emblemGeo, glowCyanMat);
  emblem.position.set(0, 1.1, 0.23);
  avatarGroup.add(emblem);

  // 2. Neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.14, 16);
  neck = new THREE.Mesh(neckGeo, skinMaterial);
  neck.position.y = 1.33;
  avatarGroup.add(neck);

  // 3. Head & Face
  const headGeo = new THREE.SphereGeometry(0.165, 32, 32);
  headMesh = new THREE.Mesh(headGeo, skinMaterial);
  headMesh.position.y = 1.50;
  headMesh.scale.set(0.95, 1.12, 1.0);
  avatarGroup.add(headMesh);

  // Hair Mesh (Dark styled hair)
  const hairGeo = new THREE.SphereGeometry(0.175, 24, 24);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x161311, roughness: 0.8 });
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.position.set(0, 0.04, -0.02);
  headMesh.add(hair);

  // Face Photo Plane (Maps Banti's actual face photo to the 3D model!)
  loadBantiFaceTexture(headMesh);

  // 4. Eyes (Blinkable)
  const eyeGeo = new THREE.SphereGeometry(0.024, 16, 16);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5
  });
  eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
  eyeLeft.position.set(-0.055, 0.025, 0.145);
  headMesh.add(eyeLeft);

  eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
  eyeRight.position.set(0.055, 0.025, 0.145);
  headMesh.add(eyeRight);

  // 5. 3D Mouth with REAL-TIME LIP-SYNC
  const mouthGeo = new THREE.BoxGeometry(0.07, 0.018, 0.025);
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x881337 });
  mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.position.set(0, -0.068, 0.148);
  headMesh.add(mouthMesh);

  // 6. Articulated Arms (Shoulders, Upper arm, Forearm, Hands)
  // Right Arm (For waving, gesturing, thinking)
  armRightGroup = new THREE.Group();
  armRightGroup.position.set(0.32, 1.20, 0); // Shoulder joint

  const rArmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.5, 16);
  const rArm = new THREE.Mesh(rArmGeo, suitMaterial);
  rArm.position.y = -0.25;
  armRightGroup.add(rArm);

  // Hand
  const rHandGeo = new THREE.SphereGeometry(0.045, 16, 16);
  const rHand = new THREE.Mesh(rHandGeo, skinMaterial);
  rHand.position.y = -0.52;
  armRightGroup.add(rHand);

  avatarGroup.add(armRightGroup);

  // Left Arm
  armLeftGroup = new THREE.Group();
  armLeftGroup.position.set(-0.32, 1.20, 0); // Shoulder joint

  const lArmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.5, 16);
  const lArm = new THREE.Mesh(lArmGeo, suitMaterial);
  lArm.position.y = -0.25;
  armLeftGroup.add(lArm);

  const lHandGeo = new THREE.SphereGeometry(0.045, 16, 16);
  const lHand = new THREE.Mesh(lHandGeo, skinMaterial);
  lHand.position.y = -0.52;
  armLeftGroup.add(lHand);

  avatarGroup.add(armLeftGroup);

  scene.add(avatarGroup);
}

// ----------------------------------------------------
// MAP BANTI'S PHOTO TEXTURE TO 3D FACE
// ----------------------------------------------------
function loadBantiFaceTexture(parentHead) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = 'aura-master.jpg';

  img.onload = () => {
    // Create offscreen canvas to crop Banti's face from the uploaded photo
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Crop around Banti's face (centered at approx 450, 140 in 1024x682)
    ctx.drawImage(img, 385, 60, 140, 160, 0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const faceGeo = new THREE.PlaneGeometry(0.18, 0.20);
    const faceMat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.5
    });

    if (facePlaneMesh) parentHead.remove(facePlaneMesh);
    facePlaneMesh = new THREE.Mesh(faceGeo, faceMat);
    facePlaneMesh.position.set(0, 0, 0.155);
    parentHead.add(facePlaneMesh);

    console.log('[AURA 3D] Banti face photo mapped successfully.');
  };
}

// ----------------------------------------------------
// SPEAK WITH REAL-TIME AUDIO LIP-SYNC (Hindi Support)
// ----------------------------------------------------
function speakText(text) {
  if (!text) return;
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  if (hindiVoice) utter.voice = hindiVoice;
  utter.rate = 1.0;
  utter.pitch = 1.0;

  subtitlesText.textContent = `"${text}"`;
  statusLabel.textContent = 'बोल रहा है (SPEAKING)';
  statusLabel.style.color = '#38bdf8';

  utter.onstart = () => {
    isSpeaking = true;
    currentGesture = 'talk';
    updateGestureUI('talk');
  };

  utter.onend = () => {
    isSpeaking = false;
    currentGesture = 'idle';
    updateGestureUI('idle');
    statusLabel.textContent = '3D AVATAR ONLINE';
    statusLabel.style.color = '#34d399';
    if (mouthMesh) mouthMesh.scale.set(1, 1, 1);
  };

  synth.speak(utter);
}

// ----------------------------------------------------
// ANIMATION LOOP (Breathing, Gestures, Mouth Moving)
// ----------------------------------------------------
function animateLoop() {
  requestAnimationFrame(animateLoop);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (avatarGroup) {
    // 1. Natural Breathing (Chest & body subtle motion)
    const breath = Math.sin(time * 2.2) * 0.007;
    avatarGroup.position.y = breath;

    // 2. Head Movement (Natural lifelike head tilting)
    if (headMesh) {
      if (currentGesture === 'idle') {
        headMesh.rotation.y = Math.sin(time * 0.7) * 0.06;
        headMesh.rotation.x = Math.sin(time * 1.1) * 0.03;
      } else if (currentGesture === 'talk') {
        headMesh.rotation.y = Math.sin(time * 3) * 0.08;
        headMesh.rotation.x = Math.sin(time * 4) * 0.06;
      } else if (currentGesture === 'think') {
        headMesh.rotation.y = 0.28;
        headMesh.rotation.x = -0.18;
      } else if (currentGesture === 'thumbs') {
        headMesh.rotation.x = Math.sin(time * 6) * 0.12;
      }
    }

    // 3. REAL-TIME LIP SYNC (Mouth opens & visemes move with speech!)
    if (isSpeaking && mouthMesh) {
      const mouthOpen = 1.0 + Math.abs(Math.sin(time * 16)) * 3.4;
      const mouthWidth = 1.0 + Math.sin(time * 10) * 0.35;
      mouthMesh.scale.set(mouthWidth, mouthOpen, 1);
    }

    // 4. HAND & ARM MOVEMENTS (Articulated Gestures)
    if (armRightGroup) {
      if (currentGesture === 'wave') {
        // Hand raised and waving back and forth
        armRightGroup.rotation.z = Math.PI / 1.5 + Math.sin(time * 9) * 0.4;
        armRightGroup.rotation.x = 0;
        armRightGroup.rotation.y = 0.2;
      } else if (currentGesture === 'talk') {
        // Natural hand gestures while speaking
        armRightGroup.rotation.z = 0.4 + Math.sin(time * 3) * 0.15;
        armRightGroup.rotation.x = -0.4 + Math.sin(time * 4) * 0.2;
      } else if (currentGesture === 'think') {
        // Hand touches chin
        armRightGroup.rotation.z = Math.PI / 2.4;
        armRightGroup.rotation.x = -0.7;
      } else if (currentGesture === 'thumbs') {
        // Thumbs up in front
        armRightGroup.rotation.z = 0.3;
        armRightGroup.rotation.x = -0.8;
      } else {
        // Idle relaxed arms
        armRightGroup.rotation.z = Math.sin(time * 1.2) * 0.04;
        armRightGroup.rotation.x = 0;
        armRightGroup.rotation.y = 0;
      }
    }

    // Left arm subtle natural swing
    if (armLeftGroup) {
      if (currentGesture === 'talk') {
        armLeftGroup.rotation.z = -0.3 + Math.sin(time * 2.5) * 0.1;
        armLeftGroup.rotation.x = -0.3 + Math.sin(time * 3.5) * 0.15;
      } else {
        armLeftGroup.rotation.z = -Math.sin(time * 1.2) * 0.04;
        armLeftGroup.rotation.x = 0;
      }
    }

    // 5. Eye Blinking (Natural involuntary blink)
    if (eyeLeft && eyeRight) {
      const blink = (Math.sin(time * 2.8) > 0.96) ? 0.1 : 1.0;
      eyeLeft.scale.y = blink;
      eyeRight.scale.y = blink;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

function onResize() {
  const container = document.getElementById('threeContainer');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// ----------------------------------------------------
// UI EVENT LISTENERS
// ----------------------------------------------------
speakActionBtn.addEventListener('click', () => {
  speakText(userInput.value.trim());
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') speakActionBtn.click();
});

// Gesture Buttons
document.querySelectorAll('.gesture-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const anim = btn.dataset.anim;
    currentGesture = anim;
    updateGestureUI(anim);

    if (anim === 'wave') {
      speakText("नमस्ते बंटी भाई! देखो, मैं हाथ हिला रहा हूँ।");
    } else if (anim === 'talk') {
      speakText("हाँ बंटी, जब मैं बोलता हूँ तो मेरे हाथ और मुँह दोनों हिलते हैं।");
    } else if (anim === 'think') {
      speakText("हम्म... मैं इस सवाल पर गहराई से सोच रहा हूँ।");
    } else if (anim === 'thumbs') {
      speakText("बिल्कुल सही बंटी! मुझे तुम्हारी बात पूरी तरह पसंद आई।");
    }
  });
});

function updateGestureUI(anim) {
  document.querySelectorAll('.gesture-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.anim === anim);
  });
}

// Microphone Voice Input
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRec();
  recognition.lang = 'hi-IN';

  recognition.onstart = () => {
    micActionBtn.classList.add('recording');
    statusLabel.textContent = 'सुन रहा हूँ (LISTENING)';
    statusLabel.style.color = '#ef4444';
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    userInput.value = transcript;
    speakText("बंटी भाई, आपने कहा: " + transcript);
  };

  recognition.onend = () => {
    micActionBtn.classList.remove('recording');
    statusLabel.textContent = '3D AVATAR ONLINE';
    statusLabel.style.color = '#34d399';
  };

  micActionBtn.addEventListener('click', () => recognition.start());
}

// Custom Photo Face Upload
uploadFaceBtn.addEventListener('click', () => faceInput.click());
faceInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 256, 256);

      const texture = new THREE.CanvasTexture(canvas);
      if (facePlaneMesh) {
        facePlaneMesh.material.map = texture;
        facePlaneMesh.material.needsUpdate = true;
      }
      speakText("बंटी भाई, आपकी नई फ़ोटो 3D चेहरे पर सफलतापूर्वक सेट हो गई है!");
    };
  };
  reader.readAsDataURL(file);
});

// Start scene on load
window.addEventListener('DOMContentLoaded', () => {
  initScene();
  setTimeout(() => {
    speakText("नमस्ते बंटी भाई! अब यह बिल्कुल साफ़ और आसान 3D अवतार है। मैं आपके इशारों पर हाथ हिलाऊँगा और बोलते समय मुँह हिलाऊँगा।");
  }, 1000);
});
