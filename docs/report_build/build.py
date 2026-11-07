#!/usr/bin/env python3
"""
Assemble the Vote Anywhere BCA project report into a single print-ready HTML.

Content lives in parts/NN-name.html. Each part holds whole <div class="page">
blocks. Pages that should carry a page number contain the token {{PN}}.

Placeholder pages
-----------------
A page whose body is exactly {{TOC_PAGES}}, {{LOF_PAGES}} or {{LOT_PAGES}}
is replaced by as many generated pages as the corresponding list needs.

Directives (inside HTML comments on the page they annotate)
-----------------------------------------------------------
    <!--TOC:chapter:CHAPTER 1: INTRODUCTION-->
    <!--TOC:sub:1.1 Overview of the Project-->
    <!--TOC:subsub:3.5.1 Technical Feasibility-->
    <!--FIG:4.1:System Architecture Diagram-->
    <!--TAB:4.1:Users Table Structure-->

Numbering
---------
Front matter (class="page roman-page") is numbered i, ii, iii …; everything
else is numbered 1, 2, 3 … The generated tables of contents, figures and
tables are rendered from the collected directives, so the lists can never
drift out of sync with the body. Because the generated list pages change the
front-matter numbering that those same lists quote, the numbering is solved
by iterating to a fixed point.
"""

import html
import os
import re
import sys

import flow

HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(HERE, "parts")
OUT = os.path.abspath(os.path.join(HERE, "..", "VOTE_ANYWHERE_PROJECT_REPORT.html"))

ROMAN = [(1000, "m"), (900, "cm"), (500, "d"), (400, "cd"), (100, "c"),
         (90, "xc"), (50, "l"), (40, "xl"), (10, "x"), (9, "ix"),
         (5, "v"), (4, "iv"), (1, "i")]

DIRECTIVE_RE = re.compile(r"<!--(TOC|FIG|TAB)\s*:\s*([^>]*?)-->")
PLACEHOLDER_RE = re.compile(r"\{\{(TOC_PAGES|LOF_PAGES|LOT_PAGES)\}\}")
TOKEN_RE = re.compile(r"\{\{[A-Z_]+\}\}")

TOC_PER_PAGE = 30
LIST_PER_PAGE = 33


def to_roman(n):
    out = []
    for value, glyph in ROMAN:
        while n >= value:
            out.append(glyph)
            n -= value
    return "".join(out)


def split_pages(text):
    """Split a part file into whole <div class="page">…</div> blocks."""
    blocks, depth, start = [], 0, None
    lines = text.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if start is None:
            if line.lstrip().startswith('<div class="page'):
                start, depth = i, line.count("<div") - line.count("</div>")
                if depth <= 0:
                    blocks.append("".join(lines[start:i + 1]))
                    start = None
        else:
            depth += line.count("<div") - line.count("</div>")
            if depth <= 0:
                blocks.append("".join(lines[start:i + 1]))
                start = None
    if start is not None:
        blocks.append("".join(lines[start:]))
    return blocks


def is_roman(block):
    return "roman-page" in block.split(">", 1)[0]


def esc(text):
    return html.escape(text, quote=False)


def rows_html(entries, cls_for=None):
    out = []
    for title, page in entries:
        cls = " " + cls_for(title[0], title[1]) if cls_for else ""
        out.append(
            '<div class="toc-entry%s"><span class="toc-title">%s</span>'
            '<span class="toc-dots"></span><span class="toc-page">%s</span></div>'
            % (cls, esc(title[1]), page)
        )
    return out


def build_pages(heading, rows, per_page, continuation_heading=None):
    """Slice rows into pages, each with a heading."""
    pages = []
    for idx in range(0, max(len(rows), 1), per_page):
        head = heading if idx == 0 else (continuation_heading or heading)
        pages.append((head, "\n".join(rows[idx:idx + per_page])))
    return pages


def main():
    part_files = sorted(f for f in os.listdir(PARTS) if f.endswith(".html"))
    if not part_files:
        sys.exit("no parts in %s" % PARTS)

    # ---- read source pages -------------------------------------------------
    source = []
    for name in part_files:
        with open(os.path.join(PARTS, name), encoding="utf-8") as fh:
            for block in split_pages(fh.read()):
                source.append(block)

    # ---- reflow so that no page overflows ----------------------------------
    from flow import reflow
    overflow_report = []
    flowed = []
    for block in source:
        flowed.extend(reflow(block, None, '<div class="page-number">{{PN}}</div>',
                             report=overflow_report))
    source = flowed

    # ---- strip directives, remember them -----------------------------------
    toc_spec, fig_spec, tab_spec = [], [], []
    for block in source:
        for kind, payload in DIRECTIVE_RE.findall(block):
            level, _, title = payload.partition(":")
            item = (level.strip(), title.strip())
            if kind == "TOC":
                toc_spec.append(item)
            elif kind == "FIG":
                fig_spec.append(item)
            else:
                tab_spec.append(item)

    stripped = [DIRECTIVE_RE.sub("", b) for b in source]

    # indices of placeholder pages
    ph_index = {}
    for i, block in enumerate(stripped):
        m = PLACEHOLDER_RE.search(block)
        if m:
            ph_index[m.group(1)] = i

    # ---- iterate to a fixed point ------------------------------------------
    expansion = {"TOC_PAGES": 1, "LOF_PAGES": 1, "LOT_PAGES": 1}
    labels = []
    for _ in range(8):
        # build the expanded sequence
        sequence = []          # list of (block_or_None, placeholder_kind)
        for i, block in enumerate(stripped):
            m = PLACEHOLDER_RE.search(block)
            if m:
                kind = m.group(1)
                sequence.append(("PH", kind))
            else:
                sequence.append(("BLOCK", block))

        # number every page
        roman_n = 0
        arabic_n = 0
        page_labels = []       # per sequence slot; for PH slots a list
        for kind, payload in sequence:
            if kind == "PH":
                count = expansion[payload]
                slot = []
                for _k in range(count):
                    roman_n += 1
                    slot.append(to_roman(roman_n))
                page_labels.append(slot)
            else:
                if is_roman(payload):
                    roman_n += 1
                    page_labels.append(to_roman(roman_n) if "{{PN}}" in payload else "")
                else:
                    arabic_n += 1
                    page_labels.append(str(arabic_n) if "{{PN}}" in payload else "")

        # which label belongs to each content page (for the lists)
        content_labels = [lbl for (kind, _), lbl in zip(sequence, page_labels) if kind == "BLOCK"]

        # render list rows and count the pages they need
        toc_rows = []
        for level, title in toc_spec:
            pass
        # map toc_spec entries onto content pages: an entry belongs to the page
        # it appeared on, which we recovered by re-walking the stripped pages
        # (placeholder pages carry no directives).
        page_of_entry = []
        for i, block in enumerate(source):
            for kind, payload in DIRECTIVE_RE.findall(block):
                page_of_entry.append(i)
        # position of each entry in the *content* page order
        content_order = {}
        n = 0
        for i, block in enumerate(stripped):
            if PLACEHOLDER_RE.search(block):
                continue
            content_order[i] = n
            n += 1

        toc_entries, fig_entries, tab_entries = [], [], []
        cursor_t = cursor_f = cursor_b = 0
        for i, block in enumerate(source):
            for kind, payload in DIRECTIVE_RE.findall(block):
                level, _, title = payload.partition(":")
                idx = content_order[i]
                label = content_labels[idx] if idx < len(content_labels) else "?"
                if kind == "TOC":
                    toc_entries.append((level.strip(), title.strip(), label))
                elif kind == "FIG":
                    fig_entries.append(("Figure %s: %s" % (level.strip(), title.strip()), label))
                else:
                    tab_entries.append(("Table %s: %s" % (level.strip(), title.strip()), label))

        toc_rows = [
            ('<div class="toc-entry%s"><span class="toc-title">%s</span>'
             '<span class="toc-dots"></span><span class="toc-page">%s</span></div>'
             % ({"chapter": " chapter", "sub": " sub", "subsub": " subsub"}.get(level.strip(), ""),
                esc(title), label))
            for level, title, label in toc_entries
        ]
        fig_rows = [
            '<div class="toc-entry"><span class="toc-title">%s</span>'
            '<span class="toc-dots"></span><span class="toc-page">%s</span></div>' % (esc(t), p)
            for t, p in fig_entries
        ]
        tab_rows = [
            '<div class="toc-entry"><span class="toc-title">%s</span>'
            '<span class="toc-dots"></span><span class="toc-page">%s</span></div>' % (esc(t), p)
            for t, p in tab_entries
        ]

        new_expansion = {
            "TOC_PAGES": max(1, (len(toc_rows) + TOC_PER_PAGE - 1) // TOC_PER_PAGE),
            "LOF_PAGES": max(1, (len(fig_rows) + LIST_PER_PAGE - 1) // LIST_PER_PAGE),
            "LOT_PAGES": max(1, (len(tab_rows) + LIST_PER_PAGE - 1) // LIST_PER_PAGE),
        }
        if new_expansion == expansion:
            break
        expansion = new_expansion

    # ---- emit --------------------------------------------------------------
    toc_pages = build_pages('<h1>TABLE OF CONTENTS</h1><br>', toc_rows, TOC_PER_PAGE,
                            '<h1 style="visibility:hidden;">TABLE OF CONTENTS</h1>')
    lof_pages = build_pages('<h1>LIST OF FIGURES</h1><br><br>', fig_rows, LIST_PER_PAGE,
                            '<h1 style="visibility:hidden;">LIST OF FIGURES</h1>')
    lot_pages = build_pages('<h1>LIST OF TABLES</h1><br><br>', tab_rows, LIST_PER_PAGE,
                            '<h1 style="visibility:hidden;">LIST OF TABLES</h1>')

    generated = {"TOC_PAGES": toc_pages, "LOF_PAGES": lof_pages, "LOT_PAGES": lot_pages}

    final_blocks = []
    for i, block in enumerate(stripped):
        m = PLACEHOLDER_RE.search(block)
        if m:
            for head, body in generated[m.group(1)]:
                final_blocks.append(
                    '<div class="page roman-page">\n%s\n%s\n<div class="page-number">{{PN}}</div>\n</div>'
                    % (head, body)
                )
        else:
            final_blocks.append(block)

    # final numbering pass over the real, final sequence
    roman_n = arabic_n = 0
    numbered = []
    for block in final_blocks:
        if is_roman(block):
            if "{{PN}}" in block:
                roman_n += 1
                label = to_roman(roman_n)
            else:
                label = ""
        else:
            arabic_n += 1
            label = str(arabic_n)
        numbered.append((label, block))

    with open(os.path.join(HERE, "style.css"), encoding="utf-8") as fh:
        css = fh.read()
    with open(os.path.join(HERE, "head.html"), encoding="utf-8") as fh:
        head = fh.read()

    chunks = []
    for label, block in numbered:
        block = block.replace("{{PN}}", label)
        block = TOKEN_RE.sub("", block)
        chunks.append(block)

    doc = "%s\n<style>\n%s\n</style>\n</head>\n<body>\n%s\n</body>\n</html>\n" % (
        head, css, "\n\n".join(chunks))

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(doc)

    print("source pages     : %d" % len(source))
    print("roman pages      : %d" % roman_n)
    print("arabic pages     : %d" % arabic_n)
    print("TOTAL PAGES      : %d" % (roman_n + arabic_n))
    print("toc entries      : %d" % len(toc_entries))
    print("figures          : %d" % len(fig_entries))
    print("tables           : %d" % len(tab_entries))
    if overflow_report:
        print("\nATOMIC BLOCKS LARGER THAN A PAGE (needs manual fix): %d" % len(overflow_report))
        for snippet, h in overflow_report:
            print("   %5.1f mm  %s..." % (h, snippet))
    print("written          : %s (%.1f KB)" % (OUT, os.path.getsize(OUT) / 1024.0))


if __name__ == "__main__":
    main()
