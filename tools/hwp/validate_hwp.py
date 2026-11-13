"""Independent structural validator for HWP 5.0 files (does not use hwplib).

Checks the internal consistency rules whose violation makes Hancom Office
report a damaged file: record sizes vs. declared counts, control chars vs.
control records, ID references vs. DocInfo tables, and table/cell geometry.
Also returns the document text (paragraph order, tables flattened) for
content comparison.
"""
import struct
import sys
import zlib
import olefile

EXT = {1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23}
INL = {4, 5, 6, 7, 8, 9, 19, 20}


def records(data):
    i, out = 0, []
    while i < len(data):
        h = struct.unpack_from('<I', data, i)[0]
        i += 4
        tag, lvl, size = h & 0x3ff, (h >> 10) & 0x3ff, (h >> 20) & 0xfff
        if size == 0xfff:
            size = struct.unpack_from('<I', data, i)[0]
            i += 4
        out.append((tag, lvl, data[i:i + size]))
        i += size
    if i != len(data):
        raise ValueError('trailing bytes in stream')
    return out


class V:
    def __init__(self, path):
        self.errors = []
        f = olefile.OleFileIO(path)
        hdr = f.openstream('FileHeader').read()
        self.compressed = bool(struct.unpack_from('<I', hdr, 36)[0] & 1)
        self.ver = tuple(hdr[32:36][::-1])
        self.f = f
        self.docinfo()
        self.texts = []
        self.tables = []
        secs = sorted([s for s in f.listdir() if s[0] == 'BodyText'], key=lambda s: int(s[1][7:]))
        for s in secs:
            self.section(self.read(s))

    def read(self, s):
        d = self.f.openstream(s).read()
        return zlib.decompress(d, -15) if self.compressed else d

    def err(self, m):
        self.errors.append(m)

    def docinfo(self):
        recs = records(self.read('DocInfo'))
        cnt = {}
        for tag, lvl, _ in recs:
            cnt[tag] = cnt.get(tag, 0) + 1
        idm = [r for r in recs if r[0] == 17][0][2]
        ids = struct.unpack_from('<%di' % (len(idm) // 4), idm)
        self.n_font = ids[1:8]
        self.n_bf, self.n_cs, self.n_tab, self.n_num, self.n_bullet, self.n_ps, self.n_style = ids[8:15]
        checks = [('BIN_DATA', 18, ids[0]), ('FACE_NAME', 19, sum(ids[1:8])), ('BORDER_FILL', 20, self.n_bf),
                  ('CHAR_SHAPE', 21, self.n_cs), ('TAB_DEF', 22, self.n_tab), ('NUMBERING', 23, self.n_num),
                  ('BULLET', 24, self.n_bullet), ('PARA_SHAPE', 25, self.n_ps), ('STYLE', 26, self.n_style)]
        for name, tag, n in checks:
            if cnt.get(tag, 0) != n:
                self.err('IDMappings %s=%d but %d records' % (name, n, cnt.get(tag, 0)))
        for k, (tag, lvl, d) in enumerate([r for r in recs if r[0] == 21]):
            fids = struct.unpack_from('<7H', d, 0)
            for lang in range(7):
                if fids[lang] >= self.n_font[lang]:
                    self.err('char shape %d font id %d >= %d (lang %d)' % (k, fids[lang], self.n_font[lang], lang))
            bf = struct.unpack_from('<H', d, 70)[0]
            if bf > self.n_bf:
                self.err('char shape %d borderFill %d > %d' % (k, bf, self.n_bf))
        for k, (tag, lvl, d) in enumerate([r for r in recs if r[0] == 25]):
            tab = struct.unpack_from('<H', d, 28)[0]
            bf = struct.unpack_from('<H', d, 32)[0]
            if tab >= self.n_tab:
                self.err('para shape %d tabDef %d >= %d' % (k, tab, self.n_tab))
            if bf > self.n_bf:
                self.err('para shape %d borderFill %d > %d' % (k, bf, self.n_bf))
        for k, (tag, lvl, d) in enumerate([r for r in recs if r[0] == 26]):
            # name lengths are variable; para/char shape ids are the last 6 bytes before lang id
            n1 = struct.unpack_from('<H', d, 0)[0]
            o = 2 + n1 * 2
            n2 = struct.unpack_from('<H', d, o)[0]
            o += 2 + n2 * 2 + 2  # property + next style
            ps, cs = struct.unpack_from('<HH', d, o + 2)[0:2] if False else (struct.unpack_from('<H', d, o + 2)[0], struct.unpack_from('<H', d, o + 4)[0])
            if ps >= self.n_ps or cs >= self.n_cs:
                self.err('style %d refs ps=%d cs=%d' % (k, ps, cs))

    def section(self, data):
        recs = records(data)
        self.pos = 0
        self.recs = recs
        while self.pos < len(recs):
            self.paragraph(0, self.texts)

    def paragraph(self, level, sink):
        tag, lvl, d = self.recs[self.pos]
        if tag != 66 or lvl != level:
            raise ValueError('expected PARA_HEADER at level %d, got tag %d level %d (rec %d)' % (level, tag, lvl, self.pos))
        nchars = struct.unpack_from('<I', d, 0)[0] & 0x7fffffff
        last = bool(struct.unpack_from('<I', d, 0)[0] & 0x80000000)
        mask, ps, style, div, ncs, nrt, nls = struct.unpack_from('<IHBBHHH', d, 4)
        if ps >= self.n_ps:
            self.err('paragraph para shape %d >= %d' % (ps, self.n_ps))
        if style >= self.n_style:
            self.err('paragraph style %d >= %d' % (style, self.n_style))
        self.pos += 1
        text, codes = '', []
        children = []
        while self.pos < len(self.recs) and self.recs[self.pos][1] > level:
            children.append(self.pos)
            t2, l2, d2 = self.recs[self.pos]
            if l2 == level + 1 and t2 == 67:
                if len(d2) != nchars * 2:
                    self.err('PARA_TEXT %d bytes, header says %d chars' % (len(d2), nchars))
                j = 0
                while j < len(d2):
                    c = struct.unpack_from('<H', d2, j)[0]
                    codes.append(c)
                    if c in EXT or c in INL:
                        j += 16
                    else:
                        if c >= 32:
                            text += chr(c)
                        j += 2
                if codes and codes[-1] != 13:
                    self.err('paragraph text does not end with 0x0d')
            elif l2 == level + 1 and t2 == 68:
                if len(d2) != ncs * 8:
                    self.err('PARA_CHAR_SHAPE size %d vs count %d' % (len(d2), ncs))
                for k in range(len(d2) // 8):
                    p, sid = struct.unpack_from('<II', d2, k * 8)
                    if sid >= self.n_cs:
                        self.err('char shape id %d >= %d' % (sid, self.n_cs))
                    if k == 0 and p != 0:
                        self.err('first char shape position %d != 0' % p)
            elif l2 == level + 1 and t2 == 69:
                if len(d2) != nls * 36:
                    self.err('PARA_LINE_SEG size %d vs count %d' % (len(d2), nls))
            elif l2 == level + 1 and t2 == 71:
                ctrl = d2[:4][::-1].decode('latin1')
                self.pos += 1
                self.control(ctrl, d2, level + 1, sink)
                continue
            self.pos += 1
        if not any(self.recs[c][0] == 67 for c in children if self.recs[c][1] == level + 1):
            if nchars > 1:
                self.err('no PARA_TEXT but %d chars' % nchars)
            codes = [13]
        ext = [c for c in codes if c in EXT]
        n_ctrl = sum(1 for c in children if self.recs[c][0] == 71 and self.recs[c][1] == level + 1)
        if len(ext) != n_ctrl:
            self.err('%d extended control chars vs %d controls' % (len(ext), n_ctrl))
        expect_mask = 0
        for c in codes:
            if c < 32 and c != 13:
                expect_mask |= (1 << c)
        if mask != expect_mask:
            self.err('control mask %x expected %x' % (mask, expect_mask))
        sink.append(text)
        return last

    def control(self, ctrl, d, level, sink):
        if ctrl == 'tbl ':
            tag, lvl, rec = self.recs[self.pos]
            while tag != 77:  # skip caption etc.
                self.pos += 1
                tag, lvl, rec = self.recs[self.pos]
            prop, rows, cols = struct.unpack_from('<IHH', rec, 0)
            ccount = struct.unpack_from('<%dH' % rows, rec, 18)
            bf = struct.unpack_from('<H', rec, 18 + 2 * rows)[0]
            if bf > self.n_bf:
                self.err('table borderFill %d > %d' % (bf, self.n_bf))
            self.pos += 1
            grid = [[None] * cols for _ in range(rows)]
            cells = []
            for k in range(sum(ccount)):
                tag, lvl, lh = self.recs[self.pos]
                if tag != 72 or lvl != level + 1:
                    raise ValueError('expected cell LIST_HEADER, got %d at level %d' % (tag, lvl))
                npara = struct.unpack_from('<h', lh, 0)[0]
                col, row, cs, rs = struct.unpack_from('<HHHH', lh, 8)
                cbf = struct.unpack_from('<H', lh, 32)[0]
                if cbf == 0 or cbf > self.n_bf:
                    self.err('cell borderFill %d out of range' % cbf)
                for r in range(row, row + rs):
                    for c in range(col, col + cs):
                        if r >= rows or c >= cols:
                            self.err('cell (%d,%d) span outside %dx%d' % (row, col, rows, cols))
                        elif grid[r][c] is not None:
                            self.err('cell overlap at %d,%d' % (r, c))
                        else:
                            grid[r][c] = (row, col)
                self.pos += 1
                ptexts = []
                for n in range(npara):
                    last = self.paragraph(level + 1, ptexts)
                    if last != (n == npara - 1):
                        self.err('lastInList flag wrong in cell %d,%d' % (row, col))
                cells.append(((row, col, cs, rs), ptexts))
            if any(v is None for r in grid for v in r):
                self.err('table grid has gaps')
            if [sum(1 for c in cells if c[0][0] == r) for r in range(rows)] != list(ccount):
                self.err('cellCountOfRow mismatch')
            self.tables.append({'rows': rows, 'cols': cols, 'cells': cells})
            for _, ptexts in cells:
                sink.extend(ptexts)
        else:
            # skip the control's own child records
            while self.pos < len(self.recs) and self.recs[self.pos][1] > level:
                if self.recs[self.pos][0] == 66 and self.recs[self.pos][1] == level + 1:
                    sub = []
                    self.paragraph(level + 1, sub)
                    continue
                self.pos += 1


if __name__ == '__main__':
    for p in sys.argv[1:]:
        v = V(p)
        print('%s: version %s, paragraphs(text lines) %d, tables %d, errors %d' % (p, '.'.join(map(str, v.ver)), len(v.texts), len(v.tables), len(v.errors)))
        for e in v.errors[:20]:
            print('   ERROR', e)
