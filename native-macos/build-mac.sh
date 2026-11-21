#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
APP="${1:-$PWD/dist/Playmaker Tackle.app}"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web"
cp native-macos/Info.plist "$APP/Contents/Info.plist"
cp index.html app.js features.js styles.css features.css favicon.svg "$APP/Contents/Resources/web/"
python3 native-macos/make-icon.py
iconutil -c icns native-macos/Playmaker.iconset -o "$APP/Contents/Resources/Playmaker.icns"
swiftc -O -framework AppKit -framework WebKit -framework UniformTypeIdentifiers native-macos/PlaymakerApp.swift -o "$APP/Contents/MacOS/PlaymakerTackle"
echo "$APP"
