global.self = global;
global.window = global;
const fs = require('fs');
const path = require('path');
const THREE = require(path.resolve('characterverse/node_modules/three'));
const { GLTFLoader } = require(path.resolve('characterverse/node_modules/three/examples/jsm/loaders/GLTFLoader.js'));

const glbBuf = fs.readFileSync(path.resolve('characterverse/public/models/Superman.glb'));
new GLTFLoader().parse(glbBuf.buffer.slice(glbBuf.byteOffset, glbBuf.byteOffset + glbBuf.byteLength), '', (gltf) => {
    const scene = gltf.scene;
    const ull = scene.getObjectByName('upperlegl');
    const lll = scene.getObjectByName('lowerlegl');
    const footl = scene.getObjectByName('footl');
    const toesl = scene.getObjectByName('toesl');

    // Pitch scene by 1.08 into horizontal flight
    scene.rotation.set(1.08, 0, 0);

    const getPos = (o) => { const v = new THREE.Vector3(); o.getWorldPosition(v); return v; };

    // We want the knee and foot to trail BEHIND the hip along Z in world space
    // Let's test different ull angles and lll angles:
    for (let u_ang of [2.4, 2.7, 3.0, 3.107, 3.3, 3.6, 3.8]) {
        ull.rotation.set(u_ang, 0, 0);
        lll.rotation.set(0, 0, 0);
        footl.rotation.set(-0.945, 0, 0);
        scene.updateMatrixWorld(true);
        console.log(`u_ang = ${u_ang.toFixed(2)} -> Hip Z: ${getPos(ull).z.toFixed(2)}, Knee Z: ${getPos(lll).z.toFixed(2)}, Foot Z: ${getPos(footl).z.toFixed(2)}, Foot Y: ${getPos(footl).y.toFixed(2)}`);
    }
});
