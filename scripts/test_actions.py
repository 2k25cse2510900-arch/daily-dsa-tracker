import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Rogue.glb')
for action in bpy.data.actions:
    print("Action:", action.name)
