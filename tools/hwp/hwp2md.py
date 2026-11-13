"""HWP 5.0 -> Markdown (body text + tables with row/col addresses)."""
import sys, zlib, struct, olefile
PARA_TEXT, CTRL_HEADER, LIST_HEADER, TABLE = 67, 71, 72, 77
EXT = {1,2,3,11,12,14,15,16,17,18,21,22,23}; INL = {4,5,6,7,8,9,19,20}

def para_text(rec):
    t=[]; j=0
    while j < len(rec):
        c = struct.unpack_from('<H', rec, j)[0]
        if c in EXT or c in INL:
            if c == 9: t.append(' ')
            j += 16; continue
        if c in (10,13): t.append(' '); j += 2; continue
        if c >= 32: t.append(chr(c))
        j += 2
    return ''.join(t).strip()

def records(data):
    i = 0
    while i < len(data):
        h = struct.unpack_from('<I', data, i)[0]; i += 4
        tag, lvl, size = h & 0x3ff, (h >> 10) & 0x3ff, (h >> 20) & 0xfff
        if size == 0xfff: size = struct.unpack_from('<I', data, i)[0]; i += 4
        yield tag, lvl, data[i:i+size]; i += size

def table_md(t):
    rows, cols, cells = t['rows'], t['cols'], t['cells']
    grid = [['' for _ in range(cols)] for _ in range(rows)]
    for (r, c), txt in cells.items():
        if r < rows and c < cols: grid[r][c] = ' '.join(txt).replace('|', '/')
    out = ['| ' + ' | '.join(grid[0]) + ' |', '|' + '---|' * cols]
    out += ['| ' + ' | '.join(row) + ' |' for row in grid[1:]]
    return '\n'.join(out)

def convert(path):
    f = olefile.OleFileIO(path)
    hdr = f.openstream('FileHeader').read()
    flags = struct.unpack_from('<I', hdr, 36)[0]
    if flags & 0x2: sys.exit('암호 설정 문서: 읽을 수 없음')
    if flags & 0x4: sys.exit('배포용 문서: 본문이 암호화되어 읽을 수 없음')
    secs = sorted([s for s in f.listdir() if s[0] == 'BodyText'], key=lambda s: int(s[1][7:]))
    out = []; stack = []          # stack of open tables
    def emit(s):
        if stack and stack[-1]['cur'] is not None: stack[-1]['cells'].setdefault(stack[-1]['cur'], []).append(s)
        else: out.append(s)
    for s in secs:
        data = f.openstream(s).read()
        if flags & 1: data = zlib.decompress(data, -15)
        pending_tbl = None
        for tag, lvl, rec in records(data):
            while stack and lvl <= stack[-1]['lvl']:   # left the table
                md = table_md(stack.pop()); emit('\n' + md + '\n')
            if tag == CTRL_HEADER and rec[:4] == b' lbt': pending_tbl = lvl
            elif tag == TABLE and pending_tbl is not None:
                rows, cols = struct.unpack_from('<HH', rec, 4)
                stack.append({'lvl': pending_tbl, 'rows': rows, 'cols': cols, 'cells': {}, 'cur': None}); pending_tbl = None
            elif tag == LIST_HEADER and stack and lvl == stack[-1]['lvl'] + 1:
                col, row = struct.unpack_from('<HH', rec, 8); stack[-1]['cur'] = (row, col)
            elif tag == PARA_TEXT:
                txt = para_text(rec)
                if txt: emit(txt)
        while stack: md = table_md(stack.pop()); emit('\n' + md + '\n')
    return '\n'.join(out)

print(convert(sys.argv[1]))
