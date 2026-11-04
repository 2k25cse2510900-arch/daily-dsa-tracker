import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Superman.glb')
body = bpy.data.objects.get('Superman_Body')
rig = bpy.data.objects.get('Rig')
run_action = bpy.data.actions.get('Running_A')
rig.animation_data.action = run_action

# Let's inspect vertex group counts on body vertices
unweighted = [v for v in body.data.vertices if len(v.groups) == 0]
print(f"Total vertices in Superman_Body: {len(body.data.vertices)}")
print(f"Unweighted vertices in Superman_Body: {len(unweighted)}")
for v in unweighted[:10]:
    print(f"Unweighted vertex at {v.co}")
