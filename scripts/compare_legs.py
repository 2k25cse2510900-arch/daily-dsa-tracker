import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Knight.glb')
k_leg = bpy.data.objects.get('Knight_LegLeft')
bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Rogue.glb')
r_leg = bpy.data.objects.get('Rogue_LegLeft')

print("Knight leg bounds:", k_leg.dimensions)
print("Rogue leg bounds:", r_leg.dimensions)
