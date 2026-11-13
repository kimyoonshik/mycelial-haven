"""Small authoring DSL that emits the intermediate JSON consumed by Json2Hwp (Korean public-document style)."""
NAVY, GRAY, HEAD, SUB = '1F3864', '808080', 'E7EDF4', 'F3F3F3'
TEXT_W = 9638  # A4 with 20 mm side margins, twips


def run(t, sz=21, b=False, color=None):
    return {'t': t, 'sz': sz, 'b': b, 'color': color}


def para(runs, align='both', before=0, after=0, pct=160, left=0, hanging=0, keep=False, mark_sz=21):
    pp = {'before': before, 'after': after, 'line': int(240 * pct / 100), 'lineRule': 'auto', 'align': align}
    if left:
        pp['ind_left'] = left
    if hanging:
        pp['ind_hanging'] = hanging
    if keep:
        pp['keepNext'] = True
    return {'type': 'p', 'pp': pp, 'runs': runs if isinstance(runs, list) else [runs],
            'mark': {'sz': mark_sz}, 'bullet': False}


def spacer(pt=4):
    return para([], after=0, pct=100, mark_sz=max(2, pt * 2))


def title_bar(text, sub=None):
    blocks = [para(run(text, 32, True, 'FFFFFF'), align='center', pct=130, mark_sz=32)]
    if sub:
        blocks.append(para(run(sub, 20, False, 'DCE3EC'), align='center', pct=130, mark_sz=20))
    c = {'row': 0, 'col': 0, 'colspan': 1, 'rowspan': 1, 'width': TEXT_W,
         'borders': {'top': None, 'left': None, 'bottom': None, 'right': None}, 'fill': NAVY,
         'mar': {'top': 220, 'left': 200, 'bottom': 220, 'right': 200}, 'valign': 'center', 'blocks': blocks}
    return {'type': 'tbl', 'grid': [TEXT_W], 'rows': [{'header': False, 'cantSplit': True, 'height': None, 'cells': [c]}]}


def meta(text):
    return para(run(text, 19, False, '555555'), align='right', before=80, after=200)


def h1(text):
    return para(run(text, 26, True, NAVY), align='left', before=280, after=100, keep=True, mark_sz=26)


def box(head, rest=None):
    """□ level: bold lead phrase, optional plain continuation."""
    runs = [run('□ ', 22, True), run(head, 22, True)]
    if rest:
        runs.append(run(' ' + rest, 22))
    return para(runs, before=120, after=60, left=0, hanging=290, keep=True, mark_sz=22)


def circle(text, lead=None):
    runs = [run('○ ', 21)]
    if lead:
        runs.append(run(lead + ' ', 21, True))
    runs.append(run(text, 21))
    return para(runs, after=40, left=300, hanging=275)


def dash(text):
    return para([run('- ', 20), run(text, 20)], after=30, left=600, hanging=170, mark_sz=20)


def note(text):
    return para([run('※ ', 18, False, '555555'), run(text, 18, False, '555555')], after=60, left=300, hanging=230, mark_sz=18)


def _cell(r, c, text, w, fill=None, bold=False, align='center', sz=19, rowspan=1, colspan=1):
    b = {'sz': 4, 'color': GRAY}
    lines = text if isinstance(text, list) else [text]
    blocks = [para([run(t, sz, bold)] if t else [], align=align, pct=145, mark_sz=sz) for t in lines]
    return {'row': r, 'col': c, 'colspan': colspan, 'rowspan': rowspan, 'width': w,
            'borders': {'top': b, 'left': b, 'bottom': b, 'right': b}, 'fill': fill,
            'mar': {'top': 70, 'left': 110, 'bottom': 70, 'right': 110}, 'valign': 'center', 'blocks': blocks}


def table(widths, header, rows, first_col=True, aligns=None, header_rows=1):
    """widths in twips (summing to TEXT_W); rows: list of lists of str or [str,...] (multi-line cell)."""
    assert sum(widths) == TEXT_W, sum(widths)
    aligns = aligns or (['center'] + ['left'] * (len(widths) - 1))
    out = [[_cell(0, c, h, widths[c], HEAD, True) for c, h in enumerate(header)]]
    for r, row in enumerate(rows, 1):
        cells = []
        for c, v in enumerate(row):
            is_first = first_col and c == 0
            cells.append(_cell(r, c, v, widths[c], SUB if is_first else None, is_first, 'center' if is_first else aligns[c]))
        out.append(cells)
    return {'type': 'tbl', 'grid': widths,
            'rows': [{'header': i < header_rows, 'cantSplit': True, 'height': None, 'cells': cs} for i, cs in enumerate(out)]}


def document(blocks):
    return {'page': {'w': 11906, 'h': 16838, 'm_left': 1134, 'm_right': 1134, 'm_top': 1134, 'm_bottom': 1134},
            'footer': {'page': True}, 'blocks': blocks}
