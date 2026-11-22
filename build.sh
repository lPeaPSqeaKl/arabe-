#!/bin/sh
cd "$(dirname "$0")"
{ echo "'use strict';"; echo "/* Atelier arabe — plugin Obsidian (généré, ne pas modifier à la main) */"; echo "const { Plugin, ItemView, Notice, PluginSettingTab, Setting, MarkdownView, requestUrl } = require('obsidian');"; cat src/0*.js; } > main.js
