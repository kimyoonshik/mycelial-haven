import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.reader.HWPReader;
import kr.dogfoot.hwplib.object.bodytext.paragraph.Paragraph;
import kr.dogfoot.hwplib.object.bodytext.control.*;
import kr.dogfoot.hwplib.object.bodytext.control.table.*;
import com.google.gson.*;
public class Dump {
  static Gson g = new GsonBuilder().serializeSpecialFloatingPointValues().create();
  static String j(Object o){ try { return g.toJson(o);} catch(Throwable t){ return "ERR "+t; } }
  public static void main(String[] a) throws Exception {
    HWPFile f = HWPReader.fromFile(a[0]);
    var di = f.getDocInfo();
    System.out.println("VERSION " + f.getFileHeader().getVersion());
    System.out.println("HANGUL FONTS " + di.getHangulFaceNameList().size()); for (var fn: di.getHangulFaceNameList()) System.out.println("  " + fn.getName());
    System.out.println("CHARSHAPES " + di.getCharShapeList().size()); for (int i=0;i<Math.min(3,di.getCharShapeList().size());i++) System.out.println("  cs"+i+" "+j(di.getCharShapeList().get(i)));
    System.out.println("PARASHAPES " + di.getParaShapeList().size()); for (int i=0;i<di.getParaShapeList().size();i++) System.out.println("  ps"+i+" "+j(di.getParaShapeList().get(i)));
    System.out.println("BORDERFILLS " + di.getBorderFillList().size()); for (int i=0;i<di.getBorderFillList().size();i++) System.out.println("  bf"+(i+1)+" "+j(di.getBorderFillList().get(i)));
    var sec = f.getBodyText().getSectionList().get(0);
    int tcount=0;
    for (Paragraph p : sec.getParagraphs()) {
      if (p.getControlList()==null) continue;
      for (Control c : p.getControlList()) {
        if (c.getType()==ControlType.SectionDefine) System.out.println("SECDEF " + j(((ControlSectionDefine)c).getPageDef()) + "\n   header " + j(((ControlSectionDefine)c).getHeader()));
        if (c.getType()==ControlType.PageNumberPosition) System.out.println("PGNP " + j(c));
        if (c.getType()==ControlType.Footer) System.out.println("FOOTER " + j(((ControlFooter)c).getHeader()) + " LH " + j(((ControlFooter)c).getListHeader()));
        if (c.getType()==ControlType.Table && tcount++ < 3) {
          ControlTable t=(ControlTable)c;
          System.out.println("TABLE-PARA header " + j(p.getHeader()) + " lineseg " + j(p.getLineSeg()) + " cs " + j(p.getCharShape()));
          System.out.println("TABLE gso " + j(t.getHeader()));
          System.out.println("TABLE rec " + j(t.getTable()));
          Cell cell = t.getRowList().get(0).getCellList().get(0);
          System.out.println("CELL lh " + j(cell.getListHeader()));
          Paragraph cp = cell.getParagraphList().getParagraph(0);
          System.out.println("CELL para header " + j(cp.getHeader()) + " lineseg " + j(cp.getLineSeg()) + " cs " + j(cp.getCharShape()));
        }
      }
    }
  }
}
