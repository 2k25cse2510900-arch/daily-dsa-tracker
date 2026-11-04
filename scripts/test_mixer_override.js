const fs = require('fs');
const path = require('path');
global.self = global;
global.window = global;
const THREE = require(path.resolve('characterverse/node_modules/three'));
const { GLTFLoader } = require(path.resolve('characterverse/node_modules/three/examples/jsm/loaders/GLTFLoader.js'));

const glbBuf = fs.readFileSync(path.resolve('characterverse/public/models/Superman.glb'));
new GLTFLoader().parse(glbBuf.buffer.slice(glbBuf.byteOffset, glbBuf.byteOffset + glbBuf.byteLength), '', (gltf) => {
    const scene = gltf.scene;
    const mixer = new THREE.AnimationMixer(scene);
    const action = mixer.clipAction(gltf.animations.find(a => a.name === 'Jump_Idle'));
    action.play();

    const uar = scene.getObjectByName('upperarmr');

    // Case 1: Pose BEFORE mixer.update
    uar.rotation.set(1.0, 0.5, -0.2);
    mixer.update(0.016);
    console.log("Pose BEFORE mixer.update -> uar.rotation.x:", uar.rotation.x);

    // Case 2: Pose AFTER mixer.update
    mixer.update(0.016);
    uar.rotation.set(1.0, 0.5, -0.2);
    console.log("Pose AFTER mixer.update -> uar.rotation.x:", uar.rotation.x);
});
