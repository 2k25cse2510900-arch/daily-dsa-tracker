import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
SUPERMAN = os.path.join(WORKSPACE, "characterverse", "public", "models", "Superman.glb")
KNIGHT = os.path.join(WORKSPACE, "characterverse", "public", "models", "Knight.glb")
ROGUE = os.path.join(WORKSPACE, "characterverse", "public", "models", "Rogue.glb")

def analyze_mesh_quality(path, label):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    print(f"\n=======================================================")
    print(f"ANALYZING MESH QUALITY FOR: {label}")
    print(f"=======================================================")
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            # Check for non-manifold edges, loose vertices, sharp edges
            mesh = obj.data
            smooth_faces = sum(1 for f in mesh.polygons if f.use_smooth)
            flat_faces = sum(1 for f in mesh.polygons if not f.use_smooth)
            # Check edge sharpness
            sharp_edges = sum(1 for e in mesh.edges if e.use_edge_sharp)
            # Check normal angle consistency
            has_custom_normals = mesh.has_custom_normals
            print(f"Obj: {obj.name:22s} | V: {len(mesh.vertices):4d} | F: {len(mesh.polygons):4d} | SmoothF: {smooth_faces:4d} | FlatF: {flat_faces:4d} | SharpE: {sharp_edges:4d} | CustomNormals: {has_custom_normals}")

analyze_mesh_quality(KNIGHT, "KNIGHT")
analyze_mesh_quality(ROGUE, "ROGUE")
analyze_mesh_quality(SUPERMAN, "SUPERMAN")
