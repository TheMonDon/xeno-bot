#!/usr/bin/env sh
echo "Tool wrappers available in tools/ — run with node tools/<name>.js"
ls tools | sed 's/^/ - /'
