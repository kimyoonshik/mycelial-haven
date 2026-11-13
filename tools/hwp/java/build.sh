#!/usr/bin/env bash
# Builds the HWP writer. Downloads hwplib and gson from Maven Central on first run.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p lib out
M=https://repo1.maven.org/maven2
[ -f lib/hwplib-1.1.11.jar ] || curl -fsSL -o lib/hwplib-1.1.11.jar $M/kr/dogfoot/hwplib/1.1.11/hwplib-1.1.11.jar
[ -f lib/gson-2.10.1.jar ] || curl -fsSL -o lib/gson-2.10.1.jar $M/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar
javac --release 11 -encoding UTF-8 -cp "lib/*" -d out src/main/java/*.java
