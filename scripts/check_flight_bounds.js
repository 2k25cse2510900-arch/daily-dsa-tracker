global.self = global;
global.window = global;
const fs = require('fs');
const path = require('path');
const THREE = require(path.resolve('characterverse/node_modules/three'));
const { GLTFLoader } = require(path.resolve('characterverse/node_modules/three/examples/jsm/loaders/GLTFLoader.js'));

const glbBuf = fs.readFileSync(path.resolve('characterverse/public/models/Superman.glb'));
new GLTFLoader().parse(glbBuf.buffer.slice(glbBuf.byteOffset, glbBuf.byteOffset + glbBuf.byteLength), '', (gltf) => {
    const scene = gltf.scene;
    const uar = scene.getObjectByName('upperarmr');
    const ual = scene.getObjectByName('upperarml');
    const ull = scene.getObjectByName('upperlegl');
    const ulr = scene.getObjectByName('upperlegr');
    const lll = scene.getObjectByName('lowerlegl');
    const llr = scene.getObjectByName('lowerlegr');
    const footl = scene.getObjectByName('footl');
    const footr = scene.getObjectByName('footr');
    const head = scene.getObjectByName('head');
    const handr = scene.getObjectByName('handr');

    // Pitch into horizontal flight
    scene.rotation.set(1.08, 0, 0);

    // Arms forward
    uar.rotation.set(1.08, 0.45, -0.18);
    ual.rotation.set(1.02, -0.45, 0.18);

    // Legs streamlined
    ull.rotation.set(-0.20, 0.04, -0.06);
    ulr.rotation.set(-0.18, -0.04, 0.06);
    lll.rotation.set(0.20, 0, 0);
    llr.rotation.set(0.18, 0, 0);
    footl.rotation.set(0.38, 0, 0);
    footr.rotation.set(0.35, 0, 0);

    // Let's create parent group at [0, -1.01, 0]
    const parentGroup = new THREE.Group();
    parentGroup.position.set(0, -1.01, 0);
    parentGroup.add(scene);

    const flightY = 0.62;
    const flightZ = -1.10;
    scene.position.set(0, flightY, flightZ);
    parentGroup.updateMatrixWorld(true);

    const worldBox = new THREE.Box3().setFromObject(parentGroup);
    console.log("=== WORLD COORDINATES IN SCENE ===");
    console.log("World Box min:", worldBox.min);
    console.log("World Box max:", worldBox.max);
    console.log("World Center: ", worldBox.getCenter(new THREE.Vector3()));
    console.log("World Size:   ", worldBox.getSize(new THREE.Vector3()));
    console.log("World Head:   ", head.getWorldPosition(new THREE.Vector3()));
    console.log("World Hand.r: ", handr.getWorldPosition(new THREE.Vector3()));
    console.log("World Foot.r: ", footr.getWorldPosition(new THREE.Vector3()));
});
