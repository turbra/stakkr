# Stakkr Observer

Optional Cockpit plugin for watching `stakkr` host state from the Cockpit web
console.

It is based on the same Cockpit observer pattern used in `calabi-observer`, but
adapted to the smaller `stakkr` host model.

## What It Shows

- current host state:
  - stock
  - shared execution pool
  - clock-tiering
  - mixed
- live VM scope weights and pinning
- current CPU pool map
- host memory state:
  - THP
  - KSM
  - zram
- memory-management thread overhead

## Files

- `manifest.json`
- `index.html`
- `collector.py`
- `stakkr-observer.js`
- `stakkr-observer.css`
- `sparkline.js`

## Install From Source

```bash
sudo mkdir -p /usr/share/cockpit/stakkr-observer
sudo rsync -av /path/to/stakkr/cockpit/stakkr-observer/ /usr/share/cockpit/stakkr-observer/
```

Then reload Cockpit in the browser. No build step is required.
