#!/usr/bin/env bash
set -e

NB_DIR="../.nb_docs_repo/home"
MINT_DIR="docs"

rsync -av --delete "$NB_DIR/" "$MINT_DIR/"
