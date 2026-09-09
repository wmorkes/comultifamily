"""
Structural checks for the static site, in the same spirit as
check_inline_js.py -- catches silent breakage that a text diff can't:

1. Broken internal links -- every href="/..." resolved against the site's
   actual routing convention (trailing-slash -> <path>.html, or
   <path>/index.html for directory-style pages like dashboards) and
   confirmed the target file exists.
2. Broken image references -- every <img src="..."> (HTML) and
   background-image: url(...) (CSS) resolved against site/images/.
3. Duplicate id="..." attributes within a single page -- this site's JS
   leans on getElementById() throughout (chart SVGs, table containers,
   filter controls); a duplicate id silently breaks whichever element JS
   finds first, with no error at all.
4. CSS brace balance -- an unclosed rule silently swallows every rule
   after it until the file happens to re-balance, so a real break can be
   far from its actual cause. Loud/visible in the browser (unlike 1-3),
   but cheap enough to check anyway per Bill's explicit ask 2026-09-08.
5. Untokenizable client dashboards -- any dashboard page that calls
   isDashboardUnlocked('<slug>', ...) is meant to be shareable via a
   scoped client token, but the Token Generator (dashboards/token-gen/)
   only grants scopes it has a checkbox for. A dashboard added without a
   matching checkbox there is gated but can never actually be unlocked
   for a client -- this happened for real with Affordable Housing
   (2026-09-09), caught only by manual review. Only --all checks this
   (it's a whole-site consistency check, not a single-file one), and it
   is a reminder, not an auto-fix: some dashboards (e.g. Capital Flow,
   On-Market) are deliberately team-only and gate on isTeam alone with
   no isDashboardUnlocked call at all, so they're correctly absent.

Usage:
    py scripts/check_site_integrity.py <file1.html|file1.css> [...]
    py scripts/check_site_integrity.py --all

Exit code 0 if clean, 1 if any violation found.
"""
import sys
import os
import re
import glob
from html.parser import HTMLParser
from urllib.parse import urlparse

SITE_DIR = os.path.join(os.path.dirname(__file__), "..", "site")
TOKEN_GEN_PATH = os.path.join(SITE_DIR, "dashboards", "token-gen", "index.html")

UNLOCKED_SLUG_RE = re.compile(r"isDashboardUnlocked\(\s*['\"]([\w-]+)['\"]")
SCOPE_CHECKBOX_RE = re.compile(r'<input\s+type="checkbox"\s+value="([\w-]+)"')

# Known non-page routes that don't need a matching page file (Netlify
# Functions, API redirects) -- extend if more come up.
SKIP_PREFIXES = ("/.netlify/", "/api/")

LINK_ATTRS = {"a": "href", "link": "href", "img": "src", "script": "src", "form": "action"}

CSS_URL_RE = re.compile(r'url\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)')


class PageScanner(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []      # href/src/action values worth checking
        self.ids = []        # every id="..." value seen, in order

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs and attrs["id"]:
            self.ids.append(attrs["id"])
        attr_name = LINK_ATTRS.get(tag)
        if attr_name and attrs.get(attr_name):
            self.links.append((tag, attrs[attr_name]))

    handle_startendtag = handle_starttag  # self-closing tags (e.g. <img/>)


def resolve_internal_path(href):
    """Returns the site/-relative file path a href should resolve to, or
    None if it's external / not a checkable internal link."""
    if href.startswith(("http://", "https://", "//", "mailto:", "tel:", "#", "javascript:", "data:")):
        return None
    parsed = urlparse(href)
    path = parsed.path
    if not path or not path.startswith("/"):
        return None
    if any(path.startswith(p) for p in SKIP_PREFIXES):
        return None

    path = path.rstrip("/") or "/"
    if path == "/":
        return os.path.join(SITE_DIR, "index.html")

    rel = path.lstrip("/")
    # Direct asset (has a file extension) -- images/css/js/data/etc.
    if "." in os.path.basename(rel):
        return os.path.join(SITE_DIR, rel)

    # Page route -- try <path>.html first (CLAUDE.md's documented
    # slug.html convention), then <path>/index.html (dashboards).
    as_html = os.path.join(SITE_DIR, rel + ".html")
    as_index = os.path.join(SITE_DIR, rel, "index.html")
    if os.path.exists(as_html):
        return as_html
    if os.path.exists(as_index):
        return as_index
    return as_html  # neither exists -- report the more common form


def check_html_file(path):
    with open(path, encoding="utf-8") as f:
        html = f.read()
    scanner = PageScanner()
    scanner.feed(html)

    problems = []

    seen = set()
    for tag, href in scanner.links:
        if href in seen:
            continue
        seen.add(href)
        target = resolve_internal_path(href)
        if target and not os.path.exists(target):
            kind = "image" if tag == "img" else "link"
            problems.append(f'broken {kind}: "{href}" -> no file at {os.path.relpath(target, SITE_DIR)}')

    seen_ids = {}
    for id_val in scanner.ids:
        seen_ids[id_val] = seen_ids.get(id_val, 0) + 1
    for id_val, count in seen_ids.items():
        if count > 1:
            problems.append(f'duplicate id="{id_val}" ({count} occurrences)')

    return problems


def check_css_file(path):
    with open(path, encoding="utf-8") as f:
        css = f.read()

    problems = []

    # -- brace balance --
    depth = 0
    line = 1
    unbalanced_at = None
    for ch in css:
        if ch == "\n":
            line += 1
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth < 0 and unbalanced_at is None:
                unbalanced_at = line
    if unbalanced_at is not None:
        problems.append(f"unbalanced braces: extra '}}' around line {unbalanced_at}")
    elif depth != 0:
        problems.append(f"unbalanced braces: {depth} unclosed '{{' at end of file")

    # -- broken image url() references --
    seen = set()
    for url in CSS_URL_RE.findall(css):
        if url in seen:
            continue
        seen.add(url)
        target = resolve_internal_path(url)
        if target and not os.path.exists(target):
            problems.append(f'broken image url(): "{url}" -> no file at {os.path.relpath(target, SITE_DIR)}')

    return problems


def check_file(path):
    if path.endswith(".css"):
        return check_css_file(path)
    return check_html_file(path)


def check_token_scope_coverage():
    """Every dashboard page gated by isDashboardUnlocked('<slug>', ...) must
    have a matching scope checkbox in token-gen/index.html, or a client
    token can never unlock it. Deliberately team-only dashboards (gate on
    isTeam with no isDashboardUnlocked call) are correctly excluded."""
    if not os.path.exists(TOKEN_GEN_PATH):
        return {}

    with open(TOKEN_GEN_PATH, encoding="utf-8") as f:
        token_gen_html = f.read()
    available_scopes = set(SCOPE_CHECKBOX_RE.findall(token_gen_html))

    missing = {}
    dashboard_files = glob.glob(os.path.join(SITE_DIR, "dashboards", "**", "index.html"), recursive=True)
    for path in dashboard_files:
        if os.path.abspath(path) == os.path.abspath(TOKEN_GEN_PATH):
            continue
        with open(path, encoding="utf-8") as f:
            html = f.read()
        slugs = set(UNLOCKED_SLUG_RE.findall(html))
        gap = slugs - available_scopes
        if gap:
            rel = os.path.relpath(path, os.path.dirname(SITE_DIR))
            missing[rel] = gap
    return missing


def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: py check_site_integrity.py <file.html|file.css> [...] | --all")
        sys.exit(2)

    if args == ["--all"]:
        files = glob.glob(os.path.join(SITE_DIR, "**", "*.html"), recursive=True)
        files += glob.glob(os.path.join(SITE_DIR, "**", "*.css"), recursive=True)
    else:
        files = [f for f in args if f.endswith((".html", ".css"))]

    any_failure = False
    for path in files:
        problems = check_file(path)
        if problems:
            any_failure = True
            rel = os.path.relpath(path, os.path.dirname(SITE_DIR))
            print(f"FAIL: {rel}")
            for p in problems:
                print(f"  - {p}")
            print()

    if args == ["--all"]:
        missing_scopes = check_token_scope_coverage()
        if missing_scopes:
            any_failure = True
            print("FAIL: dashboards gated but not selectable in the Token Generator")
            for rel, slugs in sorted(missing_scopes.items()):
                print(f"  - {rel}: missing scope checkbox for {', '.join(sorted(slugs))}")
            print("    -> add <input type=\"checkbox\" value=\"<slug>\"> to dashboards/token-gen/index.html")
            print()

    if any_failure:
        sys.exit(1)
    if args == ["--all"]:
        print(f"No broken links/images, duplicate ids, CSS brace issues, or missing token scopes across {len(files)} files.")
    sys.exit(0)


if __name__ == "__main__":
    main()
