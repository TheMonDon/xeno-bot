#!/usr/bin/env sh
# Helper to list available developer scripts in tools/
echo "Available scripts:" 
ls -1 tools | sed 's/^/ - /'
