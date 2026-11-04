import bpy
import os
import math

src = r"characterverse/public/models/Knight.glb"
brain_dir = r"C:\Users\Dell\.gemini\antigravity\brain\7b4211d5-5670-4b1b-a9d3-36761e2d4d5b"

def setup_render():
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.samples = 12
    bpy.context.scene.cycles.adaptive_threshold = 0.1
    bpy.context.scene.render.resolution_x = 700
    bpy.context.scene.render.resolution_y = 700
    
    cam_data = bpy.data.cameras.new("Cam")
    cam_obj = bpy.data.objects.new("Cam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    cam_obj.location = (-1.8, -1.8, 1.0)
    cam_obj.rotation_euler = (math.radians(75), 0, math.radians(-45))
    
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs['Color'].default_value = (0.92, 0.92, 0.94, 1.0)
        bg_node.inputs['Strength'].default_value = 1.0
        
    light_key = bpy.data.lights.new("SunKey", type='SUN')
    light_key.energy = 2.5
    obj_key = bpy.data.objects.new("SunKey", light_key)
    bpy.context.scene.collection.objects.link(obj_key)
    obj_key.location = (2, -2, 4)
    
    light_fill = bpy.data.lights.new("SunFill", type='SUN')
    light_fill.energy = 1.5
    obj_fill = bpy.data.objects.new("SunFill", light_fill)
    bpy.context.scene.collection.objects.link(obj_fill)
    obj_fill.location = (-2, 2, 3)

# Test Option 1: 1H_Sword
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for name in ['2H_Sword', '1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield']:
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)
setup_render()
bpy.context.scene.render.filepath = os.path.join(brain_dir, "test_knight_1h_sword.png")
bpy.ops.render.render(write_still=True)

# Test Option 2: 2H_Sword
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for name in ['1H_Sword', '1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield']:
    o = bpy.data.objects.get(name)
    if o:
        bpy.data.objects.remove(o, do_unlink=True)
setup_render()
bpy.context.scene.render.filepath = os.path.join(brain_dir, "test_knight_2h_sword.png")
bpy.ops.render.render(write_still=True)
print("Rendered test_knight_1h_sword.png and test_knight_2h_sword.png")
