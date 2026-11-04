import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Superman.glb')
body = bpy.data.objects.get('Superman_Body')
rig = bpy.data.objects.get('Rig')

# Find Running_A action
run_action = bpy.data.actions.get('Running_A')
print("Run action:", run_action.name if run_action else None)

if rig.animation_data and run_action:
    rig.animation_data.action = run_action
    
for frame in [1, 5, 10, 15]:
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    
    # Check evaluated mesh coordinates
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_body = body.evaluated_get(depsgraph)
    eval_mesh = eval_body.data
    
    # Find emblem vertices in evaluated mesh
    # Emblem vertices are center_v, base, rim, S
    print(f"\n--- Frame {frame} ---")
    chest_bone = rig.pose.bones.get('chest')
    if chest_bone:
        print(f"Chest bone matrix translation: {chest_bone.matrix.translation}")
