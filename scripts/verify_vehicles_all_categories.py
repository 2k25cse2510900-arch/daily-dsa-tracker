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

server = TCPServer(('127.0.0.1', 4176), CharacterVerseHandler)
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()
print("Preview server started on http://127.0.0.1:4176")

shots = [
    {
        "url": "http://127.0.0.1:4176/characterverse/?arena=true&cam=leader&focus=bike",
        "budget": 5000,
        "out": os.path.join(brain_dir, "vehicle_journey_bike.png"),
        "label": "Common Ninja Superbike - Close-up Chase & Telemetry"
    },
    {
        "url": "http://127.0.0.1:4176/characterverse/?arena=true&cam=leader&focus=car",
        "budget": 5000,
        "out": os.path.join(brain_dir, "vehicle_journey_car.png"),
        "label": "Rare Apex Supercar - Close-up Chase & Telemetry"
    },
    {
        "url": "http://127.0.0.1:4176/characterverse/?arena=true&cam=leader&focus=rocket",
        "budget": 5000,
        "out": os.path.join(brain_dir, "vehicle_journey_rocket.png"),
        "label": "Legendary Cosmic Titan Rocket - Flight Elevation & Telemetry"
    },
    {
        "url": "http://127.0.0.1:4176/characterverse/?arena=true&cam=broadcast",
        "budget": 6000,
        "out": os.path.join(brain_dir, "vehicle_arena_pack_overview.png"),
        "label": "Endless Journey World - Pack Overview"
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
        f"--virtual-time-budget={s['budget']}",
        f"--screenshot={temp_shot}",
        s["url"]
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=50)
    if os.path.exists(temp_shot) and os.path.getsize(temp_shot) > 10000:
        if os.path.exists(s["out"]):
            os.remove(s["out"])
        os.rename(temp_shot, s["out"])
        print(f"  -> SUCCESS: Saved {s['out']} ({os.path.getsize(s['out'])} bytes)")
    else:
        print(f"  -> FAILED: stderr: {res.stderr[:200]}")

server.shutdown()
print("All vehicle screenshots captured successfully.")
