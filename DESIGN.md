---
name: Modern Botanical Zen
colors:
  surface: '#fbf9f3'
  surface-dim: '#dcdad4'
  surface-bright: '#fbf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ed'
  surface-container: '#f0eee8'
  surface-container-high: '#eae8e2'
  surface-container-highest: '#e4e2dc'
  on-surface: '#1b1c18'
  on-surface-variant: '#424844'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f3f1eb'
  outline: '#727973'
  outline-variant: '#c2c8c2'
  surface-tint: '#496455'
  primary: '#173124'
  on-primary: '#ffffff'
  primary-container: '#2d4739'
  on-primary-container: '#98b5a3'
  inverse-primary: '#b0cdbb'
  secondary: '#94492c'
  on-secondary: '#ffffff'
  secondary-container: '#fe9d7a'
  on-secondary-container: '#773318'
  tertiary: '#113211'
  on-tertiary: '#ffffff'
  tertiary-container: '#284925'
  on-tertiary-container: '#92b88a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ccead6'
  primary-fixed-dim: '#b0cdbb'
  on-primary-fixed: '#062014'
  on-primary-fixed-variant: '#324c3e'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ffb59b'
  on-secondary-fixed: '#380d00'
  on-secondary-fixed-variant: '#763217'
  tertiary-fixed: '#c5edbb'
  tertiary-fixed-dim: '#aad1a1'
  on-tertiary-fixed: '#012103'
  on-tertiary-fixed-variant: '#2d4e2a'
  background: '#fbf9f3'
  on-background: '#1b1c18'
  surface-variant: '#e4e2dc'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  data-display:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '300'
    lineHeight: '1.0'
    letterSpacing: -0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-desktop: 48px
  container-padding-mobile: 24px
  gutter: 32px
  section-gap: 80px
---

## Brand & Style
The design system embodies a "Zen Tech" philosophy, merging high-end IoT precision with the tranquil, tactile feel of a botanical journal. It targets sophisticated homeowners and professional horticulturalists who value both data accuracy and aesthetic harmony.

The UI style is a blend of **Minimalism** and **Glassmorphism**, emphasizing negative space (shibumi) to prevent information overload. It utilizes soft, organic layers and translucent surfaces to mimic the dappled light of a forest canopy. The emotional response should be one of "Stillness"—reducing the anxiety often associated with complex dashboards through natural textures, rhythmic spacing, and a palette rooted in the earth.

## Colors
The palette is divided into two distinct modes to reflect the circadian rhythm of a garden.

**Light Mode (Parchment & Clay):**
- **Primary:** Deep Forest Green (#2D4739) for high-contrast text and primary actions.
- **Secondary:** Warm Terra Cotta (#D67D5C) for specialized notifications and seasonal highlights.
- **Backgrounds:** Soft Parchment (#F8F7F3) and Light Clay (#EFEDE7) for container differentiation.

**Dark Mode (Moss & Obsidian):**
- **Primary:** Vibrant Sage (#8EB486) to ensure legibility against dark backgrounds.
- **Secondary:** Soft Amber (#E8A85D) for data indicators and low-light alerts.
- **Backgrounds:** Deep Moss (#1A1F1C) and Obsidian (#121513).

Avoid any standard "SaaS Blue." All status indicators should use forest-derived hues: Sage for success, Terra Cotta for warnings, and Amber for attention.

## Typography
The typographic hierarchy creates a dialogue between tradition and technology. **Playfair Display** provides an editorial, "botanical journal" feel for headings, while **Geist** offers a hyper-legible, technical contrast for data points and sensor readings.

- **Headlines:** Should feel expansive. Use Playfair Display with generous leading.
- **Body:** Use Geist for all descriptive text and instructions to maintain a clean, modern edge.
- **Data:** For numerical sensor outputs (e.g., pH levels, humidity), use the `data-display` style with Geist in a light weight to emphasize precision without visual bulk.
- **Labels:** Small caps or tracking-heavy uppercase Geist should be used for metadata to distinguish it from narrative content.

## Layout & Spacing
The layout rejects the rigid, boxy constraints of traditional dashboards in favor of an **organic, non-linear grid**.

- **Rhythm:** Utilize a 12-column grid but break it frequently with offset elements and asymmetrical card widths to mimic natural growth patterns.
- **Whitespace:** Spacing is intentional and generous. Use the `section-gap` (80px) between major functional areas to ensure the UI "breathes."
- **Adaptation:** On mobile, stack components vertically but maintain large internal paddings (24px) within cards to preserve the premium feel. 
- **Margins:** External margins should be wide, framing the content like a photograph in a gallery.

## Elevation & Depth
Depth is achieved through environmental layers rather than harsh shadows.

- **Surface Strategy:** Use Tonal Layers for primary organization. Elements resting on the parchment background use a slightly darker clay color or a translucent white-glass effect.
- **Shadows:** Use "Ambient Shadows"—extremely soft, long-range blurs (30px-60px) with very low opacity (5-8%) tinted with the Primary Green color. This creates a "floating" effect rather than a "stuck-on" effect.
- **Glassmorphism:** Overlays, navigation bars, and floating controls must use a 12px-20px backdrop-blur with 60% opacity. This allows the organic colors of the garden data to bleed through the interface subtly.

## Shapes
Shapes are unapologetically organic and soft. 

- **Radius:** A base radius of 24px (`rounded-xl`) is the standard for cards and containers. Small buttons use a full pill-shape.
- **Icons:** Use thin-stroke (1px to 1.5px) icons. Icon terminals should be rounded to match the typography's softness.
- **Masking:** When using images of plants or soil, apply soft-leaf masks or organic "blob" shapes rather than perfect circles or rectangles.

## Components
- **Primary Buttons:** Full pill-shaped, using the Deep Forest Green in light mode. Interaction states should involve a slight scale-up (1.02x) rather than a harsh color change.
- **Sensor Cards:** Large-format containers with a 24px radius. They should feature a prominent `data-display` value and a subtle background sparkline reflecting the last 24 hours of data.
- **Glass Overlays:** Used for modals and settings drawers. They must feature a thin 1px border in a lighter shade of the background to define the edge against the blur.
- **Toggle Switches:** Soft, rounded tracks. When active, the "thumb" should glow slightly with the secondary Terra Cotta or Sage color.
- **Input Fields:** Minimalist. Only a bottom border in the Neutral shade until focused, at which point a soft clay-colored background fill fades in.