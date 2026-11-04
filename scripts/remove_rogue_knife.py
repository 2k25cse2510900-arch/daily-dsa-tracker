import bpy
import os
import shutil

WORKSPACE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
src_glb = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
temp_out_glb = os.path.join(WORKSPACE, "scratch", "Rogue_no_knife.glb")

target_destinations = [
    os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb"),
    os.path.join(WORKSPACE, "characterverse", "dist", "models", "Rogue.glb"),
    os.path.join(WORKSPACE, "characterverse", "dist-embed", "models", "Rogue.glb"),
    os.path.join(WORKSPACE, "public", "characterverse", "models", "Rogue.glb"),
    os.path.join(WORKSPACE, "public", "characterverse-embed", "models", "Rogue.glb"),
]

print(f"Loading source model from {src_glb}...")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src_glb)

# Find Knife on right arm
knife_obj = bpy.data.objects.get("Knife")
if not knife_obj:
    raise RuntimeError("Could not find 'Knife' object in Rogue.glb!")

print(f"Found target object: {knife_obj.name}, parent: {knife_obj.parent.name if knife_obj.parent else None}, parent bone: {knife_obj.parent_bone}")
assert knife_obj.parent_bone == "handslot.r" or (knife_obj.parent and "r" in knife_obj.parent.name.lower()), "Knife is not on right arm!"

# Ensure Knife_Offhand on left arm is intact
knife_offhand = bpy.data.objects.get("Knife_Offhand")
assert knife_offhand is not None, "Knife_Offhand must exist on left arm!"
print(f"Verified Knife_Offhand on left arm: {knife_offhand.name}, parent bone: {knife_offhand.parent_bone}")

# Ensure Crossbow is intact
crossbow_1h = bpy.data.objects.get("1H_Crossbow")
assert crossbow_1h is not None, "1H_Crossbow must exist on right arm!"
print(f"Verified 1H_Crossbow on right arm: {crossbow_1h.name}, parent bone: {crossbow_1h.parent_bone}")

# Remove Knife object and its mesh datablock completely
mesh_data = knife_obj.data
bpy.data.objects.remove(knife_obj, do_unlink=True)
if mesh_data:
    bpy.data.meshes.remove(mesh_data, do_unlink=True)
print("Target Knife and all its mesh fragments successfully removed.")

# Verify remaining objects
remaining_names = [o.name for o in bpy.data.objects]
print(f"Remaining objects ({len(remaining_names)}): {remaining_names}")
assert "Knife" not in remaining_names, "Knife still present in objects!"
assert "1H_Crossbow" in remaining_names, "1H_Crossbow was accidentally removed!"
assert "Knife_Offhand" in remaining_names, "Knife_Offhand was accidentally removed!"

# Export clean GLB
print(f"Exporting clean GLB to {temp_out_glb}...")
bpy.ops.export_scene.gltf(
    filepath=temp_out_glb,
    export_format='GLB',
    use_selection=False,
    export_animations=True,
    export_apply=False,
    export_skins=True,
    export_morph=True,
    export_lights=False,
    export_cameras=False
)

sz = os.path.getsize(temp_out_glb)
print(f"Export completed. Size: {sz} bytes")
assert sz > 2000000, "Exported file size is too small!"

# Deploy to all 5 target directories
for dest in target_destinations:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(temp_out_glb, dest)
    print(f"Copied clean model to {dest} ({os.path.getsize(dest)} bytes)")

print("\nAll 5 Rogue.glb assets successfully updated!")
