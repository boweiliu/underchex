"""Configuration loading for winow.

Loads config from ~/.config/winow/config.toml or .winow.toml in repo root.
"""

import tomllib
from pathlib import Path


def _find_repo_root() -> Path | None:
    """Find git repo root by walking up from cwd."""
    cwd = Path.cwd()
    for parent in [cwd, *cwd.parents]:
        if (parent / ".git").exists():
            return parent
    return None


def _load_config_file(path: Path) -> dict:
    """Load and parse a TOML config file."""
    if not path.exists():
        return {}
    try:
        with open(path, "rb") as f:
            return tomllib.load(f)
    except (tomllib.TOMLDecodeError, OSError):
        return {}


def load_config() -> dict:
    """Load config from standard locations.

    Checks in order:
    1. ~/.config/winow/config.toml
    2. .winow.toml in repo root

    Later files override earlier ones.
    """
    config: dict = {}

    # User config
    user_config_path = Path.home() / ".config" / "winow" / "config.toml"
    user_config = _load_config_file(user_config_path)
    _merge_config(config, user_config)

    # Repo config
    repo_root = _find_repo_root()
    if repo_root:
        repo_config_path = repo_root / ".winow.toml"
        repo_config = _load_config_file(repo_config_path)
        _merge_config(config, repo_config)

    return config


def _merge_config(base: dict, override: dict) -> None:
    """Merge override into base, modifying base in place."""
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _merge_config(base[key], value)
        else:
            base[key] = value


def get_default_agent() -> str:
    """Get the default agent from config, or fall back to 'opencode'."""
    config = load_config()
    defaults = config.get("defaults", {})
    return defaults.get("agent", "opencode")
