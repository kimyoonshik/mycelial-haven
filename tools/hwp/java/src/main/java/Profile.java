import com.google.gson.*;
import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.object.bodytext.Section;
import kr.dogfoot.hwplib.object.bodytext.control.*;
import kr.dogfoot.hwplib.object.bodytext.control.gso.*;
import kr.dogfoot.hwplib.object.bodytext.control.table.*;
import kr.dogfoot.hwplib.object.bodytext.paragraph.Paragraph;
import kr.dogfoot.hwplib.object.bodytext.paragraph.ParagraphList;
import kr.dogfoot.hwplib.object.bodytext.paragraph.charshape.CharPositionShapeIdPair;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.HWPChar;
import kr.dogfoot.hwplib.object.bodytext.paragraph.text.HWPCharNormal;
import kr.dogfoot.hwplib.object.docinfo.*;
import kr.dogfoot.hwplib.object.docinfo.borderfill.EachBorder;
import kr.dogfoot.hwplib.reader.HWPReader;

import java.io.FileWriter;
import java.util.*;

/** Dumps a normalized description of an HWP file (formatting, tables, controls) as JSON for comparison. */
public class Profile {
    HWPFile f;
    DocInfo di;
    JsonArray paras = new JsonArray(), tables = new JsonArray();
    Map<String, Integer> ctrlCount = new TreeMap<>();

    public static void main(String[] a) throws Exception {
        Profile p = new Profile();
        p.f = HWPReader.fromFile(a[0]);
        p.di = p.f.getDocInfo();
        JsonObject out = p.run();
        try (FileWriter w = new FileWriter(a[1], java.nio.charset.StandardCharsets.UTF_8)) {
            new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create().toJson(out, w);
        }
    }

    JsonObject run() throws Exception {
        JsonObject o = new JsonObject();
        o.addProperty("version", f.getFileHeader().getVersion().toString());
        o.addProperty("distribution", f.getFileHeader().isDistribution());
        o.addProperty("password", f.getFileHeader().hasPassword());
        o.addProperty("binData", di.getBinDataList().size());
        JsonArray fonts = new JsonArray();
        for (FaceName fn : di.getHangulFaceNameList()) fonts.add(fn.getName());
        o.add("hangulFonts", fonts);
        o.addProperty("charShapes", di.getCharShapeList().size());
        o.addProperty("paraShapes", di.getParaShapeList().size());
        o.addProperty("borderFills", di.getBorderFillList().size());
        o.addProperty("bullets", di.getBulletList().size());
        o.addProperty("numberings", di.getNumberingList().size());
        JsonArray bullets = new JsonArray();
        for (Bullet b : di.getBulletList()) bullets.add(String.valueOf(b.getBulletChar().toUTF16LEString()));
        o.add("bulletChars", bullets);
        JsonArray secs = new JsonArray();
        int si = 0;
        for (Section s : f.getBodyText().getSectionList()) {
            int pi = 0;
            for (Paragraph p : s.getParagraphs()) para(p, "s" + si + "/" + (pi++), secs);
            si++;
        }
        o.add("sections", secs);
        o.add("controls", new Gson().toJsonTree(ctrlCount));
        o.add("paragraphs", paras);
        o.add("tables", tables);
        return o;
    }

    JsonObject charShape(int id) {
        CharShape cs = di.getCharShapeList().get(id);
        JsonObject o = new JsonObject();
        o.addProperty("font", di.getHangulFaceNameList().get(cs.getFaceNameIds().getHangul()).getName());
        o.addProperty("size", cs.getBaseSize() / 100.0);
        o.addProperty("bold", cs.getProperty().isBold());
        o.addProperty("italic", cs.getProperty().isItalic());
        o.addProperty("color", String.format("%06X", cs.getCharColor().getValue() & 0xffffff));
        o.addProperty("ratio", cs.getRatios().getHangul());
        o.addProperty("spacing", cs.getCharSpaces().getHangul());
        o.addProperty("underline", cs.getProperty().getUnderLineSort().toString());
        return o;
    }

    JsonObject paraShape(int id) {
        ParaShape ps = di.getParaShapeList().get(id);
        JsonObject o = new JsonObject();
        o.addProperty("align", ps.getProperty1().getAlignment().toString());
        o.addProperty("lsSort", ps.getProperty3().getLineSpaceSort().toString());
        o.addProperty("ls", ps.getLineSpace2());
        o.addProperty("left", ps.getLeftMargin());
        o.addProperty("right", ps.getRightMargin());
        o.addProperty("indent", ps.getIndent());
        o.addProperty("before", ps.getTopParaSpace());
        o.addProperty("after", ps.getBottomParaSpace());
        o.addProperty("head", ps.getProperty1().getParaHeadShape().toString());
        o.addProperty("headId", ps.getParaHeadId());
        o.addProperty("level", ps.getProperty1().getParaLevel());
        o.addProperty("keepNext", ps.getProperty1().isTogetherNextPara());
        o.addProperty("grid", ps.getProperty1().isUseGrid());
        o.addProperty("bf", ps.getBorderFillId());
        o.addProperty("bfVisible", ps.getBorderFillId() > 0 && visible(di.getBorderFillList().get(ps.getBorderFillId() - 1)));
        return o;
    }

    static boolean visible(BorderFill bf) {
        for (EachBorder e : new EachBorder[]{bf.getLeftBorder(), bf.getRightBorder(), bf.getTopBorder(), bf.getBottomBorder()})
            if (!"None".equals(e.getType().toString())) return true;
        return bf.getFillInfo().getType().hasPatternFill() && bf.getFillInfo().getPatternFill().getBackColor().getValue() != 0xffffffffL;
    }

    JsonObject borderFill(int id) {
        JsonObject o = new JsonObject();
        if (id < 1 || id > di.getBorderFillList().size()) { o.addProperty("invalid", id); return o; }
        BorderFill bf = di.getBorderFillList().get(id - 1);
        String[] n = {"L", "R", "T", "B"};
        EachBorder[] e = {bf.getLeftBorder(), bf.getRightBorder(), bf.getTopBorder(), bf.getBottomBorder()};
        for (int i = 0; i < 4; i++)
            o.addProperty(n[i], "None".equals(e[i].getType().toString()) ? "none"
                    : e[i].getType() + "/" + e[i].getThickness() + "/" + String.format("%06X", e[i].getColor().getValue() & 0xffffff));
        if (bf.getFillInfo().getType().hasPatternFill())
            o.addProperty("fill", String.format("%08X", bf.getFillInfo().getPatternFill().getBackColor().getValue()));
        return o;
    }

    void para(Paragraph p, String path, JsonArray secs) throws Exception {
        JsonObject o = new JsonObject();
        o.addProperty("path", path);
        StringBuilder sb = new StringBuilder();
        if (p.getText() != null) for (HWPChar c : p.getText().getCharList()) {
            if (c instanceof HWPCharNormal && c.getCode() >= 32) sb.append((char) c.getCode());
            else if (c.getCode() == 9) sb.append('\t');
            else if (c.getCode() == 10) sb.append('\n');
        }
        o.addProperty("text", sb.toString());
        o.addProperty("style", di.getStyleList().get(p.getHeader().getStyleId()).getHangulName());
        o.addProperty("pageBreak", p.getHeader().getDivideSort().isDividePage());
        o.add("ps", paraShape(p.getHeader().getParaShapeId()));
        JsonArray runs = new JsonArray();
        if (p.getCharShape() != null) for (CharPositionShapeIdPair pr : p.getCharShape().getPositonShapeIdPairList()) {
            JsonObject r = charShape((int) pr.getShapeId());
            r.addProperty("pos", pr.getPosition());
            runs.add(r);
        }
        o.add("runs", runs);
        if (p.getLineSeg() != null) {
            JsonArray ls = new JsonArray();
            for (var it : p.getLineSeg().getLineSegItemList()) ls.add(it.getLineHeight() + "+" + it.getLineSpace() + "@" + it.getLineVerticalPosition());
            o.add("lineSegs", ls);
        }
        paras.add(o);
        if (p.getControlList() == null) return;
        int ci = 0;
        for (Control c : p.getControlList()) {
            String t = c.getType().toString();
            if (c instanceof ControlField) t = t + ":" + ((ControlField) c).getHeader().getCommand().toUTF16LEString().split(";")[0];
            ctrlCount.merge(t, 1, Integer::sum);
            String cp = path + "/" + c.getType() + (ci++);
            if (c instanceof ControlSectionDefine) {
                var pd = ((ControlSectionDefine) c).getPageDef();
                JsonObject s = new JsonObject();
                s.addProperty("path", cp);
                s.addProperty("paper", pd.getPaperWidth() + "x" + pd.getPaperHeight());
                s.addProperty("margins_LRTB", pd.getLeftMargin() + "," + pd.getRightMargin() + "," + pd.getTopMargin() + "," + pd.getBottomMargin());
                s.addProperty("header_footer", pd.getHeaderMargin() + "," + pd.getFooterMargin());
                secs.add(s);
            } else if (c instanceof ControlTable) {
                table((ControlTable) c, cp, secs);
            } else if (c instanceof ControlHeader) {
                list(((ControlHeader) c).getParagraphList(), cp, secs);
            } else if (c instanceof ControlFooter) {
                list(((ControlFooter) c).getParagraphList(), cp, secs);
            } else if (c instanceof ControlFootnote) {
                list(((ControlFootnote) c).getParagraphList(), cp, secs);
            } else if (c instanceof ControlEndnote) {
                list(((ControlEndnote) c).getParagraphList(), cp, secs);
            } else if (c instanceof GsoControl) {
                gso((GsoControl) c, cp, secs);
            }
        }
    }

    void gso(GsoControl g, String cp, JsonArray secs) throws Exception {
        ctrlCount.merge("gso:" + g.getGsoType(), 1, Integer::sum);
        if (g instanceof ControlRectangle && ((ControlRectangle) g).getTextBox() != null)
            list(((ControlRectangle) g).getTextBox().getParagraphList(), cp, secs);
        if (g instanceof ControlContainer)
            for (GsoControl ch : ((ControlContainer) g).getChildControlList()) gso(ch, cp, secs);
    }

    void list(ParagraphList pl, String path, JsonArray secs) throws Exception {
        if (pl == null) return;
        int i = 0;
        for (Paragraph p : pl) para(p, path + "/" + (i++), secs);
    }

    void table(ControlTable t, String path, JsonArray secs) throws Exception {
        JsonObject o = new JsonObject();
        o.addProperty("path", path);
        var g = t.getHeader();
        o.addProperty("likeWord", g.getProperty().isLikeWord());
        o.addProperty("gsoProp", g.getProperty().getValue());
        o.addProperty("w", g.getWidth());
        o.addProperty("h", g.getHeight());
        o.addProperty("outer", g.getOutterMarginLeft() + "," + g.getOutterMarginTop());
        Table r = t.getTable();
        o.addProperty("rows", r.getRowCount());
        o.addProperty("cols", r.getColumnCount());
        o.addProperty("divide", r.getProperty().getDivideAtPageBoundary().toString());
        o.addProperty("repeatHeader", r.getProperty().isAutoRepeatTitleRow());
        o.addProperty("inner_LRTB", r.getLeftInnerMargin() + "," + r.getRightInnerMargin() + "," + r.getTopInnerMargin() + "," + r.getBottomInnerMargin());
        o.add("tableBF", borderFill(r.getBorderFillId()));
        JsonArray cells = new JsonArray();
        int ri = 0;
        for (Row row : t.getRowList()) {
            for (Cell c : row.getCellList()) {
                ListHeaderForCell lh = c.getListHeader();
                JsonObject co = new JsonObject();
                co.addProperty("rc", lh.getRowIndex() + "," + lh.getColIndex());
                co.addProperty("span", lh.getRowSpan() + "x" + lh.getColSpan());
                co.addProperty("w", lh.getWidth());
                co.addProperty("h", lh.getHeight());
                co.addProperty("mar_LRTB", lh.getLeftMargin() + "," + lh.getRightMargin() + "," + lh.getTopMargin() + "," + lh.getBottomMargin());
                co.addProperty("applyInner", lh.getProperty().isApplyInnerMagin());
                co.addProperty("valign", lh.getProperty().getTextVerticalAlignment().toString());
                co.addProperty("title", lh.getProperty().isTitleCell());
                co.add("bf", borderFill(lh.getBorderFillId()));
                cells.add(co);
                list(c.getParagraphList(), path + "/r" + lh.getRowIndex() + "c" + lh.getColIndex(), secs);
            }
            ri++;
        }
        o.add("cells", cells);
        o.addProperty("nested", path.split("Table").length > 2);
        tables.add(o);
    }
}
