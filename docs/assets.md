# Asset provenance

- `src/audio.ts`: original procedural compositions and synthesis written for Orvio. Three distinct BPM/scale/progression/drum arrangements: First Light (110), Afterimage (128), Violet Drive (150). No samples or third-party recordings. MIT with project code.
- `src/chart.ts`: original charts generated from the same beat grid. No DJMAX chart data.
- Logo/icon: original arch + dot design. Public files use original paths and outlined Outfit lettering; no restricted display typeface is shipped.
- `public/outfit.ttf`: Outfit variable font, Google Fonts distribution, SIL OFL 1.1. https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/OFL.txt . Notice: `public/OFL-Outfit.txt`.
- `public/korean.ttf`: subset of Noto Sans KR regular for interface characters. Google Fonts distribution via https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600&display=swap . Original font: https://fonts.gstatic.com/s/notosanskr/v40/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLQ.ttf . SIL OFL: https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/OFL.txt . Notice: `public/OFL-NotoSansKR.txt`. The subset does not use a reserved font name in its CSS alias.
- PixiJS, Vite and other dependency licenses remain in package distributions/lockfile. No DJMAX assets or endorsement implied.

- `public/chinese.ttf` and `public/japanese.ttf`: locally subset Noto Sans SC / JP from the Google Fonts repository, SIL OFL1.1, regional glyphs. Sources https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf and https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf . Notices `OFL-NotoSansSC.txt` / `OFL-NotoSansJP.txt`.
- Arcade backgrounds, hit beams and particles are original CSS/PixiJS graphics, not copied game assets.

## Wallpaper and social images

Three original geometric wallpapers are authored for the built-in tracks using flat colors and project-owned shapes. They do not copy DJMAX art. Default social art uses the existing OFL Outfit font. The result PNG renderer uses a bounded raster glyph subset derived from that same font; its license remains in public/OFL-Outfit.txt.
