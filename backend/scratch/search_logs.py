import json

log_path = r"C:\Users\ONLINE\.gemini\antigravity\brain\6d928f74-2430-41b6-a997-256f247708d3\.system_generated\logs\transcript.jsonl"

print("Searching transcript.jsonl for pymysql or expresscronjob...")
with open(log_path, "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "pymysql" in line.lower() or "expresscronjob" in line.lower():
            data = json.loads(line)
            # Only print if step_index is less than the current step to see past history
            step_idx = data.get("step_index", 0)
            if step_idx < 1380:
                print(f"Match found at line {i+1}, step_index={step_idx}, type={data.get('type')}, source={data.get('source')}")
                content = data.get("content", "")
                print(f"Content preview: {content[:300]}...")
                print("-" * 50)
