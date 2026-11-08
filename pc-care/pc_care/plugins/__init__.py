"""Built-in features, one tab each. To add a built-in feature, add a module here and list it in BUILTIN.

Imported explicitly (not discovered) so the .exe build sees every module.
"""

from . import diagnose, duplicates, junk, organize, processes, startup

BUILTIN = [organize, duplicates, diagnose, junk, startup, processes]
