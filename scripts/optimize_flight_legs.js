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

    scene.rotation.set(1.08, 0, 0);
    const getPos = (o) => { const v = new THREE.Vector3(); o.getWorldPosition(v); return v; };

    // We want Hip -> Knee -> Foot -> Toes to lie almost along a straight streamlined line!
    // In horizontal flight: Hip Y ~ Foot Y, and Foot Z < Hip Z (trailing behind)
    for (let u_ang of [3.0, 3.107, 3.2]) {
        for (let l_ang of [-0.2, 0.0, 0.1, 0.213]) {
            for (let f_ang of [-1.5, -1.2, -0.945, -0.6, -0.3, 0.0]) {
                ull.rotation.set(u_ang, 0, 0);
                lll.rotation.set(l_ang, 0, 0);
                footl.rotation.set(f_ang, 0, 0);
                scene.updateMatrixWorld(true);

                const hip = getPos(ull);
                const knee = getPos(lll);
                const foot = getPos(footl);
                const toes = getPos(toesl);

                console.log(`u=${u_ang.toFixed(2)}, l=${l_ang.toFixed(2)}, f=${f_ang.toFixed(2)} -> Hip: (${hip.y.toFixed(2)}, ${hip.z.toFixed(2)}), Knee: (${knee.y.toFixed(2)}, ${knee.z.toFixed(2)}), Foot: (${foot.y.toFixed(2)}, ${foot.z.toFixed(2)}), Toes: (${toes.y.toFixed(2)}, ${toes.z.toFixed(2)})`);
            }
        }
    }
});
