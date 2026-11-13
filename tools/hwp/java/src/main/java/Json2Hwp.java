import com.google.gson.*;
import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.object.bodytext.Section;
import kr.dogfoot.hwplib.object.bodytext.control.*;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.CtrlHeaderGso;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.CtrlHeaderPageNumberPosition;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.pagenumberposition.NumberPosition;
import kr.dogfoot.hwplib.object.bodytext.control.sectiondefine.NumberShape;
import kr.dogfoot.hwplib.object.bodytext.control.ctrlheader.sectiondefine.TextDirection;
import kr.dogfoot.hwplib.object.bodytext.control.gso.textbox.LineChange;
import kr.dogfoot.hwplib.object.bodytext.control.gso.textbox.TextVerticalAlignment;
import kr.dogfoot.hwplib.object.bodytext.control.sectiondefine.PageDef;
import kr.dogfoot.hwplib.object.bodytext.control.table.*;
import kr.dogfoot.hwplib.object.bodytext.paragraph.Paragraph;
import kr.dogfoot.hwplib.object.bodytext.paragraph.ParagraphList;
import kr.dogfoot.hwplib.object.bodytext.paragraph.header.ParaHeader;
import kr.dogfoot.hwplib.object.bodytext.paragraph.lineseg.LineSegItem;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.HWPCharControlExtend;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.ParaText;
import kr.dogfoot.hwplib.object.docinfo.*;
import kr.dogfoot.hwplib.object.docinfo.borderfill.BorderThickness;
import kr.dogfoot.hwplib.object.docinfo.borderfill.BorderType;
import kr.dogfoot.hwplib.object.docinfo.borderfill.EachBorder;
import kr.dogfoot.hwplib.object.docinfo.borderfill.fillinfo.PatternFill;
import kr.dogfoot.hwplib.object.docinfo.borderfill.fillinfo.PatternType;
import kr.dogfoot.hwplib.object.docinfo.parashape.Alignment;
import kr.dogfoot.hwplib.object.docinfo.parashape.LineSpaceSort;
import kr.dogfoot.hwplib.tool.blankfilemaker.BlankFileMaker;
import kr.dogfoot.hwplib.writer.HWPWriter;

import java.io.FileReader;
import java.util.*;

/**
 * Builds an HWP 5.0 file from the JSON produced by docx2json.py.
 *
 * Units: JSON lengths are twips (1/20 pt); HWPUNIT is 1/100 pt, so x5.
 * Paragraph margins/indents/spacing are stored doubled (x10 from twips),
 * as observed in files saved by Hancom Office. Word "exact" line heights
 * become percentage line spacing relative to the paragraph's largest font.
 */
public class Json2Hwp {
    static final int TABLE_GSO_PROPERTY = 136979217; // value Hancom writes for a "treat as char" table
    HWPFile hwp;
    DocInfo di;
    int[] faceIdx = new int[7];
    Map<String, Integer> charShapes = new HashMap<>();
    Map<String, Integer> paraShapes = new HashMap<>();
    Map<String, Integer> borderFills = new HashMap<>();
    ParaShape baseParaShape;
    CharShape baseCharShape;
    int zOrder = 0;
    long textWidth; // HWPUNIT

    public static void main(String[] a) throws Exception {
        JsonObject doc = JsonParser.parseReader(new FileReader(a[0], java.nio.charset.StandardCharsets.UTF_8)).getAsJsonObject();
        Json2Hwp b = new Json2Hwp();
        b.build(doc);
        HWPWriter.toFile(b.hwp, a[1]);
        System.out.println("wrote " + a[1] + " charShapes=" + b.di.getCharShapeList().size()
                + " paraShapes=" + b.di.getParaShapeList().size() + " borderFills=" + b.di.getBorderFillList().size());
    }

    void build(JsonObject doc) throws Exception {
        hwp = BlankFileMaker.make();
        di = hwp.getDocInfo();
        baseParaShape = di.getParaShapeList().get(di.getStyleList().get(0).getParaShapeId());
        baseCharShape = di.getCharShapeList().get(di.getStyleList().get(0).getCharShapeId());
        addFont("맑은 고딕");

        Section sec = hwp.getBodyText().getSectionList().get(0);
        Paragraph first = sec.getParagraph(0);
        JsonObject page = doc.getAsJsonObject("page");
        setupPage(first, page);
        textWidth = (long) (page.get("w").getAsInt() - page.get("m_left").getAsInt() - page.get("m_right").getAsInt()) * 5;

        JsonArray blocks = doc.getAsJsonArray("blocks");
        boolean footerPage = doc.has("footer") && !doc.get("footer").isJsonNull()
                && doc.getAsJsonObject("footer").get("page").getAsBoolean();
        for (int i = 0; i < blocks.size(); i++) {
            Paragraph p;
            List<String> lead = new ArrayList<>();
            if (i == 0) {
                p = first;
                lead.add("secd");
                lead.add("cold");
                if (footerPage) {
                    lead.add("pgnp");
                    addPageNumber(p);
                }
            } else {
                p = sec.addNewParagraph();
            }
            block(p, blocks.get(i).getAsJsonObject(), lead, textWidth);
        }
    }

    // ---------------------------------------------------------------- doc info

    void addFont(String name) {
        List<List<FaceName>> lists = Arrays.asList(di.getHangulFaceNameList(), di.getEnglishFaceNameList(),
                di.getHanjaFaceNameList(), di.getJapaneseFaceNameList(), di.getEtcFaceNameList(),
                di.getSymbolFaceNameList(), di.getUserFaceNameList());
        for (int i = 0; i < 7; i++) {
            List<FaceName> l = lists.get(i);
            FaceName fn = l.get(0).clone(); // valid property/type-info combination from the blank template
            fn.setName(name);
            l.add(fn);
            faceIdx[i] = l.size() - 1;
        }
    }

    static long bgr(String hex) {
        if (hex == null) return 0;
        int v = Integer.parseInt(hex, 16);
        int r = (v >> 16) & 0xff, g = (v >> 8) & 0xff, b = v & 0xff;
        return ((long) b << 16) | ((long) g << 8) | r;
    }

    int charShape(int halfPt, boolean bold, String color) {
        String key = halfPt + "|" + bold + "|" + color;
        Integer id = charShapes.get(key);
        if (id != null) return id;
        CharShape cs = baseCharShape.clone();
        cs.getFaceNameIds().setHangul(faceIdx[0]);
        cs.getFaceNameIds().setLatin(faceIdx[1]);
        cs.getFaceNameIds().setHanja(faceIdx[2]);
        cs.getFaceNameIds().setJapanese(faceIdx[3]);
        cs.getFaceNameIds().setOther(faceIdx[4]);
        cs.getFaceNameIds().setSymbol(faceIdx[5]);
        cs.getFaceNameIds().setUser(faceIdx[6]);
        cs.setBaseSize(halfPt * 50);
        cs.getProperty().setBold(bold);
        cs.getCharColor().setValue(bgr(color));
        di.getCharShapeList().add(cs);
        id = di.getCharShapeList().size() - 1;
        charShapes.put(key, id);
        return id;
    }

    int paraShape(String align, int leftTw, int indentTw, int beforeTw, int afterTw, int pct, boolean keepNext) {
        String key = align + "|" + leftTw + "|" + indentTw + "|" + beforeTw + "|" + afterTw + "|" + pct + "|" + keepNext;
        Integer id = paraShapes.get(key);
        if (id != null) return id;
        ParaShape ps = baseParaShape.clone();
        Alignment al = "center".equals(align) ? Alignment.Center : "right".equals(align) ? Alignment.Right
                : "both".equals(align) ? Alignment.Justify : Alignment.Left;
        ps.getProperty1().setAlignment(al);
        ps.getProperty1().setLineSpaceSort(LineSpaceSort.RatioForLetter);
        ps.getProperty3().setLineSpaceSort(LineSpaceSort.RatioForLetter);
        ps.getProperty1().setTogetherNextPara(keepNext);
        ps.setLeftMargin(leftTw * 10);
        ps.setRightMargin(0);
        ps.setIndent(indentTw * 10);
        ps.setTopParaSpace(beforeTw * 10);
        ps.setBottomParaSpace(afterTw * 10);
        ps.setLineSpace(pct);
        ps.setLineSpace2(pct);
        di.getParaShapeList().add(ps);
        id = di.getParaShapeList().size() - 1;
        paraShapes.put(key, id);
        return id;
    }

    /** borders: JSON {top,left,bottom,right} each null or {sz,color}; fill: hex or null. Returns 1-based id. */
    int borderFill(JsonObject borders, String fill) {
        String key = (borders == null ? "none" : borders.toString()) + "|" + fill;
        Integer id = borderFills.get(key);
        if (id != null) return id;
        BorderFill bf = di.addNewBorderFill();
        bf.getProperty().setValue(0);
        String[] sides = {"left", "right", "top", "bottom"};
        EachBorder[] eb = {bf.getLeftBorder(), bf.getRightBorder(), bf.getTopBorder(), bf.getBottomBorder()};
        for (int i = 0; i < 4; i++) {
            JsonElement s = borders == null ? null : borders.get(sides[i]);
            if (s == null || s.isJsonNull()) {
                eb[i].setType(BorderType.None);
                eb[i].setThickness(BorderThickness.MM0_1);
                eb[i].getColor().setValue(0);
            } else {
                JsonObject o = s.getAsJsonObject();
                eb[i].setType(BorderType.Solid);
                eb[i].setThickness(thickness(o.get("sz").getAsInt()));
                eb[i].getColor().setValue(bgr(o.get("color").isJsonNull() ? null : o.get("color").getAsString()));
            }
        }
        bf.getDiagonalBorder().setType(BorderType.None);
        bf.getDiagonalBorder().setThickness(BorderThickness.MM0_1);
        bf.getDiagonalBorder().getColor().setValue(0);
        if (fill != null) {
            bf.getFillInfo().getType().setPatternFill(true);
            bf.getFillInfo().createPatternFill();
            PatternFill pf = bf.getFillInfo().getPatternFill();
            pf.getBackColor().setValue(bgr(fill));
            pf.getPatternColor().setValue(0);
            pf.setPatternType(PatternType.None);
        } else {
            bf.getFillInfo().getType().setValue(0);
        }
        id = di.getBorderFillList().size();
        borderFills.put(key, id);
        return id;
    }

    /** Word border size is in eighths of a point. */
    static BorderThickness thickness(int eighths) {
        double mm = eighths / 8.0 * 25.4 / 72.0;
        if (mm <= 0.11) return BorderThickness.MM0_1;
        if (mm <= 0.135) return BorderThickness.MM0_12;
        if (mm <= 0.175) return BorderThickness.MM0_15;
        if (mm <= 0.225) return BorderThickness.MM0_2;
        if (mm <= 0.275) return BorderThickness.MM0_25;
        if (mm <= 0.35) return BorderThickness.MM0_3;
        if (mm <= 0.45) return BorderThickness.MM0_4;
        return BorderThickness.MM0_5;
    }

    // ---------------------------------------------------------------- section

    void setupPage(Paragraph first, JsonObject pg) {
        ControlSectionDefine sd = (ControlSectionDefine) first.getControlList().get(0);
        PageDef pd = sd.getPageDef();
        pd.setPaperWidth(pg.get("w").getAsLong() * 5);
        pd.setPaperHeight(pg.get("h").getAsLong() * 5);
        pd.setLeftMargin(pg.get("m_left").getAsLong() * 5);
        pd.setRightMargin(pg.get("m_right").getAsLong() * 5);
        // Word's top/bottom margin is where the body starts; in HWP the body starts after
        // margin + header/footer area, so split the distance and keep a 10 mm footer for the page number.
        long hf = 2835;
        long top = pg.get("m_top").getAsLong() * 5, bottom = pg.get("m_bottom").getAsLong() * 5;
        pd.setTopMargin(Math.max(0, top - hf));
        pd.setHeaderMargin(Math.min(hf, top));
        pd.setBottomMargin(Math.max(0, bottom - hf));
        pd.setFooterMargin(Math.min(hf, bottom));
        pd.setGutterMargin(0);
    }

    void addPageNumber(Paragraph p) throws Exception {
        ControlPageNumberPosition pn = (ControlPageNumberPosition) p.addNewControl(ControlType.PageNumberPosition);
        CtrlHeaderPageNumberPosition h = pn.getHeader();
        h.getProperty().setNumberShape(NumberShape.Number);
        h.getProperty().setNumberPosition(NumberPosition.CenterBottom);
        h.setNumber(1);
        h.getUserSymbol().setBytes(new byte[]{0, 0});
        h.getBeforeDecorationLetter().setBytes(new byte[]{'-', 0});
        h.getAfterDecorationLetter().setBytes(new byte[]{'-', 0});
    }

    // ---------------------------------------------------------------- blocks

    void block(Paragraph p, JsonObject b, List<String> lead, long availWidth) throws Exception {
        if ("p".equals(b.get("type").getAsString())) para(p, b, lead, availWidth);
        else tableBlock(p, b, lead, availWidth);
    }

    static int maxHalfPt(JsonObject b) {
        int m = 0;
        for (JsonElement r : b.getAsJsonArray("runs")) {
            JsonObject o = r.getAsJsonObject();
            if (o.has("sz")) m = Math.max(m, o.get("sz").getAsInt());
        }
        if (m == 0) {
            JsonObject mark = b.getAsJsonObject("mark");
            m = mark.has("sz") ? mark.get("sz").getAsInt() : 21;
        }
        return m;
    }

    static int gi(JsonObject o, String k, int d) {
        return o.has(k) && !o.get(k).isJsonNull() ? o.get(k).getAsInt() : d;
    }

    void para(Paragraph p, JsonObject b, List<String> lead, long availWidth) throws Exception {
        JsonObject pp = b.getAsJsonObject("pp");
        JsonArray runs = b.getAsJsonArray("runs");
        int halfPt = maxHalfPt(b);
        boolean empty = runs.size() == 0;
        int lineTw = gi(pp, "line", 0);
        String rule = pp.has("lineRule") ? pp.get("lineRule").getAsString() : "auto";
        int pct;
        if ("exact".equals(rule) || "atLeast".equals(rule)) {
            if (empty && lineTw < halfPt * 10) { // spacer line smaller than its font: shrink the font
                halfPt = Math.max(2, lineTw / 10);
                pct = 100;
            } else {
                pct = (int) Math.round(lineTw / 20.0 / (halfPt / 2.0) * 100);
            }
        } else if (lineTw > 0) {
            pct = (int) Math.round(lineTw / 240.0 * 100);
        } else {
            pct = 100;
        }
        pct = Math.max(50, pct);

        int left = gi(pp, "ind_left", 0), hanging = gi(pp, "ind_hanging", 0), firstLine = gi(pp, "ind_firstLine", 0);
        int leftTw, indentTw;
        if (b.get("bullet").getAsBoolean()) {
            // bullet glyph + space is written as text; wrapped lines align with the text after it
            leftTw = left - hanging;
            indentTw = -(int) Math.round(halfPt / 2.0 * 0.8 * 20);
        } else {
            leftTw = left;
            indentTw = firstLine > 0 ? firstLine : -hanging;
        }
        String align = pp.has("align") ? pp.get("align").getAsString() : "left";
        int psId = paraShape(align, leftTw, indentTw, gi(pp, "before", 0), gi(pp, "after", 0), pct,
                pp.has("keepNext") && pp.get("keepNext").getAsBoolean());

        ParaHeader h = p.getHeader();
        h.setParaShapeId(psId);
        h.setStyleId((short) 0);
        h.getDivideSort().setValue((short) 0);
        if (pp.has("pageBreakBefore") && pp.get("pageBreakBefore").getAsBoolean()) h.getDivideSort().setDividePage(true);

        ParaText t = startText(p, lead);
        int pos = lead.size() * 8;
        p.createCharShape();
        if (empty) {
            JsonObject mark = b.getAsJsonObject("mark");
            p.getCharShape().addParaCharShape(0, charShape(halfPt, mark.has("b") && mark.get("b").getAsBoolean(), color(mark)));
        } else {
            int lastId = -1;
            for (JsonElement re : runs) {
                JsonObject r = re.getAsJsonObject();
                String s = r.get("t").getAsString();
                if (s.isEmpty()) continue;
                for (char c : s.toCharArray()) if (c < 32) throw new IllegalStateException("control char in text: " + (int) c);
                int id = charShape(gi(r, "sz", 21), r.has("b") && !r.get("b").isJsonNull() && r.get("b").getAsBoolean(), color(r));
                if (id != lastId) {
                    p.getCharShape().addParaCharShape(pos == lead.size() * 8 ? 0 : pos, id);
                    lastId = id;
                }
                t.addString(s);
                pos += s.length();
            }
            if (lastId == -1) p.getCharShape().addParaCharShape(0, charShape(halfPt, false, null));
        }
        t.addString(""); // moves the paragraph-end mark behind any extended control chars
        lineSeg(p, halfPt * 50, pct, availWidth);
    }

    static String color(JsonObject r) {
        if (!r.has("color") || r.get("color").isJsonNull()) return null;
        String c = r.get("color").getAsString();
        return "000000".equals(c) ? null : c;
    }

    ParaText startText(Paragraph p, List<String> lead) throws Exception {
        p.createText();
        ParaText t = p.getText();
        for (String c : lead) {
            if (c.equals("secd")) t.addExtendCharForSectionDefine();
            else if (c.equals("cold")) t.addExtendCharForColumnDefine();
            else if (c.equals("pgnp")) {
                HWPCharControlExtend ch = t.addNewExtendControlChar();
                ch.setCode((short) 0x15);
                byte[] add = new byte[12];
                add[3] = 'p'; add[2] = 'g'; add[1] = 'n'; add[0] = 'p';
                ch.setAddition(add);
            } else throw new IllegalArgumentException(c);
        }
        return t;
    }

    static void lineSeg(Paragraph p, int height, int pct, long width) {
        p.createLineSeg();
        LineSegItem it = p.getLineSeg().addNewLineSegItem();
        it.setTextStartPosition(0);
        it.setLineVerticalPosition(0);
        it.setLineHeight(height);
        it.setTextPartHeight(height);
        it.setDistanceBaseLineToLineVerticalPosition((int) Math.round(height * 0.85));
        it.setLineSpace((int) Math.round(height * Math.max(0, pct - 100) / 100.0));
        it.setStartPositionFromColumn(0);
        it.setSegmentWidth((int) width);
        it.getTag().setValue(393216);
    }

    // ---------------------------------------------------------------- tables

    /** Rough text-height estimate so the stored table size is close to what Hancom will lay out. */
    static long estimateCellContent(JsonArray blocks, long availHwp) {
        long total = 0;
        for (JsonElement be : blocks) {
            JsonObject b = be.getAsJsonObject();
            if (!"p".equals(b.get("type").getAsString())) continue;
            JsonObject pp = b.getAsJsonObject("pp");
            int halfPt = maxHalfPt(b);
            double em = halfPt / 2.0 * 100; // HWPUNIT
            double w = 0;
            for (JsonElement re : b.getAsJsonArray("runs")) {
                for (char c : re.getAsJsonObject().get("t").getAsString().toCharArray()) {
                    w += (c >= 0x1100) ? em : (c == ' ' ? em * 0.3 : em * 0.55);
                }
            }
            long lines = Math.max(1, (long) Math.ceil(w / Math.max(1, availHwp)));
            int lineTw = gi(pp, "line", (int) (halfPt * 12));
            total += lines * lineTw * 5L + (gi(pp, "before", 0) + gi(pp, "after", 0)) * 5L;
        }
        return total;
    }

    void tableBlock(Paragraph p, JsonObject b, List<String> lead, long availWidth) throws Exception {
        JsonArray grid = b.getAsJsonArray("grid");
        long[] colW = new long[grid.size()];
        long tableW = 0;
        for (int i = 0; i < colW.length; i++) { colW[i] = grid.get(i).getAsLong() * 5; tableW += colW[i]; }

        JsonArray rows = b.getAsJsonArray("rows");
        // row heights
        long[] rowH = new long[rows.size()];
        int marT = 300, marB = 300, marL = 500, marR = 500;
        boolean anyHeader = false, anyCantSplit = false;
        for (int ri = 0; ri < rows.size(); ri++) {
            JsonObject row = rows.get(ri).getAsJsonObject();
            anyHeader |= row.get("header").getAsBoolean();
            anyCantSplit |= row.get("cantSplit").getAsBoolean();
            long h = 0;
            for (JsonElement ce : row.getAsJsonArray("cells")) {
                JsonObject c = ce.getAsJsonObject();
                JsonObject mar = c.getAsJsonObject("mar");
                int t = gi(mar, "top", 60) * 5, bt = gi(mar, "bottom", 60) * 5, l = gi(mar, "left", 100) * 5, r = gi(mar, "right", 100) * 5;
                marT = t; marB = bt; marL = l; marR = r;
                long w = c.get("width").getAsLong() * 5;
                h = Math.max(h, estimateCellContent(c.getAsJsonArray("blocks"), w - l - r) + t + bt);
            }
            if (row.has("height") && !row.get("height").isJsonNull()) {
                h = Math.max(h, row.getAsJsonArray("height").get(0).getAsLong() * 5);
            }
            rowH[ri] = h;
        }
        long tableH = 0;
        for (long h : rowH) tableH += h;

        ParaHeader ph = p.getHeader();
        int holderPs = paraShape("left", 0, 0, 0, 0, 100, false);
        ph.setParaShapeId(holderPs);
        ph.setStyleId((short) 0);
        ph.getDivideSort().setValue((short) 0);
        ParaText t = startText(p, lead);
        t.addExtendCharForTable();
        p.createCharShape();
        p.getCharShape().addParaCharShape(0, charShape(21, false, null));

        ControlTable tbl = (ControlTable) p.addNewControl(ControlType.Table);
        CtrlHeaderGso g = tbl.getHeader();
        g.getProperty().setValue(TABLE_GSO_PROPERTY);
        g.setxOffset(0);
        g.setyOffset(0);
        g.setWidth(tableW);
        g.setHeight(tableH);
        g.setzOrder(zOrder++);
        g.setOutterMarginLeft(141);
        g.setOutterMarginRight(141);
        g.setOutterMarginTop(141);
        g.setOutterMarginBottom(141);
        g.setPreventPageDivide(false);

        Table rec = tbl.getTable();
        rec.getProperty().setDivideAtPageBoundary(anyCantSplit ? DivideAtPageBoundary.DivideByCell : DivideAtPageBoundary.Divide);
        rec.getProperty().setAutoRepeatTitleRow(anyHeader);
        rec.setColumnCount(colW.length);
        rec.setCellSpacing(0);
        rec.setLeftInnerMargin(marL);
        rec.setRightInnerMargin(marR);
        rec.setTopInnerMargin(marT);
        rec.setBottomInnerMargin(marB);
        rec.setBorderFillId(borderFill(null, null));

        for (int ri = 0; ri < rows.size(); ri++) {
            JsonObject row = rows.get(ri).getAsJsonObject();
            Row r = tbl.addNewRow();
            for (JsonElement ce : row.getAsJsonArray("cells")) {
                JsonObject c = ce.getAsJsonObject();
                Cell cell = r.addNewCell();
                ListHeaderForCell lh = cell.getListHeader();
                lh.getProperty().setValue(0);
                lh.getProperty().setTextDirection(TextDirection.Horizontal);
                lh.getProperty().setLineChange(LineChange.Normal);
                String va = c.get("valign").getAsString();
                lh.getProperty().setTextVerticalAlignment("center".equals(va) ? TextVerticalAlignment.Center
                        : "bottom".equals(va) ? TextVerticalAlignment.Bottom : TextVerticalAlignment.Top);
                lh.getProperty().setTitleCell(row.get("header").getAsBoolean());
                int col = c.get("col").getAsInt(), cs = c.get("colspan").getAsInt(), rs = c.get("rowspan").getAsInt();
                long w = 0;
                for (int k = col; k < col + cs; k++) w += colW[k];
                long h = 0;
                for (int k = ri; k < ri + rs; k++) h += rowH[k];
                JsonObject mar = c.getAsJsonObject("mar");
                int l = gi(mar, "left", 100) * 5, rr = gi(mar, "right", 100) * 5;
                lh.setColIndex(col);
                lh.setRowIndex(ri);
                lh.setColSpan(cs);
                lh.setRowSpan(rs);
                lh.setWidth(w);
                lh.setHeight(h);
                lh.setLeftMargin(l);
                lh.setRightMargin(rr);
                lh.setTopMargin(gi(mar, "top", 60) * 5);
                lh.setBottomMargin(gi(mar, "bottom", 60) * 5);
                lh.setBorderFillId(borderFill(c.getAsJsonObject("borders"),
                        c.get("fill").isJsonNull() ? null : c.get("fill").getAsString()));
                lh.setTextWidth(w);
                lh.setFieldName("");
                ParagraphList pl = cell.getParagraphList();
                JsonArray cb = c.getAsJsonArray("blocks");
                if (cb.size() == 0) throw new IllegalStateException("empty cell");
                for (JsonElement be : cb) {
                    JsonObject bo = be.getAsJsonObject();
                    if (!"p".equals(bo.get("type").getAsString())) throw new IllegalStateException("nested table");
                    para(pl.addNewParagraph(), bo, Collections.emptyList(), w - l - rr);
                }
            }
        }
        // the holder line is as tall as the table plus its outer margins
        p.createLineSeg();
        LineSegItem it = p.getLineSeg().addNewLineSegItem();
        long lh = tableH + 282;
        it.setTextStartPosition(0);
        it.setLineVerticalPosition(0);
        it.setLineHeight((int) lh);
        it.setTextPartHeight((int) lh);
        it.setDistanceBaseLineToLineVerticalPosition((int) Math.round(lh * 0.85));
        it.setLineSpace(600);
        it.setStartPositionFromColumn(0);
        it.setSegmentWidth((int) availWidth);
        it.getTag().setValue(393216);
    }
}
