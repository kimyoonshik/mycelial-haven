// Builds the CI guide (A4 landscape, 2 pages) from the generated SVGs, then prints it to PDF + PNG previews.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const OUT = process.argv[2];            // .../out/files
const FONT = process.argv[3];           // .../font
const info = JSON.parse(fs.readFileSync(path.join(OUT, '..', 'layout-info.json'), 'utf8'));
const svg = (n) => fs.readFileSync(path.join(OUT, 'svg', n + '.svg'), 'utf8').replace(/ width="[^"]*" height="[^"]*"/, '').replace(/<title>.*?<\/title>/, '');
const H = info.layouts.horizontal, cap = info.capHeight;
const clear = (cap / H.h * 100).toFixed(2);   // clear space (cap height) as % of horizontal logo height

const swatch = (name, hex, rgb, cmyk, dark) => `
  <div class="sw"><div class="sw__chip" style="background:${hex};${dark ? '' : 'border:1px solid #e3ddd0'}"></div>
  <b>${name}</b><span>HEX ${hex}</span><span>RGB ${rgb}</span><span>CMYK ${cmyk} <i>(참고값)</i></span></div>`;

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@font-face{font-family:Pret;src:url('file://${FONT}/pret/package/dist/web/variable/woff2/PretendardVariable.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Jost;src:url('file://${FONT}/package/files/jost-latin-500-normal.woff2');font-weight:500}
@font-face{font-family:Jost;src:url('file://${FONT}/package/files/jost-latin-600-normal.woff2');font-weight:600}
@page{size:297mm 210mm;margin:0}
*{box-sizing:border-box}
svg{display:block}
.cs .inner svg{width:100%}
body{margin:0;font-family:Pret,sans-serif;color:#23201B;background:#FAF7F1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:297mm;height:210mm;padding:13mm 15mm 11mm;display:flex;flex-direction:column;gap:6mm;page-break-after:always;overflow:hidden;position:relative}
.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.2px solid #23201B;padding-bottom:3mm}
.top h1{margin:0;font:600 19pt/1 Jost,Pret;letter-spacing:.12em}
.top h1 small{font:500 10pt Pret;letter-spacing:0;margin-left:4mm;color:#6b5a48}
.top .meta{font:500 8.5pt Pret;color:#6b5a48;text-align:right;line-height:1.5}
h2{margin:0 0 2.2mm;font:600 10.5pt Pret;display:flex;gap:2.5mm;align-items:baseline}
h2 em{font:600 9pt Jost;color:#E2A93B;font-style:normal;letter-spacing:.1em}
p,li{font-size:8.6pt;line-height:1.6;margin:0;color:#3a352d}
.grid{display:grid;gap:5mm}
.hero{background:#23201B;border-radius:3mm;height:54mm;display:grid;place-items:center;position:relative}
.hero svg{width:138mm}
.lab{position:absolute;font:500 8pt Pret;color:#cfc6b6;display:flex;align-items:center;gap:2mm}
.lab::before{content:'';width:9mm;height:0;border-top:1px solid #8a8070}
.lay{display:grid;grid-template-columns:1.55fr 1fr .62fr 1.1fr;gap:4mm;align-items:stretch}
.box{background:#fff;border:1px solid #e6dfd1;border-radius:2.5mm;display:flex;flex-direction:column;justify-content:space-between;padding:4mm;min-height:37mm}
.box .art{flex:1;display:grid;place-items:center;padding:3mm 0}
.box .cap{font-size:8pt;color:#6b5a48;display:flex;justify-content:space-between;gap:2mm}
.box .cap b{color:#23201B;font-weight:600}
.cols{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm}
.cv{border-radius:2.5mm;height:30mm;display:grid;place-items:center;border:1px solid #e6dfd1}
.cv svg{width:78%}
.cvl{font-size:8pt;margin-top:1.6mm;color:#6b5a48}.cvl b{color:#23201B}
.two{display:grid;grid-template-columns:1.05fr 1fr;gap:9mm;flex:1}
.sws{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.sw{display:flex;flex-direction:column;font-size:8pt;line-height:1.5;color:#3a352d}
.sw__chip{height:16mm;border-radius:2mm;margin-bottom:2mm}
.sw b{font-size:9pt;color:#23201B}.sw i{font-style:normal;color:#9a8f7e}
.sub{display:grid;grid-template-columns:repeat(2,1fr);gap:4mm;margin-top:3mm}
.cs{position:relative;background:#fff;border:1px solid #e6dfd1;border-radius:2.5mm;height:44mm;display:grid;place-items:center}
.cs .inner{position:relative;width:100mm}
.cs .zone{position:absolute;inset:-${clear}% -${(cap / H.w * 100).toFixed(2)}%;outline:1px dashed #E2A93B}
.cs .x{position:absolute;font:600 8pt Jost;color:#E2A93B}
table{border-collapse:collapse;width:100%;font-size:8.3pt}
td,th{border-bottom:1px solid #e3ddd0;padding:1.5mm 1mm;text-align:left;vertical-align:top}
th{font-weight:600;color:#23201B;width:28%}
ul{margin:0;padding-left:4mm}
.foot{position:absolute;left:15mm;right:15mm;bottom:6mm;font-size:7.5pt;color:#9a8f7e;display:flex;justify-content:space-between}
code{font-family:Pret;font-weight:600;color:#23201B}
</style></head><body>

<section class="page">
  <div class="top"><h1>MYCOGEN<small>로고 · CI 가이드</small></h1><div class="meta">(주)마이코젠 Mycogen Inc.<br>Version 1.0 · 2026.11</div></div>
  <div>
    <h2><em>01</em>로고 구성</h2>
    <div class="hero">${svg('mycogen_horizontal_reverse')}
      <div class="lab" style="left:31mm;top:7mm">심볼 — 중심에서 뻗어 나가는 균사 네트워크</div>
      <div class="lab" style="right:24mm;bottom:7mm">워드마크 — Jost SemiBold, 대문자, 자간 +260</div>
    </div>
  </div>
  <div>
    <h2><em>02</em>레이아웃 4종 <span style="font:400 8.3pt Pret;color:#6b5a48">— 가로형을 기본으로 쓰고, 공간에 맞춰 나머지를 고릅니다.</span></h2>
    <div class="lay">
      <div class="box"><div class="art">${svg('mycogen_horizontal_color').replace('<svg', '<svg style="width:92%"')}</div><div class="cap"><b>가로형 (기본)</b><span>horizontal</span></div></div>
      <div class="box"><div class="art">${svg('mycogen_vertical_color').replace('<svg', '<svg style="width:62%"')}</div><div class="cap"><b>세로형</b><span>vertical</span></div></div>
      <div class="box"><div class="art">${svg('mycogen_symbol_color').replace('<svg', '<svg style="width:52%"')}</div><div class="cap"><b>심볼</b><span>symbol</span></div></div>
      <div class="box"><div class="art">${svg('mycogen_wordmark_color').replace('<svg', '<svg style="width:84%"')}</div><div class="cap"><b>워드마크</b><span>wordmark</span></div></div>
    </div>
  </div>
  <div>
    <h2><em>03</em>색상 버전 4종 <span style="font:400 8.3pt Pret;color:#6b5a48">— 배경 밝기에 맞춰 고릅니다. 1도 인쇄·각인·자수에는 단색을 씁니다.</span></h2>
    <div class="cols">
      <div><div class="cv" style="background:#fff">${svg('mycogen_horizontal_color')}</div><div class="cvl"><b>color</b> · 밝은 배경용</div></div>
      <div><div class="cv" style="background:#23201B;border-color:#23201B">${svg('mycogen_horizontal_reverse')}</div><div class="cvl"><b>reverse</b> · 어두운 배경용 (웹사이트 첫 화면)</div></div>
      <div><div class="cv" style="background:#fff">${svg('mycogen_horizontal_black')}</div><div class="cvl"><b>black</b> · 단색 검정</div></div>
      <div><div class="cv" style="background:#5F6B3A;border-color:#5F6B3A">${svg('mycogen_horizontal_white')}</div><div class="cvl"><b>white</b> · 단색 흰색 (사진·컬러 배경 위)</div></div>
    </div>
  </div>
  <div class="foot"><span>MYCOGEN CI Guide</span><span>1 / 2</span></div>
</section>

<section class="page">
  <div class="top"><h1>MYCOGEN<small>로고 · CI 가이드</small></h1><div class="meta">(주)마이코젠 Mycogen Inc.<br>Version 1.0 · 2026.11</div></div>
  <div class="two">
    <div class="grid" style="align-content:start;gap:7mm">
      <div>
        <h2><em>04</em>색상</h2>
        <div class="sws">
          ${swatch('Spore Gold · 심볼', '#E2A93B', '226 169 59', '0 25 74 11', true)}
          ${swatch('Ink · 글자(밝은 배경)', '#23201B', '35 32 27', '0 9 23 86', true)}
          ${swatch('Off-white · 글자(어두운 배경)', '#FBF8F2', '251 248 242', '0 1 4 2', false)}
        </div>
        <p style="margin-top:2.5mm">보조색(웹사이트): Moss <code>#5F6B3A</code> · Soil <code>#6B5A48</code> · Paper <code>#FAF7F1</code>.
        CMYK는 화면색을 단순 환산한 참고값입니다. 명함·간판 등 인쇄 전에는 인쇄소에서 색 교정본(또는 별색 Pantone 지정)을 받아 확인하세요.</p>
      </div>
      <div>
        <h2><em>05</em>서체</h2>
        <table>
          <tr><th>로고 서체</th><td><b>Jost SemiBold (600)</b>, 대문자, 자간 +260 (0.26em)<br>모든 로고 파일은 글자를 윤곽선으로 변환해 두어 서체 설치 없이 그대로 쓸 수 있습니다.</td></tr>
          <tr><th>라이선스</th><td>SIL Open Font License 1.1 — 로고·인쇄·웹 등 상업적 사용 무료 (Google Fonts 배포)</td></tr>
          <tr><th>함께 쓰는 서체</th><td>영문 제목 Jost · 한글 본문 Pretendard (웹사이트와 동일, 둘 다 무료)</td></tr>
        </table>
      </div>
      <div>
        <h2><em>06</em>최소 크기</h2>
        <table>
          <tr><th>가로형</th><td>인쇄 너비 25mm 이상 · 화면 너비 120px 이상</td></tr>
          <tr><th>세로형</th><td>인쇄 너비 20mm 이상 · 화면 너비 100px 이상</td></tr>
          <tr><th>심볼</th><td>인쇄 6mm 이상 · 화면 24px 이상 (그보다 작으면 균사 선이 뭉개집니다)</td></tr>
        </table>
      </div>
    </div>
    <div class="grid" style="align-content:start;gap:7mm">
      <div>
        <h2><em>07</em>보호 영역</h2>
        <p>로고 둘레에는 워드마크 대문자 높이(<b>x</b>)만큼 비워 두고, 다른 글자·그림·테두리가 들어오지 않게 합니다.</p>
        <div class="cs" style="margin-top:3mm"><div class="inner">${svg('mycogen_horizontal_color')}<div class="zone"></div>
          <span class="x" style="left:-6mm;top:50%;transform:translateY(-50%)">x</span><span class="x" style="left:50%;top:-6mm">x</span></div></div>
      </div>
      <div>
        <h2><em>08</em>하지 말아야 할 것</h2>
        <ul>
          <li>가로·세로 비율을 바꾸거나 기울이고 회전하기</li>
          <li>지정색 외의 색으로 바꾸기, 심볼과 글자 색을 서로 바꾸기</li>
          <li>글자를 다른 서체로 다시 쓰거나 자간 바꾸기, 심볼과 글자 간격 바꾸기</li>
          <li>그림자·외곽선·그라데이션 등 효과 넣기</li>
          <li>복잡한 사진 위에 그대로 올리기 — 단색(white/black)을 쓰거나 바탕을 어둡게 깔기</li>
        </ul>
      </div>
      <div>
        <h2><em>09</em>파일 안내</h2>
        <table>
          <tr><th>svg/</th><td>벡터 — 웹사이트, 디자인 프로그램(일러스트레이터·피그마)</td></tr>
          <tr><th>pdf/</th><td>벡터 — 인쇄소 전달, 일러스트레이터에서 열어 AI·EPS로 저장 가능</td></tr>
          <tr><th>png/</th><td>투명 배경 고해상도 — 문서·PPT·SNS (가로형 4000px, 세로형 3000px, 심볼 2048px, SNS 프로필 1080px)</td></tr>
          <tr><th>파일 이름</th><td><code>mycogen_[레이아웃]_[색상]</code> — 레이아웃: horizontal · vertical · symbol · wordmark / 색상: color · reverse · black · white</td></tr>
        </table>
      </div>
    </div>
  </div>
  <div class="foot"><span>MYCOGEN CI Guide</span><span>2 / 2</span></div>
</section>
</body></html>`;

(async () => {
  const file = path.join(OUT, 'mycogen_CI_guide.html');
  fs.writeFileSync(file, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: 2 });
  await p.goto('file://' + file); await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(OUT, 'mycogen_CI_guide.pdf'), width: '297mm', height: '210mm', printBackground: true });
  const pages = await p.$$('.page');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(OUT, '..', `guide-p${i + 1}.png`) });
  const fonts = await p.evaluate(() => [...document.fonts].map(f => f.family + ' ' + f.weight + ' ' + f.status));
  console.log(fonts.join(' | '));
  await b.close(); fs.unlinkSync(file);
})();
