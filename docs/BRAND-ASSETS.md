# SJA supplied branding and portrait

## Brand master

`public/assets/sja-header.svg` is an unmodified copy of the user-uploaded **SJA Header.svg**. It supplies the SJA diamond mark and document-style wordmark, the exact blues `#3975B9` and `#285D98`, and Georgia/Arial typography. The reference first-home artwork shared in chat supplies the navy, white, bold upright serif and blue call-to-action direction.

The site uses the master in its header, footer, digital illustration, favicon and review presentation. Responsive containers limit the long document rule where space is tight; the original SVG contents are preserved. The coastal-home illustration is original concept artwork and is not presented as a supplied brand asset.

## Sue's portrait

- Source page: <https://sjamortgages.co.nz/about/>
- Original image: <https://sjamortgages.co.nz/wp-content/uploads/2023/04/Sue-Aitken-headshot.webp>
- Local asset: `public/assets/sue-aitken.webp`
- Original dimensions: 662 × 800; original file size: 53,066 bytes.
- SHA-256: `518791d22f71444696c1470e0ea16d258f017dc237a607340f9171b92761a6bc`.

The portrait was identified beside Sue's first-person biography on the original About page and visually inspected. The original image and transparency are retained, without retouching or re-encoding. The expertise section replaces the concept's initial monogram with this photograph.

## Exports

`npm run demo` embeds local SVG and photographic assets into both HTML exports. This keeps the portable demo self-contained and avoids broken root-relative image paths on the GitHub Pages `/SJA/` project site.
