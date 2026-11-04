import subprocess
import os
import time
import threading
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
brain_dir = r"C:\Users\Dell\.gemini\antigravity\brain\7b4211d5-5670-4b1b-a9d3-36761e2d4d5b"
dist_dir = os.path.abspath("characterverse/dist")

class CharacterVerseHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        rel_path = path.split('?')[0].split('#')[0]
        if rel_path.startswith('/characterverse'):
            rel_path = rel_path[len('/characterverse'):]
        if not rel_path or rel_path == '/':
            rel_path = '/index.html'
        clean = rel_path.lstrip('/')
        return os.path.join(dist_dir, clean)

server = TCPServer(('127.0.0.1', 4189), CharacterVerseHandler)
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
print("Preview server started on http://127.0.0.1:4189")

shots = [
    {
        "url": "http://127.0.0.1:4189/characterverse/?arena=true&selectMode=true",
        "budget": 6000,
        "out": os.path.join(brain_dir, "unified_race_mode_selection_modal.png"),
        "label": "How would you like to race? - Clean Premium Race Mode Selection Modal"
    },
    {
        "url": "http://127.0.0.1:4189/characterverse/?arena=true&cam=leader&focus=superman",
        "budget": 6000,
        "out": os.path.join(brain_dir, "unified_character_mode_superman.png"),
        "label": "Character Mode - Superman Authentic Flying Locomotion"
    },
    {
        "url": "http://127.0.0.1:4189/characterverse/?tab=vehicles",
        "budget": 6000,
        "out": os.path.join(brain_dir, "unified_character_store_race_mode.png"),
        "label": "Character Store - Vehicle Hangar & Active Race Mode Selector"
    },
    {
        "url": "http://127.0.0.1:4189/characterverse/?arena=true&cam=leader&focus=rocket",
        "budget": 6000,
        "out": os.path.join(brain_dir, "unified_vehicle_mode_rocket.png"),
        "label": "Vehicle Mode - Cosmic Titan Rocket Live Kinematics"
    }
]

for s in shots:
    print(f"Capturing: {s['label']}...")
    temp_shot = os.path.join(brain_dir, f"temp_{int(time.time()*1000)}.png")
    cmd = [
        edge_path,
        "--headless=new",
        "--disable-gpu",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--enable-webgl",
        "--window-size=1440,900",
        "--hide-scrollbars",
        f"--virtual-time-budget={s['budget']}",
        f"--screenshot={temp_shot}",
        s["url"]
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
        if os.path.exists(temp_shot):
            size = os.path.getsize(temp_shot)
            print(f"  Captured: {size} bytes")
            if size > 10000:
                if os.path.exists(s["out"]):
                    os.remove(s["out"])
                os.rename(temp_shot, s["out"])
                print(f"  Saved to: {s['out']}")
            else:
                print(f"  Warning: small screenshot ({size} bytes)")
        else:
            print(f"  Error: screenshot not found: {temp_shot}")
    except Exception as e:
        print(f"  Capture failed: {e}")

server.shutdown()
print("Screenshot capture cycle completed.")
