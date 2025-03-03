#!/bin/bash

# 创建正确的文件夹结构
mkdir -p public/img/avatars
mkdir -p public/img/icons

# 确保landing.js在正确的位置
if [ -f public/scripts/landing.js ]; then
  mv public/scripts/landing.js public/landing.js
fi

# 确保landing.css在正确的位置
if [ -f public/styles/landing.css ]; then
  mv public/styles/landing.css public/landing.css
fi

echo "文件夹结构创建完成"
