#!/usr/bin/env python3
"""
Automatic page flow.

Report pages are authored generously: a part file contains the content of a
section, marked into page blocks at logical boundaries. This module re-flows
each page so that no page's estimated height exceeds the printable area,
splitting at top-level block boundaries exactly as a word processor would.

Rules
-----
* A page is decomposed into top-level blocks (direct children of the page div,
  plus text between them).
* Blocks are packed greedily until the next block would overflow.
* A heading is never left as the last block on a page (widow control): if the
  block that would follow a heading does not fit, the heading moves too.
* <table>, <pre> and .screenshot blocks are atomic; if one alone exceeds the
  page it is emitted on its own page and reported, so it can be fixed by hand.
* Directives (<!--TOC:...-->, <!--FIG:...-->, <!--TAB:...-->) travel with the
  block that follows them.
"""

import math
import re

import fitcheck as fc

VOID_TAGS = {"br", "hr", "img", "meta", "link", "input", "col", "source", "wbr"}
BLOCK_TAGS = {
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "table",
    "pre", "div", "hr", "blockquote", "figure",
}

TAG_RE = re.compile(r"<(/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(/?)>", re.S)
DIRECTIVE_RE = re.compile(r"<!--\s*(?:TOC|FIG|TAB)\s*:[^>]*?-->")


def peel_directives(html):
    """Separate leading directive comments from the element they annotate."""
    s = html.lstrip()
    lead_parts = []
    while True:
        m = DIRECTIVE_RE.match(s.lstrip())
        if not m:
            break
        lead_parts.append(m.group(0))
        s = s.lstrip()[m.end():]
    return (("\n".join(lead_parts) + "\n") if lead_parts else ""), s


def split_table(html, budget):
    """
    Split a <table> too tall for one page into two tables at a row boundary,
    repeating the header row on both. Returns a list of html strings.
    """
    m = re.match(r"(\s*)(<table[^>]*>)(.*)(</table>)(\s*)$", html, re.S | re.I)
    if not m:
        return [html]
    pre, open_tag, body, close_tag, post = m.groups()

    rows = re.findall(r"<tr[^>]*>.*?</tr>", body, flags=re.S | re.I)
    head = ""
    rest = rows
    if rows and re.match(r"<tr[^>]*>\s*<th", rows[0], re.I):
        head, rest = rows[0], rows[1:]

    chunks, cur = [], []
    for row in rest:
        trial = head + "".join(cur) + row
        if cur and block_height(pre + open_tag + trial + close_tag + post) > budget:
            chunks.append(cur)
            cur = [row]
        else:
            cur.append(row)
    if cur:
        chunks.append(cur)
    if not chunks:
        return [html]
    return [pre + open_tag + head + "".join(c) + close_tag + post for c in chunks]


def split_list(html, budget):
    """
    Split an over-tall <ol>/<ul> into several lists at <li> boundaries.
    Each piece keeps the original element tag and attributes, so numbered
    lists restart their enumeration — acceptable for a reference list that
    is read as a sequence of entries rather than by number.
    """
    m = re.match(r"(\s*)(<(ol|ul)([^>]*)>)(.*)(</\3>)(\s*)$", html, re.S | re.I)
    if not m:
        return [html]
    lead, open_tag, _tag, _attrs, body, close_tag, trail = m.groups()

    items = re.findall(r"<li[^>]*>.*?</li>", body, flags=re.S | re.I)
    if len(items) < 2:
        return [html]

    chunks, cur = [], []
    for item in items:
        trial = "".join(cur) + item
        if cur and block_height(lead + open_tag + trial + close_tag + trail) > budget:
            chunks.append(cur)
            cur = [item]
        else:
            cur.append(item)
    if cur:
        chunks.append(cur)
    if len(chunks) < 2:
        return [html]
    return [lead + open_tag + "".join(c) + close_tag + trail for c in chunks]


def top_level_blocks(page_inner):
    """
    Split the inner HTML of a page div into top-level blocks.

    Returns a list of (kind, html) where kind is 'block' for an element,
    'text' for whitespace/text between elements, and 'directive' for a
    directive comment. Element html includes the directive comments that
    immediately precede it.
    """
    out = []
    depth = 0
    start = None
    pending_directives = []

    pos = 0
    for m in TAG_RE.finditer(page_inner):
        gap = page_inner[pos:m.start()]
        if gap.strip():
            if depth == 0:
                # text at top level
                if gap.strip():
                    out.append(("text", gap))
            # text inside an element is part of that element
        elif gap:
            if depth == 0:
                out.append(("text", gap))
        pos = m.end()

        closing, name, attrs, selfclose = m.group(1), m.group(2).lower(), m.group(3), m.group(4)
        if name in VOID_TAGS or selfclose:
            if depth == 0:
                out.append(("block", m.group(0)))
            continue

        if not closing:
            if depth == 0:
                start = m.start()
            depth += 1
        else:
            depth -= 1
            if depth == 0 and start is not None:
                block = page_inner[start:m.end()]
                out.append(("block", block))
                start = None
            elif depth < 0:
                depth = 0

    tail = page_inner[pos:]
    if tail.strip():
        out.append(("text", tail))

    # fold directive-only comments into the block that follows
    folded = []
    carry = ""
    for kind, html in out:
        if kind == "text":
            stripped = html.strip()
            if not stripped:
                continue
            if DIRECTIVE_RE.fullmatch(stripped):
                carry += "\n" + stripped
                continue
            # text containing only directives
            if DIRECTIVE_RE.sub("", stripped).strip() == "":
                carry += "\n" + stripped
                continue
            folded.append(("text", carry + "\n" + html if carry else html))
            carry = ""
        else:
            folded.append(("block", (carry + "\n" if carry else "") + html))
            carry = ""
    if carry:
        folded.append(("text", carry))
    return folded


def block_height(html):
    return fc.measure_page(html) * fc.SCALE


def is_heading(html):
    s = html.lstrip()
    s = DIRECTIVE_RE.sub("", s).lstrip()
    return bool(re.match(r"<h[1-6][\s>]", s, re.I))


def is_atomic(html):
    s = html.lstrip()
    s = DIRECTIVE_RE.sub("", s).lstrip()
    if re.match(r"<table[\s>]", s, re.I):
        return True
    if re.match(r"<pre[\s>]", s, re.I):
        return True
    if re.match(r"<ol[\s>]", s, re.I) or re.match(r"<ul[\s>]", s, re.I):
        return True
    if 'class="screenshot"' in s[:120]:
        return True
    if 'class="front-page' in s[:120]:
        return True
    return False


def reflow(page_html, page_class, page_number_html, budget=None, report=None):
    """
    Reflow one page into a list of page blocks that each fit the budget.
    """
    if budget is None:
        # The fit estimator over-counts on dense pages: the reference document
        # (real, known to be one page per div) measures up to 1.24 by this
        # method. A budget of 1.10 therefore leaves a genuine margin while
        # avoiding the half-empty pages that a 0.97 budget produced.
        budget = fc.COL_H * 1.10

    # recover the opening tag and inner content
    m = re.match(r'\s*(<div class="page[^"]*"[^>]*>)(.*)(</div>\s*)$', page_html, re.S)
    if not m:
        return [page_html]
    open_tag, inner, close_tag = m.group(1), m.group(2), m.group(3)

    # pull out the page-number div so it is not treated as content
    pn = re.search(r'<div class="page-number">[^<]*</div>', inner)
    if pn:
        inner = inner.replace(pn.group(0), "")

    blocks = top_level_blocks(inner)
    if not blocks:
        return [page_html]

    heights = []
    for kind, html in blocks:
        heights.append(block_height(html) if kind == "block" else 0.0)

    pages = []
    cur = []
    cur_h = 0.0

    i = 0
    n = len(blocks)
    while i < n:
        kind, html = blocks[i]
        h = heights[i]

        if is_atomic(html) and h > budget:
            lead, rest = peel_directives(html)
            chunked = False
            if re.match(r"\s*<(table|ol|ul)", rest, re.I):
                pieces = (split_table(rest, budget)
                          if re.match(r"\s*<table", rest, re.I)
                          else split_list(rest, budget))
                if len(pieces) > 1 and lead:
                    pieces[0] = lead + pieces[0]
                if len(pieces) > 1:
                    chunked = True
                    if cur:
                        pages.append(cur)
                        cur, cur_h = [], 0.0
                    # Emit every piece but the last as its own page, then let
                    # the following blocks flow onto the remainder of the last
                    # piece instead of starting a fresh page: the tail of a
                    # split table is usually short, and wasting that space
                    # would add a mostly-blank page per long table.
                    for piece in pieces[:-1]:
                        pages.append([("block", piece)])
                    last = pieces[-1]
                    cur = [("block", last)]
                    cur_h = block_height(last)
            if not chunked:
                if report is not None:
                    report.append((html[:90].replace("\n", " "), h))
                if cur:
                    pages.append(cur)
                    cur, cur_h = [], 0.0
                pages.append([(kind, html)])
            i += 1
            continue

        if cur_h + h > budget and cur:
            # widow control: do not end a page on a heading
            while cur and is_heading(cur[-1][1]) and len(cur) > 1:
                moved = cur.pop()
                pages.append(cur)
                cur = [moved]
                cur_h = block_height(moved[1])
                break
            else:
                pages.append(cur)
                cur, cur_h = [], 0.0

        cur.append((kind, html))
        cur_h += h
        i += 1

    if cur:
        pages.append(cur)

    out = []
    for chunk in pages:
        body = "\n".join(html for _, html in chunk if html.strip())
        if not body.strip():
            continue
        out.append("%s\n%s\n%s\n%s" % (open_tag, body, page_number_html, close_tag))
    return out
