import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")
ROGUE = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")
SUPERMAN = os.path.join(WORKSPACE, "characterverse", "public", "models", "Superman.glb")

def inspect_mats(path, label):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    print(f"\n=== MATERIALS IN {label} ===")
    for mat in bpy.data.materials:
        print(f"Material: {mat.name}")
        if mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    rough = node.inputs['Roughness'].default_value
                    spec = node.inputs['Specular IOR Level'].default_value if 'Specular IOR Level' in node.inputs else node.inputs['Specular'].default_value
                    metal = node.inputs['Metallic'].default_value
                    print(f"   BSDF Roughness: {rough}, Specular: {spec}, Metallic: {metal}")
                elif node.type == 'TEX_IMAGE':
                    interp = node.interpolation
                    print(f"   Image Tex: {node.image.name if node.image else 'None'}, Interp: {interp}")

inspect_mats(KNIGHT, "KNIGHT")
inspect_mats(ROGUE, "ROGUE")
inspect_mats(SUPERMAN, "SUPERMAN")
