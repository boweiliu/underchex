"""CLI interface for Winow - Docker-like commands for AI agent sessions."""

import click


@click.group()
def cli():
    """AI Agent Session Manager - launch coding agents in tmux with git worktrees."""
    pass


@cli.command()
@click.argument("agent")
@click.argument("prompt")
def start(agent: str, prompt: str):
    """Start a new agent session.

    AGENT is the agent to use (e.g., opencode, claude, codex).
    PROMPT is the initial task for the agent.
    """
    click.echo(f"[noop] Would start {agent} with: {prompt}")


@cli.command()
def ps():
    """List active sessions."""
    click.echo("[noop] Would list sessions")


@cli.command()
@click.argument("session")
@click.argument("message")
def send(session: str, message: str):
    """Send a message to a session.

    SESSION is the session name or ID.
    MESSAGE is the text to send.
    """
    click.echo(f"[noop] Would send to {session}: {message}")


@cli.command()
@click.argument("session")
def attach(session: str):
    """Attach to a session.

    SESSION is the session name or ID.
    """
    click.echo(f"[noop] Would attach to {session}")


if __name__ == "__main__":
    cli()
