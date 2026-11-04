import subprocess
import os
import time

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
brain_dir = r"C:\Users\Dell\.gemini\antigravity\brain\7b4211d5-5670-4b1b-a9d3-36761e2d4d5b"

shots = [
    {
        "url": "http://localhost:4173/characterverse/?arena=true&cam=leader",
        "budget": 3500,
        "out": os.path.join(brain_dir, "endless_journey_t3s.png"),
        "label": "Endless Journey - Close-Up Follow at t=3s"
    },
    {
        "url": "http://localhost:4173/characterverse/?arena=true&cam=leader",
        "budget": 10000,
        "out": os.path.join(brain_dir, "endless_journey_t10s.png"),
        "label": "Endless Journey - Close-Up Follow at t=10s"
    },
    {
        "url": "http://localhost:4173/characterverse/?arena=true&cam=broadcast",
        "budget": 5000,
        "out": os.path.join(brain_dir, "endless_scenic_vista.png"),
        "label": "Endless Journey - Scenic Vista Overview"
    }
]

for s in shots:
    print(f"Capturing: {s['label']} (budget={s['budget']}ms)...")
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
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
    if os.path.exists(temp_shot) and os.path.getsize(temp_shot) > 1000:
        if os.path.exists(s["out"]):
            os.remove(s["out"])
        os.rename(temp_shot, s["out"])
        print(f"  -> SUCCESS: Saved {s['out']} ({os.path.getsize(s['out'])} bytes)")
    else:
        print(f"  -> FAILED: stderr: {res.stderr[:200]}")

print("All endless world screenshots captured successfully.")
