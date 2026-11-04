import bpy

src = r"characterverse/public/models/Knight.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

print("=== OBJECTS IN KNIGHT.GLB ===")
for o in bpy.data.objects:
    pb = o.parent_bone if o.parent_type == 'BONE' else None
    print(f"{o.name}: type={o.type}, parent={o.parent.name if o.parent else None}, parent_bone={pb}")

print("\n=== MESHES ===")
for m in bpy.data.meshes:
    print(f"Mesh: {m.name}, verts: {len(m.vertices)}, faces: {len(m.polygons)}")

print("\n=== WEAPON / SHIELD OBJECTS DETAILS ===")
for o in bpy.data.objects:
    if any(w in o.name.lower() for w in ['sword', 'shield', 'blade', 'weapon', 'arm', 'hand']):
        print(f"\nObject: {o.name}")
        print(f"  Parent: {o.parent.name if o.parent else None}, type: {o.parent_type}, bone: {o.parent_bone}")
        print(f"  Location: {o.location}")
        print(f"  Rotation (euler): {o.rotation_euler}")
        print(f"  Scale: {o.scale}")
        print(f"  Matrix World Translation: {o.matrix_world.to_translation()}")
        if o.type == 'MESH':
            print(f"  Vertices: {len(o.data.vertices)}, Polygons: {len(o.data.polygons)}")
            print(f"  Materials: {[m.name for m in o.data.materials]}")
