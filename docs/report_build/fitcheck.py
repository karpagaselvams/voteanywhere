#!/usr/bin/env python3
"""
Layout fit checker for the report.

No headless browser exists in this environment, so page overflow cannot be
measured by rendering. This script estimates the vertical space each page's
content occupies under the reference document's typography (Times New Roman
12 pt, 1.6 line height, A4, padding 20/20/25/25 mm) and reports pages whose
content is taller than the printable area.

The model is deliberately flat: each page is decomposed into leaf blocks
(headings, paragraphs, list items, <pre>, tables, screenshot mock-ups), each
block is measured once, and the results are summed. It is calibrated against
the reference document, whose every page is known to be one printed page.
"""

import math
import os
import re
import sys

PT = 0.352778          # mm per point
COL_W = 165.0          # printable width  (210 - 25 - 20)
COL_H = 252.0          # printable height (297 - 20 - 25)

# Times New Roman averages ~0.47 em per character over mixed prose.
EM = 0.47

# Calibrated against the two reference documents in sample_docs/, whose pages
# are known to print as single pages. The raw estimator over-counts by a
# stable factor; SCALE removes it.
SCALE = 0.887
WARN = 1.00
FAIL = 1.12


def cpl(size, width=COL_W, indent=0.0):
    """Characters per line for a given font size in points."""
    usable = max(width - indent, 12.0)
    return max(int(usable / (EM * size * PT)), 8)


def lines_for(text, size, width=COL_W, indent=0.0):
    n = len(text)
    if n == 0:
        return 0
    return max(1, math.ceil(n / cpl(size, width, indent)))


def text_of(fragment):
    t = re.sub(r"<[^>]+>", " ", fragment)
    t = t.replace("&nbsp;", " ").replace("&mdash;", "—").replace("&ndash;", "–")
    t = re.sub(r"&[a-z]+;", "x", t)
    return " ".join(t.split())


def measure_table(fragment):
    """Estimate a table's height from its rows and column count."""
    h = 3.0
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", fragment, flags=re.S | re.I):
        cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row, flags=re.S | re.I)
        if not cells:
            continue
        ncols = max(len(cells), 1)
        colw = COL_W / ncols
        row_lines = 1
        for cell in cells:
            row_lines = max(row_lines, lines_for(text_of(cell), 10.0, colw - 4.0))
        h += row_lines * 10.0 * 1.45 * PT + 2.3
    return h + 3.0


def measure_pre(fragment):
    inner = re.sub(r"^<pre[^>]*>|</pre>$", "", fragment, flags=re.S)
    inner = re.sub(r"<[^>]+>", "", inner)
    n = inner.count("\n") + 1
    size = 8.0
    if 'class="code-block"' in fragment:
        size = 7.6
    return n * size * 1.28 * PT + 6.4


def measure_screenshot(fragment):
    """Mock-ups are hand-built; estimate from their line count."""
    n = fragment.count("\n")
    return min(max(8.0 + n * 1.25, 26.0), 165.0)


def measure_page(fragment):
    total = 0.0

    # 1. screenshot mock-ups (nested the deepest — remove first)
    shots = []

    def stash_shot(m):
        shots.append(m.group(0))
        return "\n"

    frag = re.sub(r'<div class="screenshot">.*?\n</div>', stash_shot, fragment, flags=re.S)

    # 2. <pre> blocks
    pres = []

    def stash_pre(m):
        pres.append(m.group(0))
        return "\n"

    frag = re.sub(r"<pre[^>]*>.*?</pre>", stash_pre, frag, flags=re.S)

    # 3. tables
    tables = []

    def stash_table(m):
        tables.append(m.group(0))
        return "\n"

    frag = re.sub(r"<table[^>]*>.*?</table>", stash_table, frag, flags=re.S)

    # 4. leaf blocks in the remaining markup
    for m in re.finditer(r"<(h1|h2|h3|h4|p|li)([^>]*)>(.*?)</\1>", frag, flags=re.S | re.I):
        tag, attrs, inner = m.group(1).lower(), m.group(2), m.group(3)
        txt = text_of(inner)
        if tag == "h1":
            total += lines_for(txt, 16.0) * 16.0 * 1.35 * PT + 6.0
        elif tag == "h2":
            total += lines_for(txt, 14.0) * 14.0 * 1.25 * PT + 6.8
        elif tag in ("h3", "h4"):
            total += lines_for(txt, 12.0) * 12.0 * 1.25 * PT + 5.0
        elif tag == "li":
            total += lines_for(txt, 12.0, COL_W, 11.0) * 12.0 * 1.6 * PT + 1.1
        else:
            indent = 0.0 if 'class="no-indent"' in attrs else 11.0
            size = 12.0
            if "quote" in attrs:
                size = 11.0
            if "note" in attrs:
                size = 10.5
            total += lines_for(txt, size, COL_W, indent) * size * 1.6 * PT + 2.4

    # 5. bare <br> standing alone (spacers)
    total += len(re.findall(r"<br\s*/?>(?!\s*$)", frag)) * 6.7
    # 6. spacer divs
    for m in re.finditer(r'class="spacer-(sm|md|lg)"', frag):
        total += {"sm": 6.0, "md": 14.0, "lg": 28.0}[m.group(1)]
    # 7. rules
    total += len(re.findall(r"<hr", frag)) * 4.0

    for t in tables:
        total += measure_table(t)
    for p in pres:
        total += measure_pre(p)
    for s in shots:
        total += measure_screenshot(s)

    return total


def split_pages(text):
    blocks, depth, start = [], 0, None
    lines = text.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if start is None:
            if line.lstrip().startswith('<div class="page'):
                start = i
                depth = line.count("<div") - line.count("</div>")
        else:
            depth += line.count("<div") - line.count("</div>")
            if depth <= 0:
                blocks.append("".join(lines[start:i + 1]))
                start = None
    return blocks


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "VOTE_ANYWHERE_PROJECT_REPORT.html")
    text = open(target, encoding="utf-8").read()
    body = text.split("<body>", 1)[1]
    pages = split_pages(body)

    over, warn, ok = [], [], 0
    for page in pages:
        m = re.search(r'<div class="page-number">([^<]*)</div>', page)
        label = m.group(1) if m else "-"
        inner = re.sub(r'<div class="page-number">[^<]*</div>', "", page)
        height = measure_page(inner) * SCALE
        ratio = height / COL_H
        if ratio > FAIL:
            over.append((label, height, ratio))
        elif ratio > WARN:
            warn.append((label, height, ratio))
        else:
            ok += 1

    print("target         : %s" % os.path.basename(target))
    print("pages measured : %d" % len(pages))
    print("fit            : %d" % ok)
    print("tight          : %d" % len(warn))
    print("OVERFLOW       : %d" % len(over))
    if warn:
        print("\n-- tight --")
        for label, h, r in warn:
            print("   page %-6s %6.1f mm (%d%%)" % (label, h, round(r * 100)))
    if over:
        print("\n-- OVERFLOW --")
        for label, h, r in over:
            print("   page %-6s %6.1f mm (%d%%)" % (label, h, round(r * 100)))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
