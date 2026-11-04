global.self = global;
global.window = global;
const fs = require('fs');
const path = require('path');
const THREE = require(path.resolve('characterverse/node_modules/three'));
const { GLTFLoader } = require(path.resolve('characterverse/node_modules/three/examples/jsm/loaders/GLTFLoader.js'));

const glbBuf = fs.readFileSync(path.resolve('characterverse/public/models/Superman.glb'));
new GLTFLoader().parse(glbBuf.buffer.slice(glbBuf.byteOffset, glbBuf.byteOffset + glbBuf.byteLength), '', (gltf) => {
    const scene = gltf.scene;
    const legL = scene.getObjectByName('Superman_LegLeft');
    const legR = scene.getObjectByName('Superman_LegRight');
    console.log("legL found:", !!legL, "visible:", legL.visible);
    console.log("legR found:", !!legR, "visible:", legR.visible);

    scene.updateMatrixWorld(true);
    const boxL = new THREE.Box3().setFromObject(legL);
    const boxR = new THREE.Box3().setFromObject(legR);
    console.log("legL world box:", boxL.min, boxL.max);
    console.log("legR world box:", boxR.min, boxR.max);
    console.log("legL material:", legL.material.name);

    // Check vertex positions in geometry
    const pos = legL.geometry.attributes.position;
    console.log("legL vertex count:", pos.count);
    let minZ = 999, maxZ = -999, minY = 999, maxY = -999;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const z = pos.getZ(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
    }
    console.log("legL local Y bounds:", minY, maxY, "local Z bounds:", minZ, maxZ);

    // Check bones bound to legL
    console.log("legL skeleton bone count:", legL.skeleton?.bones.length);
});
