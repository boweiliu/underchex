# nb remote set notes

## What I initially tried
- Ran `nb remote set https://github.com/boweiliu/underchex.git docs/nb` (also with `home:` prefix).
- Verified with `nb remote` and `nb status`.

## Issue encountered
- `nb remote set` printed the confirmation banner, but no remote was actually configured.
- `nb remote` continued to report "No remote configured," and `.nb_docs_repo/home/.git/config` had no `origin`.

## What worked
- Manually added the Git remote in the notebook repo:
  `git -C .nb_docs_repo/home remote add origin https://github.com/boweiliu/underchex.git`
- Renamed the notebook branch to the desired mirror target:
  `git -C .nb_docs_repo/home branch -m docs/nb`
- `nb remote` then reported `https://github.com/boweiliu/underchex.git (docs/nb)`.

## Suspected root cause
- `nb remote set` is interactive and prompts with `read -p "Proceed?"`.
- When run without a TTY, the prompt fails; with `set -e`, the script exits
  before it reaches `git remote add origin`, so no remote is written.
- There is another prompt if the target branch does not exist on the remote
  (choose merge vs orphan), which also fails in non-interactive runs.

## Noninteractive attempts (skipped for now)
- `printf "2\n\n" | nb remote set https://github.com/boweiliu/underchex.git docs/nb --skip-confirmation`
  printed the update banner, then `Exiting...`; remote unchanged.
- `printf "2\n\n" | nb remote set https://github.com/boweiliu/underchex.git docs/nb --skip-preamble`
  skipped the first prompt but still showed the branch-selection prompts and
  timed out waiting for input; remote unchanged.
