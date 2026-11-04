import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")
ROGUE = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
OUT_DIR = os.path.join(WORKSPACE, "scratch", "characterverse_validation")

def render_model(path, hide_names, out_name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    for name in hide_names:
        o = bpy.data.objects.get(name)
        if o:
            o.hide_render = True
            
    # Set camera
    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam.location = (0, -3.2, 0.9)
    cam.rotation_euler = (1.5708, 0, 0)
    
    # Lighting
    light_data = bpy.data.lights.new("Sun", type='SUN')
    light_data.energy = 3.0
    light = bpy.data.objects.new("Sun", light_data)
    bpy.context.scene.collection.objects.link(light)
    light.rotation_euler = (0.785, 0.5, 0.5)
    
    bpy.context.scene.render.resolution_x = 800
    bpy.context.scene.render.resolution_y = 800
    bpy.context.scene.render.filepath = os.path.join(OUT_DIR, out_name)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {out_name}")

render_model(KNIGHT, ['Knight_Helmet', '1H_Sword', '1H_Sword_Offhand', '2H_Sword', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield'], "inspect_knight_bare.png")
render_model(ROGUE, ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable'], "inspect_rogue_bare.png")
