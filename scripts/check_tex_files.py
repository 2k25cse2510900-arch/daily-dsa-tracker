import bpy
import os

WORKSPACE = r"C:\Users\Dell\OneDrive\Desktop\dsa_admin_dashboard"
KNIGHT_TEX = os.path.join(WORKSPACE, "scratch", "characterverse_validation", "knight_texture.png")
ROGUE_TEX = os.path.join(WORKSPACE, "scratch", "characterverse_validation", "rogue_texture.png")
SUPERMAN_TEX = os.path.join(WORKSPACE, "scratch", "characterverse_validation", "superman_texture.png")

print("Knight tex exists:", os.path.exists(KNIGHT_TEX))
print("Rogue tex exists:", os.path.exists(ROGUE_TEX))
print("Superman tex exists:", os.path.exists(SUPERMAN_TEX))
