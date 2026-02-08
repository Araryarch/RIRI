#!/bin/bash

set -e

RESET='\033[0m'
BOLD='\033[1m'
GREEN='\033[32m'
RED='\033[31m'
BLUE='\033[34m'

echo -e "${BLUE}${BOLD}RiriLang Installer${RESET}"
echo "=============================="

# 1. Check Dependencies
echo -e "${BOLD}Checking dependencies...${RESET}"

if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: 'bun' is not installed.${RESET}"
    echo "Please install Bun first: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if ! command -v g++ &> /dev/null; then
    echo -e "${RED}Error: 'g++' is not installed.${RESET}"
    echo "Please install g++ (usually 'build-essential' on Linux)."
    exit 1
fi

echo -e "${GREEN}✓ Dependencies found${RESET}"

# 2. Build via Bun
echo -e "\n${BOLD}Building Riri compiler...${RESET}"
bun run compile

if [ ! -f "./rrc" ]; then
    echo -e "${RED}Error: Build failed. 'rrc' binary not found.${RESET}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${RESET}"

# 3. Install to ~/.riri/bin
INSTALL_DIR="$HOME/.riri/bin"
mkdir -p "$INSTALL_DIR"

echo -e "\n${BOLD}Installing to $INSTALL_DIR...${RESET}"
cp ./rrc "$INSTALL_DIR/rrc"
chmod +x "$INSTALL_DIR/rrc"

# 4. Update Shell Config
SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
else
    # Fallback/Guess
    if [ -f "$HOME/.zshrc" ]; then
        SHELL_CONFIG="$HOME/.zshrc"
    elif [ -f "$HOME/.bashrc" ]; then
        SHELL_CONFIG="$HOME/.bashrc"
    fi
fi

if [ -n "$SHELL_CONFIG" ]; then
    if ! grep -q "$INSTALL_DIR" "$SHELL_CONFIG"; then
        echo -e "\n${BOLD}Adding to PATH in $SHELL_CONFIG...${RESET}"
        echo "" >> "$SHELL_CONFIG"
        echo "# RiriLang" >> "$SHELL_CONFIG"
        echo "export PATH=\"\$PATH:$INSTALL_DIR\"" >> "$SHELL_CONFIG"
        echo -e "${GREEN}✓ Added to configuration${RESET}"
        echo -e "Please run: ${BOLD}source $SHELL_CONFIG${RESET}"
    else
        echo -e "${GREEN}✓ Already in PATH${RESET}"
    fi
else
    echo -e "${BLUE}Could not detect shell config file.${RESET}"
    echo "Please manually add the following to your path:"
    echo "export PATH=\"\$PATH:$INSTALL_DIR\""
fi

echo -e "\n${GREEN}${BOLD}Installation Complete! 🚀${RESET}"
echo -e "You can now use '${BOLD}rrc${RESET}' from anywhere."
echo -e "Try: rrc --help"
