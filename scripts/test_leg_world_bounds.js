global.self = global;
global.window = global;
const fs = require('fs');
const path = require('path');
const THREE = require(path.resolve('characterverse/node_modules/three'));
const { GLTFLoader } = require(path.resolve('characterverse/node_modules/three/examples/jsm/loaders/GLTFLoader.js'));

const glbBuf = fs.readFileSync(path.resolve('characterverse/public/models/Superman.glb'));
new GLTFLoader().parse(glbBuf.buffer.slice(glbBuf.byteOffset, glbBuf.byteOffset + glbBuf.byteLength), '', (gltf) => {
    const scene = gltf.scene;
    const parentGroup = new THREE.Group();
    parentGroup.position.set(0, -1.01, 0);
    parentGroup.add(scene);

    const flightY = 0.62;
    const flightZ = -1.10;
    scene.position.set(0, flightY, flightZ);
    scene.rotation.set(1.08, 0, 0);

    const ull = scene.getObjectByName('upperlegl');
    const ulr = scene.getObjectByName('upperlegr');
    const lll = scene.getObjectByName('lowerlegl');
    const llr = scene.getObjectByName('lowerlegr');
    const footl = scene.getObjectByName('footl');
    const footr = scene.getObjectByName('footr');

    ull.rotation.set(-0.20, 0.04, -0.06);
    ulr.rotation.set(-0.18, -0.04, 0.06);
    lll.rotation.set(0.20, 0, 0);
    llr.rotation.set(0.18, 0, 0);
    footl.rotation.set(0.38, 0, 0);
    footr.rotation.set(0.35, 0, 0);

    parentGroup.updateMatrixWorld(true);

    const legL = scene.getObjectByName('Superman_LegLeft');
    const legR = scene.getObjectByName('Superman_LegRight');
    const body = scene.getObjectByName('Superman_Body');

    const legBoxL = new THREE.Box3().setFromObject(legL);
    const legBoxR = new THREE.Box3().setFromObject(legR);
    const bodyBox = new THREE.Box3().setFromObject(body);

    console.log("LegL world bounding box:", legBoxL.min, legBoxL.max);
    console.log("LegR world bounding box:", legBoxR.min, legBoxR.max);
    console.log("Body world bounding box:", bodyBox.min, bodyBox.max);
});
