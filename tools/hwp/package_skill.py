"""Builds the uploadable Claude skill (dist/008-hwp-document.zip) from this folder.

    python3 package_skill.py

The zip holds SKILL.md, the Python tools, the compiled Java writer with its
libraries (hwplib, gson) and a copy of olefile, so it runs without network
access wherever Java is available.
"""
import os
import shutil
import subprocess
import zipfile

import olefile

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = '008-hwp-document'
PY = ['make_hwp.py', 'hwpdsl.py', 'docx2json.py', 'validate_hwp.py', 'hwp2md.py', 'hwp2txt.py', 'example.py']


def main():
    subprocess.run(['bash', os.path.join(HERE, 'java', 'build.sh')], check=True)
    dist = os.path.join(HERE, 'dist')
    root = os.path.join(dist, NAME)
    shutil.rmtree(root, ignore_errors=True)
    os.makedirs(os.path.join(root, 'java'))
    for f in ['SKILL.md'] + PY:
        shutil.copy(os.path.join(HERE, f), root)
    for d in ['out', 'lib', 'src']:
        shutil.copytree(os.path.join(HERE, 'java', d), os.path.join(root, 'java', d))
    shutil.copy(os.path.join(HERE, 'java', 'build.sh'), os.path.join(root, 'java'))
    ole = os.path.dirname(olefile.__file__)
    os.makedirs(os.path.join(root, 'olefile'))
    for f in ['__init__.py', 'olefile.py', 'LICENSE.txt']:
        shutil.copy(os.path.join(ole, f), os.path.join(root, 'olefile'))
    with open(os.path.join(root, 'THIRD_PARTY.txt'), 'w', encoding='utf-8') as fh:
        fh.write('java/lib/hwplib-1.1.11.jar  kr.dogfoot hwplib, Apache License 2.0\n'
                 'java/lib/gson-2.10.1.jar    Google Gson, Apache License 2.0\n'
                 'olefile/                    olefile, BSD license (olefile/LICENSE.txt)\n')
    zpath = os.path.join(dist, NAME + '.zip')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d != '__pycache__']
            for f in files:
                p = os.path.join(base, f)
                z.write(p, os.path.relpath(p, dist))
    print(zpath, os.path.getsize(zpath), 'bytes')


if __name__ == '__main__':
    main()
