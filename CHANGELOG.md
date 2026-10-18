# Changelog

All notable changes to this project are documented in this file.

## [2.2.0] - 2026-10-18

### Features

- **web:** Add shuffle, autoplay and repeat to the music player ([9b12daf](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/9b12daf214f2d41e3b2e3655864f9b8b8c9b681e))
- **web:** Show music progress on the island border ([a35b3f0](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/a35b3f091bc8470322b2a8c83d1e816ce088d43d))
- **web:** Keep slow admin actions alive across navigation ([5312d50](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/5312d5099bef30280d35f2050ed68fc4a1a164bd))

### Bug Fixes

- **web:** Give chart tooltips a background in production ([31bbb9b](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/31bbb9ba513cdf58b8c815ee4792d8dfd144adfd))
## [2.1.0] - 2026-10-18

### Features

- **cwl-ping:** Send pings through the bot ([7b09d42](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/7b09d421244802305e7e75d31e51479aca6c2471))
- **web:** Use the Ark date picker in the date filter ([07ac123](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/07ac1232843662c9882409d5bd2f5aa58427d433))
- **web:** Replace corner controls with a dynamic island ([d3dd57b](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/d3dd57b6f787180d21b5d098786a54565d04c5c7))
- **web:** Add column filters to CWL applications ([d332bd7](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/d332bd7cfb3c4546b82544f6cfbf76d57fb82406))
- **web:** Revamp homepage, menus and error page ([4f22e16](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/4f22e1675553f6c2703427d02adcbdfc7ec386ae))
- **web:** Revamp admin pages and dashboard ([a28db0c](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/a28db0c61a76562a934a3a6be2685027e3c386c7))
- **web:** Move admin tables and charts off the AG stack ([79f663a](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/79f663ac3129fe1f083a05b6a9054d9b184eb77c))
- **web:** Rich Discord link previews via component embeds ([631db07](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/631db071dc1f255614bd6c250c3659e7a793cf60))

### Bug Fixes

- **web:** Open the mobile menu from the avatar alone ([c116a90](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/c116a901851c835a4dffa69bc7dd8b165673b82b))
- **web:** Layer tooltips and table dropdowns correctly ([870ed84](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/870ed84f0637b248383f8361583f705f9885526e))
- **server:** Store clan tag for admin-registered CWL applications ([35ca11d](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/35ca11d39f58f411ffeeb59b010bc719556f7787))
- **web:** Stop set filter popup from resizing while closing ([0468a48](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/0468a485934415b068970a6506ff69720c413f87))
- Bump better-auth, rewrite docker deploy ([e14073b](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/e14073bf20d398c98b9d3d6371ddbc5fd6aaf69c))
- Typo ([2148128](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/214812801873b31b115d7d724851002204dd4444))
- **server:** Build workspace packages before the docker install ([058b3f3](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/058b3f3cf43d34b8ad57eb7dc8266e6497cac494))

### Refactor

- Minor changes ([37cefaf](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/37cefaf0741c0388cfd8833f800b82ffdc3f4852))

### Build

- Deploy prod from local builds ([6921e88](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/6921e889c9029b311234f61271db55bf358706b7))

### CI

- **release:** Sign and push release tags from the workflow ([fab44ac](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/fab44acee1886b3c2d6dd31fcc0b3c0fc908efc4))

### Dependencies

- **deps:** Update types and icon data (#77) ([0eb2d3a](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/0eb2d3aa6d2b813c11957f0818282532ee303234))
- **deps:** Update build toolchain ([ecebbcb](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/ecebbcbdac617d8b437df7498d4332eb153a23f2))
- **deps:** Update redis:8-alpine docker digest to 3811787 (#75) ([ab19b6d](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/ab19b6dddc19c360bb2d91a4397e7bd525992c38))
- **deps:** Update postgres:18-alpine docker digest to 77f5851 (#74) ([f1228cf](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/f1228cf07651690eb8df01ee60a1fe3930bcb298))
- **deps:** Update nginx:1.31-alpine docker digest to df221db (#73) ([c1f8236](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/c1f82369435ac966317d95d31c4185d155bed63e))
- **deps:** Update node.js to 0e0ff40 ([596c1aa](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/596c1aa5a1fbd446ea8ced0d0ae64c5bce818bf0))
- **deps:** Update types and icon data ([55c58c5](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/55c58c55a2e9c98d7c6927f6521ff37891048083))
- **deps:** Update nginx:1.31-alpine docker digest to c8497b1 ([a38a7ad](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/a38a7ad44b6b3bd28c57891128dee43e70853a49))
- **deps:** Update ghcr.io/drizzle-team/gateway:latest docker digest to db9c50c ([6162635](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/61626353366232dcdb9e222d0f4838a3f3a6d6e1))
## [2.0.3] - 2026-09-08

### Bug Fixes

- Do not run lint/format/typecheck on release commits/pr ([f5cd58f](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/f5cd58febff97b150a74d8d0eb9e612d038747f3))
- Do not run lint/format/typecheck on release commits/pr ([1c086d2](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/1c086d2bd38db745b991435c0d3d31cbd8a3e041))
## [2.0.2] - 2026-09-07

### Build

- Mirror releases to github ([34b7bd8](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/34b7bd8d8f70643c72f336074ca9f60397f7ff7e))
## [2.0.1] - 2026-09-07

### Build

- Improve docker build ([1dd0170](https://git.bymini.dev/clashwithjpa/clashwithjpa.com/commit/1dd017044b51ee388c581e6744a3b0456a47accf))
## [2.0.0] - 2026-09-07

Baseline release — the point at which versioned images and generated release
notes begin. Changes before this predate the changelog; see the commit history.
