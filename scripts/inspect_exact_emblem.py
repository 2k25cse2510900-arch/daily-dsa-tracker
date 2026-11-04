import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Superman.glb')
body = bpy.data.objects.get('Superman_Body')

verts = [v for v in body.data.vertices if 0.74 <= v.co.z <= 1.08 and abs(v.co.x) <= 0.18 and -0.33 <= v.co.y <= -0.15]
print(f"Torso body verts in chest region: {len(verts)}")
for v in sorted(verts, key=lambda v: (round(v.co.z, 2), round(v.co.x, 2))):
    print(f"  Torso: x={v.co.x:.3f}, y={v.co.y:.3f}, z={v.co.z:.3f}")
