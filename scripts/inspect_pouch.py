import bpy
import bmesh

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Rogue.glb')
body = bpy.data.objects.get('Rogue_Body')
bm = bmesh.new()
bm.from_mesh(body.data)

print(f"Total faces in Rogue_Body: {len(bm.faces)}")
pouch_faces = [f for f in bm.faces if abs(f.calc_center_median().x) > 0.20 and 0.45 < f.calc_center_median().z < 0.65]
print(f"Pouch-region faces count: {len(pouch_faces)}")
for f in pouch_faces[:10]:
    print(f"Center: {f.calc_center_median()}, normal: {f.normal}")
bm.free()
