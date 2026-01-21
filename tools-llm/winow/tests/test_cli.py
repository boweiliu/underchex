from click.testing import CliRunner

from winow.cli import cli


def test_cli_help():
    runner = CliRunner()
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "AI Agent Session Manager" in result.output


def test_placeholder_fails():
    assert False, "Replace with real tests"
