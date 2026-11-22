#!/bin/sh
# 1. les textes (content/*.md) deviennent src/09-content.gen.js ; 2. tous les src/0*.js sont assemblés dans main.js
cd "$(dirname "$0")"
node tools/content.js || exit 1
{ echo "'use strict';"; echo "/* Atelier arabe — plugin Obsidian (généré, ne pas modifier à la main) */"; echo "const { Plugin, ItemView, Notice, PluginSettingTab, Setting, MarkdownView, requestUrl } = require('obsidian');"; cat src/0*.js; } > main.js
