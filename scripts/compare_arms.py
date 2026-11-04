import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Knight.glb')
k_arm = bpy.data.objects.get('Knight_ArmLeft')
bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Rogue.glb')
r_arm = bpy.data.objects.get('Rogue_ArmLeft')

print("Knight arm bounds:", k_arm.dimensions)
print("Rogue arm bounds:", r_arm.dimensions)
