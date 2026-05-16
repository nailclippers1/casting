import json
import urllib.parse
import urllib.request
import os
from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))
now = datetime.now(JST)
date_str = now.strftime("%Y-%m-%d")
timestamp = now.strftime("%Y-%m-%dT%H:%M:%S+09:00")

GAS_URL = (
    "https://script.google.com/macros/s/"
    "AKfycbzt4ixKPEwh2jF5qu-G2rKe-uym7nJDACE0O807mkTPAkw10QiDOcQxOTVAIi9aBDNqKw/exec"
)

WORKS = ["エースをねらえ！", "ベルサイユのばら", "ガラスの仮面", "スラムダンク"]

results = {}
for work in WORKS:
    try:
        url = GAS_URL + "?work=" + urllib.parse.quote(work)
        req = urllib.request.Request(url, headers={"User-Agent": "journal-recorder/1.0"})
        with urllib.request.urlopen(req, timeout=30) as response:
            results[work] = json.loads(response.read().decode("utf-8"))
    except Exception as e:
        results[work] = {"error": str(e)}
        print(f"警告: {work} の取得に失敗しました: {e}")

journal_entry = {"date": timestamp, "results": results}

os.makedirs("journal", exist_ok=True)
output_path = f"journal/{date_str}.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(journal_entry, f, ensure_ascii=False, indent=2)

print(f"ジャーナルを記録しました: {output_path}")
