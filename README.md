# github-review-shortcut

Toggle a file's **Viewed** state on GitHub's pull request UI by hovering over
the file and pressing Space.

- On an expanded file, Space marks it viewed, collapses it, and scrolls the next
  rendered file to the top of the visible diff region.
- On a collapsed file, Space marks it unviewed, expands it, and scrolls it to
  the top of the visible diff region.
- Space retains its normal behavior while typing in comments and other form
  fields.
- Both the redesigned and classic GitHub **Files changed** pages are supported.

This is a customized fork of
[`nbolton/github-review-shortcut`](https://github.com/nbolton/github-review-shortcut).
It is not intended for upstream submission.

[Original discussion](https://github.com/orgs/community/discussions/10197)

## Instructions

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension.
2. In the Tampermonkey dashboard, create a new script.
3. Replace the editor contents with [`main.js`](main.js), then save.
