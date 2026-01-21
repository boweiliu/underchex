"""CLI interface for Winow - Docker-like commands for AI agent sessions."""

import click
from typing import Optional


class AliasedGroup(click.Group):
    """Custom group that supports command aliases."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.aliases = {}

    def add_alias(self, alias: str, command_name: str):
        """Register an alias for a command."""
        self.aliases[alias] = command_name

    def get_command(self, ctx, cmd_name):
        """Resolve aliases to their target commands."""
        # Check if it's an alias first
        cmd_name = self.aliases.get(cmd_name, cmd_name)
        return super().get_command(ctx, cmd_name)

    def list_commands(self, ctx):
        """List all commands including aliases."""
        commands = super().list_commands(ctx)
        # Add aliases to the list
        commands.extend(self.aliases.keys())
        return sorted(commands)


@click.group(cls=AliasedGroup)
@click.pass_context
def cli(ctx):
    """AI Agent Session Manager - launch coding agents in tmux with git worktrees."""
    pass


def start_command(prompt_arg: Optional[str], prompt_opt: Optional[str], agent: str, ctx: click.Context):
    """Shared logic for start/create commands."""
    # Determine the prompt from either positional arg or option
    prompt = prompt_arg or prompt_opt

    # If no prompt provided, show help
    if not prompt:
        click.echo(ctx.get_help())
        return

    click.echo(f"[noop] Would start {agent} with: {prompt}")


@cli.command()
@click.argument("prompt", required=False, default=None)
@click.option("-p", "--prompt", "prompt_opt", default=None, help="The initial task for the agent (alternative to positional argument).")
@click.option("-a", "--agent", default="opencode", help="The agent to use (default: opencode).")
@click.pass_context
def start(ctx, prompt: Optional[str], prompt_opt: Optional[str], agent: str):
    """Start a new agent session.

    PROMPT is the initial task for the agent.
    Agent defaults to 'opencode' but can be set with -a/--agent.

    Examples:
        winow start "fix the bugs"
        winow start -a claude "fix the bugs"
        winow start -p "fix the bugs"
    """
    start_command(prompt, prompt_opt, agent, ctx)


# Register 'create' as an alias for 'start'
cli.add_alias("create", "start")


@cli.command()
def ps():
    """List active sessions."""
    click.echo("[noop] Would list sessions")


# Register 'list' as an alias for 'ps'
cli.add_alias("list", "ps")


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
