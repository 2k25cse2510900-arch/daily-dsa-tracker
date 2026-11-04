import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
ROGUE = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ROGUE)

body = bpy.data.objects.get('Rogue_Body')
arm = bpy.data.objects.get('Rogue_ArmLeft')
leg = bpy.data.objects.get('Rogue_LegLeft')

print("Rogue_Body verts:", len(body.data.vertices), "faces:", len(body.data.polygons))
print("Rogue_ArmLeft verts:", len(arm.data.vertices), "faces:", len(arm.data.polygons))
print("Rogue_LegLeft verts:", len(leg.data.vertices), "faces:", len(leg.data.polygons))

# Check wrist vertices on ArmLeft
wrist_verts = [v for v in arm.data.vertices if abs(v.co.x) > 0.65]
print("ArmLeft wrist/hand vert count:", len(wrist_verts))
print("X range of wrist/hand:", min(abs(v.co.x) for v in wrist_verts), "to", max(abs(v.co.x) for v in wrist_verts))

# Check leg vertices
leg_verts = leg.data.vertices
print("Leg Z range:", min(v.co.z for v in leg_verts), "to", max(v.co.z for v in leg_verts))
