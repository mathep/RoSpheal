<p align="center">
  <img src="Rospheal.png" alt="RoSpheal logo" width="160" />
</p>

# RoSpheal 🦭

This is my personal fork of [RoSeal](https://github.com/RoSeal-Extension/RoSeal) I forked it to add a couple of features I wanted for my own use

> this is **unofficial**.  If you want the real, polished thing, grab it from [roseal.live](https://www.roseal.live).

## Stuff I added

- **Unfriend Swiper** — a Fast Swiping based way to unfreind users on your friends list
- **Outfit Roulette** — rolls you a random outfit out of items your Roblox inventory.
- **The icon** — I drew it in MS Paint

## Run it yourself

You'll need [Bun](https://bun.sh) (run `bun upgrade` if you already have it).

1. Build it: `bun run build --target chrome`
2. Open `chrome://extensions` and flip on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `dist/` folder it just made


## Build options (if you actually care)

- `bun run build --target <TARGET> [--release]`
  - `TARGET` = `chrome` | `firefox` | `edge` | `safari`
  - Skip `--release` for a normal dev build. Output lands in `dist/`.
- `bun run redist` — builds every target at once into `builds-dist/`.

(Firefox reviewers: use `bun run build --target firefox --release`. Without `--release` you get a dev build that won't match the submitted checksum.)

## Credit + license

Built on top of [RoSeal](https://github.com/RoSeal-Extension/RoSeal) — Copyright (C) 2022-2026 roseal.live. Licensed under [AGPL-3.0](LICENSE)

## Dev notes (inherited from RoSeal)
- Dev WS server port: `2923`
- Dev API server port: `4121`
- Dev WWW server port: `35922`
