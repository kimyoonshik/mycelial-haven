"""docx -> intermediate JSON for the hwplib builder.

Resolves effective formatting (docDefaults -> paragraph style chain -> direct)
for the subset of WordprocessingML these documents use: paragraphs with runs
(bold, size, color, font), bullets via numbering.xml, spacing/alignment,
page breaks, and tables (grid, gridSpan, vMerge, borders, shading, margins,
vertical alignment, header rows, row heights). Units are kept in twips
(1/20 pt) and half-points; the Java side converts to HWPUNIT.
"""
import json
import sys
import zipfile
from xml.etree import ElementTree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}


def q(tag):
    return '{%s}%s' % (W, tag)


def val(el, attr='val'):
    return None if el is None else el.get(q(attr))


def on(el):
    """w:b / w:keepNext style toggles: present and not val=false/0."""
    if el is None:
        return None
    v = val(el)
    return v not in ('0', 'false', 'off')


def rpr_props(rpr):
    if rpr is None:
        return {}
    d = {}
    b = on(rpr.find('w:b', NS))
    if b is not None:
        d['b'] = b
    sz = val(rpr.find('w:sz', NS))
    if sz:
        d['sz'] = int(sz)
    color = val(rpr.find('w:color', NS))
    if color:
        d['color'] = None if color == 'auto' else color.upper()
    fonts = rpr.find('w:rFonts', NS)
    if fonts is not None:
        f = fonts.get(q('eastAsia')) or fonts.get(q('ascii'))
        if f:
            d['font'] = f
    return d


def ppr_props(ppr):
    if ppr is None:
        return {}
    d = {}
    sp = ppr.find('w:spacing', NS)
    if sp is not None:
        for k in ('before', 'after', 'line'):
            if sp.get(q(k)) is not None:
                d[k] = int(sp.get(q(k)))
        if sp.get(q('lineRule')):
            d['lineRule'] = sp.get(q('lineRule'))
    jc = val(ppr.find('w:jc', NS))
    if jc:
        d['align'] = jc
    ind = ppr.find('w:ind', NS)
    if ind is not None:
        for k in ('left', 'hanging', 'firstLine'):
            if ind.get(q(k)) is not None:
                d['ind_' + k] = int(ind.get(q(k)))
    for k in ('keepNext', 'pageBreakBefore'):
        t = on(ppr.find('w:' + k, NS))
        if t is not None:
            d[k] = t
    return d


class Doc:
    def __init__(self, path):
        z = zipfile.ZipFile(path)
        self.doc = ET.fromstring(z.read('word/document.xml'))
        self.styles = ET.fromstring(z.read('word/styles.xml'))
        names = z.namelist()
        self.numbering = ET.fromstring(z.read('word/numbering.xml')) if 'word/numbering.xml' in names else None
        self.footer = None
        for n in names:
            if n.startswith('word/footer') and n.endswith('.xml'):
                self.footer = ET.fromstring(z.read(n))
        self._style_cache = {}
        dd = self.styles.find('w:docDefaults', NS)
        self.def_r = rpr_props(dd.find('w:rPrDefault/w:rPr', NS)) if dd is not None else {}
        self.def_p = ppr_props(dd.find('w:pPrDefault/w:pPr', NS)) if dd is not None else {}
        self.nums = self._load_numbering()

    def _load_numbering(self):
        res = {}
        if self.numbering is None:
            return res
        absd = {}
        for a in self.numbering.findall('w:abstractNum', NS):
            lv = {}
            for l in a.findall('w:lvl', NS):
                ind = l.find('w:pPr/w:ind', NS)
                lv[l.get(q('ilvl'))] = {
                    'fmt': val(l.find('w:numFmt', NS)),
                    'text': val(l.find('w:lvlText', NS)) or '',
                    'left': int(ind.get(q('left'), 0)) if ind is not None else 0,
                    'hanging': int(ind.get(q('hanging'), 0)) if ind is not None else 0,
                }
            absd[a.get(q('abstractNumId'))] = lv
        for n in self.numbering.findall('w:num', NS):
            res[n.get(q('numId'))] = absd.get(val(n.find('w:abstractNumId', NS)), {})
        return res

    def style(self, sid):
        """(pPr dict, rPr dict) for a paragraph style, following basedOn."""
        if sid in self._style_cache:
            return self._style_cache[sid]
        p, r = {}, {}
        st = None
        for s in self.styles.findall('w:style', NS):
            if s.get(q('styleId')) == sid:
                st = s
                break
        if st is not None:
            base = val(st.find('w:basedOn', NS))
            if base:
                bp, br = self.style(base)
                p.update(bp)
                r.update(br)
            p.update(ppr_props(st.find('w:pPr', NS)))
            r.update(rpr_props(st.find('w:rPr', NS)))
        self._style_cache[sid] = (p, r)
        return p, r

    def para(self, pel):
        ppr = pel.find('w:pPr', NS)
        sid = val(ppr.find('w:pStyle', NS)) if ppr is not None else None
        sp, sr = self.style(sid or 'Normal')
        pp = dict(self.def_p)
        pp.update(sp)
        pp.update(ppr_props(ppr))
        base_r = dict(self.def_r)
        base_r.update(sr)

        runs = []
        bullet = None
        numpr = ppr.find('w:numPr', NS) if ppr is not None else None
        if numpr is not None:
            lvl = self.nums.get(val(numpr.find('w:numId', NS)), {}).get(val(numpr.find('w:ilvl', NS)) or '0')
            if lvl:
                if lvl['fmt'] != 'bullet':
                    sys.exit('numbered (non-bullet) list not supported: %r' % lvl)
                bullet = lvl
                pp.setdefault('ind_left', lvl['left'])
                pp.setdefault('ind_hanging', lvl['hanging'])

        for child in pel:
            if child.tag == q('r'):
                self._run(child, base_r, runs)
            elif child.tag in (q('hyperlink'), q('ins'), q('smartTag')):
                for r in child.findall('w:r', NS):
                    self._run(r, base_r, runs)
            elif child.tag in (q('pPr'), q('bookmarkStart'), q('bookmarkEnd'), q('proofErr')):
                pass
            else:
                sys.exit('unsupported paragraph child: ' + child.tag)

        mark = dict(base_r)
        if ppr is not None:
            mark.update(rpr_props(ppr.find('w:rPr', NS)))
        if bullet is not None:
            first = dict(runs[0]) if runs else dict(mark)
            first.update({'t': bullet['text'] + ' ', 'b': False})
            runs.insert(0, first)
        return {'type': 'p', 'pp': pp, 'runs': runs, 'mark': mark, 'bullet': bullet is not None}

    def _run(self, r, base_r, runs):
        props = dict(base_r)
        props.update(rpr_props(r.find('w:rPr', NS)))
        text = []
        for c in r:
            if c.tag == q('t'):
                text.append(c.text or '')
            elif c.tag == q('tab'):
                text.append('\t')
            elif c.tag in (q('br'), q('cr')):
                if c.get(q('type')) == 'page':
                    sys.exit('page break inside run not supported')
                text.append('\n')
            elif c.tag in (q('rPr'), q('lastRenderedPageBreak'), q('fldChar'), q('instrText')):
                pass
            else:
                sys.exit('unsupported run child: ' + c.tag)
        if text:
            props['t'] = ''.join(text)
            runs.append(props)

    def table(self, tbl):
        tblpr = tbl.find('w:tblPr', NS)
        grid = [int(g.get(q('w'))) for g in tbl.findall('w:tblGrid/w:gridCol', NS)]
        tb = {}
        tbb = tblpr.find('w:tblBorders', NS) if tblpr is not None else None
        if tbb is not None:
            for side in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
                e = tbb.find('w:' + side, NS)
                if e is not None:
                    tb[side] = border(e)
        dmar = {}
        if tblpr is not None and tblpr.find('w:tblCellMar', NS) is not None:
            for side in ('top', 'left', 'bottom', 'right'):
                e = tblpr.find('w:tblCellMar/w:' + side, NS)
                if e is not None:
                    dmar[side] = int(e.get(q('w')))
        rows_el = tbl.findall('w:tr', NS)
        rows = []
        vm_open = {}  # grid col -> cell dict that started a vertical merge
        for ri, tr in enumerate(rows_el):
            trpr = tr.find('w:trPr', NS)
            row = {'header': trpr is not None and on(trpr.find('w:tblHeader', NS)) is True,
                   'cantSplit': trpr is not None and on(trpr.find('w:cantSplit', NS)) is True,
                   'height': None, 'cells': []}
            if trpr is not None and trpr.find('w:trHeight', NS) is not None:
                h = trpr.find('w:trHeight', NS)
                row['height'] = [int(h.get(q('val'))), h.get(q('hRule')) or 'atLeast']
            col = 0
            for tc in tr.findall('w:tc', NS):
                tcpr = tc.find('w:tcPr', NS)
                span = int(val(tcpr.find('w:gridSpan', NS)) or 1) if tcpr is not None else 1
                vm = tcpr.find('w:vMerge', NS) if tcpr is not None else None
                if vm is not None and (val(vm) in (None, 'continue')):
                    vm_open[col]['rowspan'] += 1
                    col += span
                    continue
                cell = {'row': ri, 'col': col, 'colspan': span, 'rowspan': 1,
                        'width': sum(grid[col:col + span])}
                b = {}
                last_row = ri == len(rows_el) - 1
                b['top'] = tb.get('top' if ri == 0 else 'insideH')
                b['bottom'] = tb.get('bottom' if last_row else 'insideH')
                b['left'] = tb.get('left' if col == 0 else 'insideV')
                b['right'] = tb.get('right' if col + span == len(grid) else 'insideV')
                mar = dict(dmar)
                fill = None
                valign = 'top'
                if tcpr is not None:
                    tcb = tcpr.find('w:tcBorders', NS)
                    if tcb is not None:
                        for side in ('top', 'left', 'bottom', 'right'):
                            e = tcb.find('w:' + side, NS)
                            if e is not None:
                                b[side] = border(e)
                    shd = tcpr.find('w:shd', NS)
                    if shd is not None and shd.get(q('fill')) not in (None, 'auto'):
                        fill = shd.get(q('fill')).upper()
                    m = tcpr.find('w:tcMar', NS)
                    if m is not None:
                        for side in ('top', 'left', 'bottom', 'right'):
                            e = m.find('w:' + side, NS)
                            if e is not None:
                                mar[side] = int(e.get(q('w')))
                    valign = val(tcpr.find('w:vAlign', NS)) or 'top'
                cell.update({'borders': b, 'fill': fill, 'mar': mar, 'valign': valign,
                             'blocks': self.blocks(tc)})
                if vm is not None and val(vm) == 'restart':
                    vm_open[col] = cell
                row['cells'].append(cell)
                col += span
            rows.append(row)
        return {'type': 'tbl', 'grid': grid, 'rows': rows}

    def blocks(self, container):
        out = []
        for el in container:
            if el.tag == q('p'):
                out.append(self.para(el))
            elif el.tag == q('tbl'):
                out.append(self.table(el))
            elif el.tag in (q('sectPr'), q('tcPr'), q('bookmarkStart'), q('bookmarkEnd')):
                pass
            else:
                sys.exit('unsupported block: ' + el.tag)
        return out

    def page(self):
        sp = self.doc.find('w:body/w:sectPr', NS)
        sz = sp.find('w:pgSz', NS)
        mar = sp.find('w:pgMar', NS)
        d = {k: int(sz.get(q(k))) for k in ('w', 'h')}
        d['orient'] = sz.get(q('orient')) or 'portrait'
        for k in ('top', 'bottom', 'left', 'right', 'header', 'footer'):
            d['m_' + k] = int(mar.get(q(k)))
        return d

    def footer_info(self):
        if self.footer is None:
            return None
        p = self.footer.find('w:p', NS)
        texts = [t.text or '' for t in p.iter(q('t'))]
        has_page = any((i.text or '').strip().upper().startswith('PAGE') for i in p.iter(q('instrText')))
        r = rpr_props(p.find('.//w:rPr', NS))
        return {'texts': texts, 'page': has_page, 'align': val(p.find('w:pPr/w:jc', NS)), 'rpr': r}


def border(e):
    v = e.get(q('val'))
    if v in (None, 'nil', 'none'):
        return None
    if v != 'single':
        sys.exit('unsupported border style: ' + v)
    color = e.get(q('color'))
    return {'sz': int(e.get(q('sz') ) or 4), 'color': None if color in (None, 'auto') else color.upper()}


def main(src, dst):
    d = Doc(src)
    out = {'page': d.page(), 'footer': d.footer_info(), 'blocks': d.blocks(d.doc.find('w:body', NS))}
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
