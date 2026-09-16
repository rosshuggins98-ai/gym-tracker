#!/usr/bin/env python3
"""Concatenate src/ into app/gym-tracker.html.

    python3 build.py           # write app/gym-tracker.html
    python3 build.py --check   # exit 1 if the committed file is stale

The app is edited as modules under src/ but shipped -- and committed -- as
one self-contained HTML file (see CLAUDE.md, "Hard constraints"). The output
is a plain byte-for-byte concatenation, nothing is rewritten:

    src/head.html
    <style>  src/style.css  </style>
    src/shell.html
    <script> src/js/*.js in name order </script>
    src/tail.html

JS modules are numbered (10-lib.js, 20-plans.js ...) because order matters:
it's one script scope, and later files call into earlier ones. No bundler,
no minifier, no npm -- stdlib only, like serve.py.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
OUT = os.path.join(HERE, "app", "gym-tracker.html")

def read(*parts):
    with open(os.path.join(SRC, *parts), encoding="utf-8", newline="") as fh:
        return fh.read()

def build():
    js_dir = os.path.join(SRC, "js")
    js_files = sorted(f for f in os.listdir(js_dir) if f.endswith(".js"))
    return (read("head.html")
            + "<style>\n" + read("style.css") + "</style>\n"
            + read("shell.html")
            + "<script>\n" + "".join(read("js", f) for f in js_files) + "</script>\n"
            + read("tail.html"))

def main(argv):
    out = build()
    if "--check" in argv:
        try:
            with open(OUT, encoding="utf-8", newline="") as fh:
                cur = fh.read()
        except FileNotFoundError:
            cur = None
        if cur != out:
            print("app/gym-tracker.html is stale -- run: python3 build.py", file=sys.stderr)
            return 1
        print("app/gym-tracker.html is up to date")
        return 0
    with open(OUT, "w", encoding="utf-8", newline="") as fh:
        fh.write(out)
    print("wrote %s (%d bytes)" % (os.path.relpath(OUT, HERE), len(out.encode("utf-8"))))
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
