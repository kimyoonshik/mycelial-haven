"""Build the MYCOGEN logo CI set (outlined SVG, vector PDF, transparent PNG) from the website's logo.

Geometry is taken 1:1 from the site header: symbol = MARK_SVG (32-unit box, stroke 1.6, round caps,
center dot r 3.4); wordmark = "MYCOGEN" in Jost SemiBold 600, 1.32rem (21.12px), tracking 0.26em,
10px after the 32px symbol, cap height centred on the symbol centre.
"""
import io, os, re, sys, json
import skia, uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

FONT = sys.argv[1]
OUT = sys.argv[2]

# --- symbol (same paths as MARK_SVG in src/render.mjs) ---------------------------------------
STROKES = [
    "M16 16 C 12 12, 8 11, 4 6", "M8 11 C 7 8, 8 6, 7 3", "M16 16 C 20 11, 24 10, 28 7",
    "M23 10 C 25 7, 25 5, 27 3", "M16 16 C 15 21, 12 24, 6 27", "M11 23 C 8 22, 5 22, 3 20",
    "M16 16 C 19 21, 23 23, 28 25",
]

def parse_simple(d):
    nums = [float(x) for x in re.findall(r"-?\d*\.?\d+", d)]
    p = skia.Path(); p.moveTo(nums[0], nums[1]); p.cubicTo(*nums[2:8]); return p

def symbol_path():
    paint = skia.Paint(Style=skia.Paint.kStroke_Style, StrokeWidth=1.6,
                       StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join, AntiAlias=True)
    acc = skia.Path(); acc.addCircle(16, 16, 3.4)
    for d in STROKES:
        out = skia.Path()
        paint.getFillPath(parse_simple(d), out, None, 1000)   # high res scale -> smooth outlines
        acc = skia.Op(acc, out, skia.PathOp.kUnion_PathOp)
    return acc

# --- wordmark -------------------------------------------------------------------------------
class SkPen(BasePen):
    def __init__(self, gs, path, s, dx, dy):
        super().__init__(gs); self.p, self.s, self.dx, self.dy = path, s, dx, dy
    def t(self, pt): return (self.dx + pt[0] * self.s, self.dy - pt[1] * self.s)
    def _moveTo(self, a): self.p.moveTo(*self.t(a))
    def _lineTo(self, a): self.p.lineTo(*self.t(a))
    def _curveToOne(self, a, b, c): self.p.cubicTo(*self.t(a), *self.t(b), *self.t(c))
    def _qCurveToOne(self, a, b): self.p.quadTo(*self.t(a), *self.t(b))
    def _closePath(self): self.p.close()

def wordmark_path(text="MYCOGEN", fs=21.12, track=0.26, x0=42.0, cap_center=16.0):
    tt = TTFont(FONT); tt.flavor = None
    buf = io.BytesIO(); tt.save(buf); data = buf.getvalue()
    upm = tt["head"].unitsPerEm; cap = tt["OS/2"].sCapHeight
    s = fs / upm
    face = hb.Face(data); font = hb.Font(face)
    b = hb.Buffer(); b.add_str(text); b.guess_segment_properties()
    hb.shape(font, b, {"kern": True, "liga": False})
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    baseline = cap_center + cap * s / 2
    path, x = skia.Path(), x0
    for info, pos in zip(b.glyph_infos, b.glyph_positions):
        g = order[info.codepoint]
        gs[g].draw(SkPen(gs, path, s, x + pos.x_offset * s, baseline - pos.y_offset * s))
        x += pos.x_advance * s + track * fs
    return skia.Simplify(path), {"fontSize": fs, "capHeight": cap * s, "baseline": baseline}

# --- helpers ----------------------------------------------------------------------------------
def moved(p, sx, dx=0, dy=0):
    q = skia.Path(p); q.transform(skia.Matrix.MakeAll(sx, 0, dx, 0, sx, dy, 0, 0, 1)); return q

def bounds(paths):
    r = None
    for p in paths:
        b = p.computeTightBounds()
        r = b if r is None else skia.Rect.MakeLTRB(min(r.left(), b.left()), min(r.top(), b.top()),
                                                   max(r.right(), b.right()), max(r.bottom(), b.bottom()))
    return r

def svg_d(p, ox, oy, k):
    out, it = [], skia.Path.Iter(p, False)
    f = lambda v: f"{v:.3f}".rstrip("0").rstrip(".")
    P = lambda pt: f"{f((pt.x() - ox) * k)} {f((pt.y() - oy) * k)}"
    while True:
        verb, pts = it.next()
        if verb == skia.Path.Verb.kDone_Verb: break
        if verb == skia.Path.Verb.kMove_Verb: out.append("M" + P(pts[0]))
        elif verb == skia.Path.Verb.kLine_Verb: out.append("L" + P(pts[1]))
        elif verb == skia.Path.Verb.kQuad_Verb: out.append("Q" + P(pts[1]) + " " + P(pts[2]))
        elif verb == skia.Path.Verb.kCubic_Verb: out.append("C" + " ".join(P(q) for q in pts[1:4]))
        elif verb == skia.Path.Verb.kConic_Verb:
            qs = skia.Path.ConvertConicToQuads(pts[0], pts[1], pts[2], it.conicWeight(), 3)
            for i in range(1, len(qs), 2): out.append("Q" + P(qs[i]) + " " + P(qs[i + 1]))
        elif verb == skia.Path.Verb.kClose_Verb: out.append("Z")
    return "".join(out)

COLORS = {  # (symbol, wordmark)
    "color":   ("#E2A93B", "#23201B"),   # 밝은 배경용
    "reverse": ("#E2A93B", "#FBF8F2"),   # 어두운 배경용 (웹사이트 첫 화면과 동일)
    "black":   ("#000000", "#000000"),
    "white":   ("#FFFFFF", "#FFFFFF"),
}
PNG_W = {"horizontal": 4000, "vertical": 3000, "symbol": 2048, "wordmark": 4000}
PDF_MM = {"horizontal": 120, "vertical": 80, "symbol": 40, "wordmark": 120}

def hexcol(h): return skia.Color(int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))

def build():
    sym = symbol_path()
    word, met = wordmark_path()
    cap = met["capHeight"]
    sb, wb = sym.computeTightBounds(), word.computeTightBounds()
    # vertical lockup: symbol x2, centred over the wordmark, one cap height of air between them
    vs = moved(sym, 2.0)
    vsb = vs.computeTightBounds()
    vword = moved(word, 1.0, -wb.left() - wb.width() / 2, 0)
    vwb = vword.computeTightBounds()
    vs = moved(vs, 1.0, -(vsb.left() + vsb.width() / 2), (vwb.top() - cap) - vsb.bottom())
    layouts = {
        "horizontal": [("symbol", sym), ("wordmark", word)],
        "vertical": [("symbol", vs), ("wordmark", vword)],
        "symbol": [("symbol", sym)],
        "wordmark": [("wordmark", word)],
    }
    os.makedirs(f"{OUT}/svg", exist_ok=True); os.makedirs(f"{OUT}/pdf", exist_ok=True); os.makedirs(f"{OUT}/png", exist_ok=True)
    info = {"capHeight": cap, "layouts": {}}
    for name, parts in layouts.items():
        r = bounds([p for _, p in parts])
        L, T, W, H = r.left(), r.top(), r.width(), r.height()
        if name == "symbol":  # square canvas
            side = max(W, H); L -= (side - W) / 2; T -= (side - H) / 2; W = H = side
        k = 100.0 / H if name != "wordmark" else 100.0 / cap * 0.7   # tidy viewBox numbers
        vbw, vbh = W * k, H * k
        info["layouts"][name] = {"w": W, "h": H, "ratio": W / H}
        for cname, (csym, cword) in COLORS.items():
            base = f"mycogen_{name}_{cname}"
            title = f"MYCOGEN logo — {name}, {cname}"
            body = "".join(f'<path fill="{csym if part == "symbol" else cword}" d="{svg_d(p, L, T, k)}"/>' for part, p in parts)
            svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vbw:.3f} {vbh:.3f}" '
                   f'width="{vbw * 4:.0f}" height="{vbh * 4:.0f}"><title>{title}</title>{body}</svg>\n')
            open(f"{OUT}/svg/{base}.svg", "w").write(svg)
            # PNG (transparent)
            pw = PNG_W[name]; scale = pw / W; ph = round(H * scale)
            surf = skia.Surface(pw, ph)
            with surf as c:
                c.clear(skia.ColorTRANSPARENT); c.scale(scale, scale); c.translate(-L, -T)
                for part, p in parts:
                    c.drawPath(p, skia.Paint(AntiAlias=True, Color=hexcol(csym if part == "symbol" else cword)))
            surf.makeImageSnapshot().save(f"{OUT}/png/{base}.png", skia.kPNG)
            # PDF (vector)
            wpt = PDF_MM[name] / 25.4 * 72; s2 = wpt / W; hpt = H * s2
            stream = skia.FILEWStream(f"{OUT}/pdf/{base}.pdf")
            doc = skia.PDF.MakeDocument(stream, skia.PDF.Metadata({"Title": title, "Creator": "Mycogen CI", "Producer": "Mycogen CI"}))
            c = doc.beginPage(wpt, hpt); c.scale(s2, s2); c.translate(-L, -T)
            for part, p in parts:
                c.drawPath(p, skia.Paint(AntiAlias=True, Color=hexcol(csym if part == "symbol" else cword)))
            doc.endPage(); doc.close(); stream.flush(); del stream
    # SNS profile image: gold symbol on ink, 1080 square, symbol ~56% of the side
    side = 1080; r = sym.computeTightBounds(); sc = side * 0.56 / max(r.width(), r.height())
    surf = skia.Surface(side, side)
    with surf as c:
        c.clear(hexcol("#23201B")); c.translate(side / 2, side / 2); c.scale(sc, sc)
        c.translate(-(r.left() + r.width() / 2), -(r.top() + r.height() / 2))
        c.drawPath(sym, skia.Paint(AntiAlias=True, Color=hexcol("#E2A93B")))
    surf.makeImageSnapshot().save(f"{OUT}/png/mycogen_sns-profile_1080.png", skia.kPNG)
    json.dump(info, open(f"{OUT}/../layout-info.json", "w"), indent=1)
    print(json.dumps(info, indent=1))

build()
