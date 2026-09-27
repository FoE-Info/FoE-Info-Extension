#!/usr/bin/env python3
"""Fail unless every icon name still resolves to a real glyph in a font.

Material Symbols maps a name like `content_copy` through a required ligature
(rlig), not through cmap, so the only way to prove a subset kept an icon is to
ask the font whether it still shapes that name. Two traps this walks around:

- Ligature components are glyph NAMES, so "_" arrives as "underscore" and a
  naive join compares "contentunderscorecopy".
- The first character is the lookup's START glyph, not a component, so
  reconstructing without it drops a letter: file_copy reads as "ile_copy".

Exit 0 only if every name resolves to a glyph with outlines.
"""
import sys
from fontTools.ttLib import TTFont

NAMES = {"underscore": "_", "space": " "}


def char(glyph_name):
    return NAMES.get(glyph_name, glyph_name)


def resolve(font, text):
    """Return the glyph a shaped `text` lands on, or None."""
    gsub = font["GSUB"].table
    for lookup in gsub.LookupList.Lookup:
        for sub in lookup.SubTable:
            # Extension (type 7) wraps the real subtable inline.
            sub = getattr(sub, "ExtSubTable", sub)
            for start, entries in (getattr(sub, "ligatures", None) or {}).items():
                for lig in entries:
                    if char(start) + "".join(char(c) for c in lig.Component) == text:
                        return lig.LigGlyph
    return None


def main():
    if len(sys.argv) < 3:
        print("usage: verify-icon-font.py FONT NAME...", file=sys.stderr)
        return 2
    path, wanted = sys.argv[1], sys.argv[2:]
    font = TTFont(path, fontNumber=0, lazy=True)
    glyf = font["glyf"]
    order = set(font.getGlyphOrder())

    failed = []
    for name in wanted:
        glyph = resolve(font, name)
        if glyph is None:
            failed.append(f"{name}: no ligature (would render as the literal text)")
            continue
        if glyph not in order:
            failed.append(f"{name}: ligature points at missing glyph {glyph!r}")
            continue
        g = glyf[glyph]
        if not getattr(g, "numberOfContours", 0):
            failed.append(f"{name}: glyph {glyph!r} has no outlines")
    for line in failed:
        print(f"  FAIL {line}", file=sys.stderr)
    if failed:
        print(f"{len(failed)} of {len(wanted)} icons did not survive subsetting", file=sys.stderr)
        return 1
    print(f"  ok   {len(wanted)} icon(s) resolve with outlines: {', '.join(wanted)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
