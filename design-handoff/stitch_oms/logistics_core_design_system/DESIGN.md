---
name: Logistics Core Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dde9ff'
  surface-container-highest: '#d5e3fd'
  on-surface: '#0d1c2f'
  on-surface-variant: '#444651'
  inverse-surface: '#233144'
  inverse-on-surface: '#ebf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#272b2d'
  on-tertiary: '#ffffff'
  tertiary-container: '#3d4143'
  on-tertiary-container: '#aaadaf'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0d1c2f'
  surface-variant: '#d5e3fd'
typography:
  display-lg:
    fontFamily: Noto Sans KR
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Noto Sans KR
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Noto Sans KR
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Noto Sans KR
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Noto Sans KR
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  caption:
    fontFamily: Noto Sans KR
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  sidebar_width: 260px
  header_height: 64px
  container_gutter: 24px
  table_cell_padding: 12px 16px
  stack_gap_sm: 8px
  stack_gap_md: 16px
  stack_gap_lg: 24px
---

## Brand & Style

This design system is engineered for high-efficiency logistics operations and Order Management Systems (OMS). The brand personality is rooted in reliability, precision, and institutional trust. It prioritizes functional density over decorative elements to ensure that administrators can process large volumes of data without visual fatigue.

The design style follows a **Corporate / Modern** approach with a focus on high information density. It utilizes a systematic grid, clear tonal layering, and subtle interactive states. The interface is designed to feel like a powerful tool—unobtrusive when things are running smoothly, but highly communicative when errors or exceptions require immediate human intervention.

**Target Audience:** Logistics managers, warehouse operators, and back-office administrators.
**Emotional Response:** Confidence, clarity, speed, and professional stability.

## Colors

The color palette is anchored by a professional Navy (#1e3a8a) to represent authority and stability. The foundation of the UI uses a Neutral/Gray scale to create a "low-noise" environment where data remains the primary focus.

- **Primary:** Used for primary actions, active navigation states, and key progress indicators.
- **Surface & Backgrounds:** We use a tiered gray system. The main background is a very light gray (#f8fafc), while containers and cards use pure White (#ffffff) to create subtle separation.
- **Semantic Status:** Critical for logistics. Status colors must be vibrant and highly legible against both light and dark text. Success (Delivery Complete), Error (Failed Shipment), Warning (Inventory Low), and Info (In Transit) are clearly differentiated to allow for rapid scanning of data tables.

## Typography

The typography system utilizes **Noto Sans KR** for its exceptional legibility in dense Korean UI environments. For technical data—such as Tracking IDs, SKU numbers, and Barcodes—**JetBrains Mono** is employed to ensure character distinction (e.g., distinguishing '0' from 'O').

- **Hierarchy:** Use bold weights sparingly to highlight critical status or navigation headings.
- **Density:** Body text is set at 14px for standard reading and 13px for data-heavy tables to maximize the number of rows visible on a single screen.
- **Mono Usage:** Any field containing alphanumeric identifiers must use the `label-mono` style to prevent transcription errors.

## Layout & Spacing

The layout follows a **Fixed-Fluid hybrid model** designed for professional widescreen monitors (1920x1080).

- **Navigation:** A fixed-width left sidebar (260px) houses the primary Korean navigation menu. It can be collapsed to an icon-only state to increase the workspace.
- **Main Content:** The area utilizes a fluid grid with a 24px outer margin. Inside this area, data cards and tables expand to fill the width.
- **Grid Strategy:** We utilize an 8px spacing system. For high-density views (like the OMS Order List), this can be reduced to 4px for tight element groupings.
- **Breakpoints:** While primarily desktop-first, the layout reflows at 1280px (standard laptop) and 768px (tablet for warehouse floor checks), where the sidebar moves to a hidden drawer.

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows to maintain a clean, professional aesthetic.

1.  **Level 0 (Base):** Background (#f8fafc). No elevation.
2.  **Level 1 (Cards/Tables):** Pure white background with a 1px border (#e2e8f0). This is the primary surface for all data.
3.  **Level 2 (Dropdowns/Modals):** Small, crisp ambient shadows (Offset: 0, 4px; Blur: 12px; Opacity: 0.05) are used only for temporary overlay elements to separate them from the content beneath.
4.  **Level 3 (Alerts):** High-contrast color fills for critical banners to ensure they sit at the top of the visual stack.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a modern, professional feel while maintaining the structural rigor of a grid-based tool.

- **Buttons & Inputs:** Use a 4px (0.25rem) radius.
- **Status Badges:** Use a full pill-shape (100px) to distinguish them clearly from interactive buttons.
- **Metric Cards:** Use an 8px (0.5rem) radius to soften the main dashboard containers.
- **Selection States:** Row highlights in tables use a 0px radius to ensure the highlight spans the full width of the grid line.

## Components

### Data Tables
Tables are the core of this design system.
- **Header:** Sticky headers with #f1f5f9 background and 600-weight text.
- **Rows:** Alternating zebra stripes or subtle hover states (#f8fafc) for tracking.
- **Density:** Provide a "Density Toggle" (Compact/Comfortable) to allow users to adjust row heights.

### Status Badges (태그/배지)
- **Success:** Light green background with dark green text.
- **Error:** Light red background with dark red text.
- **Warning:** Light amber background with dark brown text.
- Always include a small 6px dot icon next to the text for accessibility.

### Metric Cards
Dashboard cards displaying KPIs (e.g., "오늘의 주문량"). 
- Large `display-lg` numbers in Primary Navy.
- Small sparkline graphs for 24h trends.

### Input Fields & Steppers
- **Inputs:** 1px border (#cbd5e1). Active state uses a 2px Primary Navy border.
- **Steppers:** Used for shipment progress (결제완료 > 상품준비중 > 배송중 > 배송완료). Completed steps use Primary Navy; pending steps use Light Gray.

### Side Navigation
- **Labels:** 14px Medium weight.
- **Active State:** Left-side 4px vertical bar in Primary Navy with a subtle blue tint background for the entire row.

### Code Cells (ID/바코드)
Alphanumeric identifiers should be wrapped in a subtle gray background box with `label-mono` typography to indicate they are "Copy-on-click" elements.