global.self = global;
global.window = global;
const fs = require('fs');
const path = require('path');

// We can load three.js and parse GLTF
const THREE = require(path.resolve('characterverse/node_modules/three'));
const { GLTFLoader } = require(path.resolve('characterverse/node_modules/three/examples/jsm/loaders/GLTFLoader.js'));

// Read GLB
const glbBuf = fs.readFileSync(path.resolve('characterverse/public/models/Superman.glb'));
const arrayBuffer = glbBuf.buffer.slice(glbBuf.byteOffset, glbBuf.byteOffset + glbBuf.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, '', (gltf) => {
    const scene = gltf.scene;
    const uar = scene.getObjectByName('upperarmr');
    const ual = scene.getObjectByName('upperarml');
    const handr = scene.getObjectByName('handr');
    const handl = scene.getObjectByName('handl');
    const head = scene.getObjectByName('head');

    scene.updateMatrixWorld(true);
    const getPos = (obj) => {
        const v = new THREE.Vector3();
        obj.getWorldPosition(v);
        return v;
    };

    console.log("Rest head pos:", getPos(head));
    console.log("Rest hand.r pos:", getPos(handr));
    console.log("Rest hand.l pos:", getPos(handl));

    const ull = scene.getObjectByName('upperlegl');
    const ulr = scene.getObjectByName('upperlegr');
    const lll = scene.getObjectByName('lowerlegl');
    const llr = scene.getObjectByName('lowerlegr');
    const footl = scene.getObjectByName('footl');
    const footr = scene.getObjectByName('footr');

    scene.position.set(0, 0, 0);
    scene.rotation.set(0, 0, 0);

    // Let's test combinations of rx, ry, rz
    let bestDistR = 999;
    let bestEulerR = null;

    // Target: hand in front of head/chin: x ~ -0.16, y ~ 1.40, z ~ 0.35
    const targetR = new THREE.Vector3(-0.16, 1.38, 0.35);

    for (let rx = 0.2; rx <= 1.2; rx += 0.1) {
        for (let ry = -0.5; ry <= 0.5; ry += 0.1) {
            for (let rz = -0.5; rz <= 0.5; rz += 0.1) {
                uar.rotation.set(rx, ry, rz);
                scene.updateMatrixWorld(true);
                const d = getPos(handr).distanceTo(targetR);
                if (d < bestDistR) {
                    bestDistR = d;
                    bestEulerR = [rx, ry, rz];
                }
            }
        }
    }
    console.log("Best Right arm euler:", bestEulerR, "distance:", bestDistR);
    // Now let's test with flight pitch and position
    scene.position.set(0, 0.50, -0.25);
    scene.rotation.set(1.10, 0, 0);

    uar.rotation.set(1.05, 0.48, -0.18);
    ual.rotation.set(1.00, -0.48, 0.18);

    // Legs streamlined
    ull.rotation.set(-0.20, 0.04, -0.06);
    ulr.rotation.set(-0.18, -0.04, 0.06);
    lll.rotation.set(0.20, 0, 0);
    llr.rotation.set(0.18, 0, 0);
    footl.rotation.set(0.38, 0, 0);
    footr.rotation.set(0.35, 0, 0);

    scene.updateMatrixWorld(true);

    console.log("=== IN FLIGHT COORDINATES ===");
    console.log("Head pos:   ", getPos(head));
    console.log("Hand.r pos: ", getPos(handr));
    console.log("Hand.l pos: ", getPos(handl));
    console.log("Foot.r pos: ", getPos(footr));
    console.log("Foot.l pos: ", getPos(footl));
    const flightBox = new THREE.Box3().setFromObject(scene);
    console.log("Flight Box min:", flightBox.min);
    console.log("Flight Box max:", flightBox.max);
    console.log("Flight Box center:", flightBox.getCenter(new THREE.Vector3()));
    console.log("Flight Box size:", flightBox.getSize(new THREE.Vector3()));
}, (err) => console.error(err));
