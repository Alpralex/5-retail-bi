#!/usr/bin/env bash
# Downloads the public M5 dataset and the winning forecast (Nixtla mirror) into data/raw.
set -euo pipefail
mkdir -p data/raw && cd data/raw
git clone --depth 1 https://github.com/Nixtla/m5-forecasts.git mirror
unzip -o -q mirror/datasets/m5.zip
unzip -o -q "mirror/forecasts/0001 YJ_STU.zip"
rm -rf mirror
