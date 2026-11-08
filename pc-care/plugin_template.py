"""추가 기능(플러그인) 견본.

이 파일을 PC-Care.exe 옆의 plugins 폴더에 넣고 앱을 다시 켜면 '견본' 탭이 생깁니다.
새 기능은 이 모양을 그대로 따라 만듭니다:
  - id     : 다른 기능과 겹치지 않는 영문 이름 (기본 기능과 같은 id 를 쓰면 그 기능을 대신합니다)
  - title  : 탭 이름
  - order  : 탭 순서 (작을수록 왼쪽, 기본 기능은 10~60)
  - build  : 탭 화면을 만드는 곳
"""

from tkinter import messagebox, ttk

from pc_care.plugin_api import Plugin, intro


class HelloPlugin(Plugin):
    id = "hello"
    title = "견본"
    order = 900

    def build(self, parent):
        intro(parent, "추가 기능 견본입니다. 이 자리에 새 기능의 화면이 들어갑니다.")
        ttk.Button(parent, text="눌러 보기", command=lambda: messagebox.showinfo("견본", "추가 기능이 잘 동작합니다.")).pack(
            anchor="w", pady=10)


PLUGIN = HelloPlugin
