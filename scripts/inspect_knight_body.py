import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Knight.glb')
k_body = bpy.data.objects.get('Knight_Body')
print("Knight body dimensions:", k_body.dimensions)
for m in k_body.data.materials:
    print("Knight body material:", m.name)
