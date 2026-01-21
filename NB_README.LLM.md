# nb onboarding (repo notes)

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
  nb search codex --list
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
nb add --title "Codex usage" --tags onboarding,commands "Notes go here..."
```

Keep command examples short and practical. The notebook is the source of truth for onboarding details.
