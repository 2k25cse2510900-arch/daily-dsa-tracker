import bpy

bpy.ops.import_scene.gltf(filepath='characterverse/public/models/Rogue.glb')
leg = bpy.data.objects.get('Rogue_LegLeft')

foot_vg = leg.vertex_groups.get('foot.l')
lowerleg_vg = leg.vertex_groups.get('lowerleg.l')
upperleg_vg = leg.vertex_groups.get('upperleg.l')

print("Foot vg:", foot_vg.index if foot_vg else None)
print("Lower leg vg:", lowerleg_vg.index if lowerleg_vg else None)
print("Upper leg vg:", upperleg_vg.index if upperleg_vg else None)

z_coords = sorted(set(round(v.co.z, 3) for v in leg.data.vertices))
print("Z levels in leg:", z_coords)
