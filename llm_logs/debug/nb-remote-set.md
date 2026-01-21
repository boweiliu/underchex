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
