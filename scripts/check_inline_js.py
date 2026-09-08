"""
Syntax-checks every inline <script> block in one or more HTML files using
Node's `node --check` -- catches JS SyntaxErrors (duplicate declarations,
mismatched braces, etc.) before they ship. A SyntaxError in an inline
<script> block kills that ENTIRE block's execution, so this catches a real,
high-impact class of bug that a text diff of generated HTML can't (see
db-tools commit 05f17dc -- a duplicate `const d` in chart_lib.py's
renderBarLineChart broke every chart/table on all 10 Market Report pages,
undetected for days because verification was diff-only, never execution).

Skips <script src="...">, application/ld+json, and application/json blocks
-- only checks real inline JS.

Usage:
    py scripts/check_inline_js.py <file1.html> [file2.html ...]
    py scripts/check_inline_js.py --all          # scan the whole site/ tree

Exit code 0 if everything passes, 1 if any script fails to parse.
"""
import sys
import subprocess
import tempfile
import os
import glob
from html.parser import HTMLParser

SITE_DIR = os.path.join(os.path.dirname(__file__), "..", "site")

SKIP_TYPES = {"application/ld+json", "application/json"}


class ScriptExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self._in_script = False
        self._skip_current = False
        self._buf = []

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return
        attrs = dict(attrs)
        self._skip_current = "src" in attrs or attrs.get("type") in SKIP_TYPES
        self._in_script = True
        self._buf = []

    def handle_data(self, data):
        if self._in_script:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag != "script" or not self._in_script:
            return
        self._in_script = False
        if not self._skip_current:
            content = "".join(self._buf).strip()
            if content:
                self.scripts.append(content)


def check_file(path):
    with open(path, encoding="utf-8") as f:
        html = f.read()
    extractor = ScriptExtractor()
    extractor.feed(html)

    failures = []
    for i, script in enumerate(extractor.scripts):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, encoding="utf-8") as tmp:
            tmp.write(script)
            tmp_path = tmp.name
        try:
            result = subprocess.run(["node", "--check", tmp_path], capture_output=True, text=True)
            if result.returncode != 0:
                failures.append((i, result.stderr.strip()))
        finally:
            os.unlink(tmp_path)
    return failures


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: py check_inline_js.py <file.html> [...] | --all")
        sys.exit(2)

    if args == ["--all"]:
        files = glob.glob(os.path.join(SITE_DIR, "**", "*.html"), recursive=True)
    else:
        files = args

    any_failure = False
    for path in files:
        failures = check_file(path)
        if failures:
            any_failure = True
            for i, err in failures:
                print(f"FAIL: {path} (inline script #{i})")
                print(err)
                print()

    if any_failure:
        sys.exit(1)
    if args == ["--all"]:
        print(f"All inline scripts across {len(files)} files pass node --check clean.")
    sys.exit(0)


if __name__ == "__main__":
    main()
