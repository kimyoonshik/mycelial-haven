import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.reader.HWPReader;
import kr.dogfoot.hwplib.tool.textextractor.*;
import kr.dogfoot.hwplib.object.bodytext.control.*;
import kr.dogfoot.hwplib.object.bodytext.paragraph.Paragraph;
public class ReadBack {
  public static void main(String[] a) throws Exception {
    for (String p : a) {
      HWPFile f = HWPReader.fromFile(p);
      String text = TextExtractor.extract(f, TextExtractMethod.InsertControlTextBetweenParagraphText);
      var pd = ((ControlSectionDefine) f.getBodyText().getSectionList().get(0).getParagraph(0).getControlList().get(0)).getPageDef();
      int tables = 0, pgnp = 0;
      for (Paragraph para : f.getBodyText().getSectionList().get(0).getParagraphs())
        if (para.getControlList() != null) for (Control c : para.getControlList()) { if (c.getType()==ControlType.Table) tables++; if (c.getType()==ControlType.PageNumberPosition) pgnp++; }
      System.out.printf("%s: read OK, %d chars of text, tables %d, page-number controls %d, paper %.1fx%.1f mm, margins L%.1f R%.1f T%.1f+%.1f B%.1f+%.1f mm%n",
        p, text.replaceAll("\\s","").length(), tables, pgnp, pd.getPaperWidth()/283.465, pd.getPaperHeight()/283.465,
        pd.getLeftMargin()/283.465, pd.getRightMargin()/283.465, pd.getTopMargin()/283.465, pd.getHeaderMargin()/283.465, pd.getBottomMargin()/283.465, pd.getFooterMargin()/283.465);
      System.out.println("   first 120: " + text.substring(0, Math.min(120, text.length())).replace("\n"," / "));
    }
  }
}
