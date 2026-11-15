#!/usr/bin/env python3
"""Minimal driver for GPT-6 Astra via Xingchi relay (OpenAI-compatible).
Usage: OPENAI_API_KEY=... python3 astra-review.py <prompt-file> [system-file] [--no-reasoning]
Prints the model's reply to stdout, usage (no key) to stderr.
Key ONLY from env OPENAI_API_KEY. Never log or print the key.
"""
import json
import os
import sys
import urllib.request
import urllib.error

BASE = os.environ.get("OPENAI_BASE_URL", "https://api.xingchiapi.com/v1")
MODEL = os.environ.get("ASTRA_MODEL", "gpt-6-astra")
KEY = os.environ.get("OPENAI_API_KEY")
if not KEY:
    sys.exit("OPENAI_API_KEY not set")

args = [a for a in sys.argv[1:] if not a.startswith("--")]
use_reasoning = "--no-reasoning" not in sys.argv
prompt = open(args[0]).read() if args else sys.stdin.read()
system = (open(args[1]).read() if len(args) > 1 else
          "You are a ruthless expert reviewer of quantitative finance models and data pipelines. "
          "Be adversarial: find what would lose. Answer with verdicts and concrete evidence only.")

body = {
    "model": MODEL,
    "messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": prompt},
    ],
    "temperature": 0.2,
}
if use_reasoning:
    body["reasoning_effort"] = "high"
req = urllib.request.Request(
    BASE + "/chat/completions", data=json.dumps(body).encode(),
    headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=600) as r:
        d = json.load(r)
except urllib.error.HTTPError as e:
    print(f"[http-error {e.code}] {e.read().decode(errors='replace')[:300]}", file=sys.stderr)
    sys.exit(2)
print(d["choices"][0]["message"]["content"])
u = d.get("usage", {})
print(f"[usage prompt={u.get('prompt_tokens')} completion={u.get('completion_tokens')} "
      f"total={u.get('total_tokens')} model={d.get('model')}]", file=sys.stderr)
