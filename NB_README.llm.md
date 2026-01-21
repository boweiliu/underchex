# NB - Onboarding - Repo Notes

Tags: #nb #onboarding #commands #workflow

This repo uses `nb` as a local note store for onboarding knowledge, command tips, and other project context. The goal is to keep long-form knowledge in `nb` and keep the repo light.

## Getting started

1. Open the notebook home view:

   ```sh
   nb
   ```

2. Learn the available commands:

   ```sh
   nb --help
   ```

3. See which notebook(s) are available (paths are useful to confirm the repo-local notebook):

   ```sh
   nb notebooks --names --paths
   ```

## Searching for command info

Use `nb search` to find notes about commands, scripts, or workflows.

- Search for a command or keyword:

  ```sh
  nb search '#codex' --list
  ```

- Search within a specific notebook (replace `home` with the notebook name):

  ```sh
  nb search home: codex --list
  ```

- Narrow searches using AND/OR/NOT:

  ```sh
  nb search codex --and "install" --list
  nb search codex --not deprecated --list
  ```

## Opening results

Once you have a result ID, show or edit it:

```sh
nb show <id>
nb edit <id>
```

## Contributing notes

Add new onboarding notes as you discover gaps, and tag them for searchability.

```sh
nb add --title "Codex - Guide - Setup" --tags onboarding,commands "Notes go here..."
```

Keep command examples short and practical. The notebook is the source of truth for onboarding details.

## Editing existing notes safely

When using `nb edit --content`, include `--overwrite`. Without it, `nb` appends new content to the existing note, which can duplicate sections and leave stale links behind.

## Performance tips

`auto_sync` is disabled to avoid network latency on every command:

```sh
nb settings set auto_sync 0
```

With `auto_sync=1`, every `nb` command triggers a git fetch/push, which adds noticeable delay. Instead, sync manually when needed:

```sh
nb sync
```

For fastest reads, you can also access files directly:

```sh
cat .nb_docs_repo/home/<filename>.md
```

Signed-off-by: gpt-5 via codex
