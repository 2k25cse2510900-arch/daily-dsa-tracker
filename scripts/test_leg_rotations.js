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
    const footl = scene.getObjectByName('footl');
    const getPos = (obj) => {
        const v = new THREE.Vector3();
        obj.getWorldPosition(v);
        return v;
    };

    scene.updateMatrixWorld(true);
    console.log("Rest footl pos:", getPos(footl));

    // Test different rx rotations on ull
    for (const rx of [-1.5, -1.0, -0.5, -0.2, 0, 0.2, 0.5, 1.0, 1.5]) {
        ull.rotation.set(rx, 0, 0);
        scene.updateMatrixWorld(true);
        console.log(`ull rx = ${rx.toFixed(2)} -> Foot.l: (${getPos(footl).x.toFixed(2)}, ${getPos(footl).y.toFixed(2)}, ${getPos(footl).z.toFixed(2)})`);
    }
});
