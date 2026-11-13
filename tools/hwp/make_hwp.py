"""One-step HWP builder: hwpdsl document / JSON / DOCX -> validated .hwp.

    python3 make_hwp.py --check            # environment check
    python3 make_hwp.py in.json out.hwp    # intermediate JSON -> HWP
    python3 make_hwp.py in.docx out.hwp    # Word -> HWP

From Python:  from make_hwp import build; build(document(blocks), 'out.hwp')
"""
import importlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
JAVA_DIR = os.path.join(HERE, 'java')
if HERE not in sys.path:
    sys.path.insert(0, HERE)


def _pip(pkg):
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', pkg], check=True)


def _ensure_olefile():
    try:
        import olefile  # noqa: F401
    except ImportError:
        _pip('olefile')


def find_java():
    """java on PATH, else the runtime shipped in the jdk4py package (installed from PyPI if needed)."""
    j = shutil.which('java')
    if j:
        return j
    try:
        import jdk4py
    except ImportError:
        try:
            _pip('jdk4py')
            importlib.invalidate_caches()
            import jdk4py
        except Exception as e:
            raise RuntimeError('Java runtime not available and jdk4py could not be installed: %s' % e)
    return str(jdk4py.JAVA)


def _ensure_classes():
    if not os.path.exists(os.path.join(JAVA_DIR, 'out', 'Json2Hwp.class')):
        subprocess.run(['bash', os.path.join(JAVA_DIR, 'build.sh')], check=True)


def build(doc, out_path):
    """doc: dict from hwpdsl.document(), or a path to .json / .docx. Returns the validator summary."""
    _ensure_olefile()
    _ensure_classes()
    java = find_java()
    from validate_hwp import V
    with tempfile.TemporaryDirectory() as tmp:  # ASCII names: Java may not open non-ASCII paths
        src = os.path.join(tmp, 'in.json')
        if isinstance(doc, dict):
            json.dump(doc, open(src, 'w', encoding='utf-8'), ensure_ascii=False)
        elif doc.lower().endswith('.docx'):
            from docx2json import main as docx2json
            shutil.copy(doc, os.path.join(tmp, 'in.docx'))
            docx2json(os.path.join(tmp, 'in.docx'), src)
        else:
            shutil.copy(doc, src)
        out = os.path.join(tmp, 'out.hwp')
        cp = os.pathsep.join([os.path.join(JAVA_DIR, 'out'), os.path.join(JAVA_DIR, 'lib', '*')])
        r = subprocess.run([java, '-cp', cp, 'Json2Hwp', src, out], capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(out):
            raise RuntimeError('HWP writer failed:\n' + r.stdout + r.stderr)
        v = V(out)
        if v.errors:
            raise RuntimeError('HWP structure errors: ' + '; '.join(v.errors[:10]))
        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        shutil.copy(out, out_path)
    summary = {'file': out_path, 'paragraphs': len(v.texts), 'tables': len(v.tables), 'errors': 0,
               'chars': sum(len(t) for t in v.texts)}
    print('HWP OK: %(file)s (tables %(tables)d, characters %(chars)d, structure errors 0)' % summary)
    return summary


def check():
    _ensure_olefile()
    _ensure_classes()
    java = find_java()
    r = subprocess.run([java, '-version'], capture_output=True, text=True)
    version = [l for l in (r.stderr + r.stdout).splitlines() if 'version' in l]
    print('java:', java, version[0] if version else '')
    print('ready')


if __name__ == '__main__':
    if sys.argv[1:] == ['--check']:
        check()
    elif len(sys.argv) == 3:
        build(sys.argv[1], sys.argv[2])
    else:
        print(__doc__)
        sys.exit(2)
