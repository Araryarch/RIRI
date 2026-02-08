#!/bin/bash

# Check if running as root (sudor/su) which usually breaks bun path
if [ "$EUID" -eq 0 ]; then
  echo "Error: Please do not run this script as root (sudo)."
  echo "Bun is installed for your user, not root."
  echo "Run './install.sh' without sudo."
  exit 1
fi

echo "Installing dependencies..."
if ! command -v bun &> /dev/null; then
    echo "Error: 'bun' command not found."
    echo "Please install Bun first: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

bun install

echo "Compiling RiriLang to standalone binary..."
# Compile TS directly to a standalone executable
bun build --compile --minify --sourcemap ./src/index.ts --outfile rrc

echo "Installing binary to ~/.bun/bin/..."
mkdir -p "$HOME/.bun/bin"
mv ./rrc "$HOME/.bun/bin/rrc"

echo "-----------------------------------"
echo "Success! RiriLang standalone binary installed."
echo "Location: $HOME/.bun/bin/rrc"
echo "Make sure your global bin is in your PATH."
echo "Fish shell: set -Ux fish_user_paths \$HOME/.bun/bin \$fish_user_paths"
echo "Try running: rrc --help"
echo "-----------------------------------"
