# Official College & Department Branding Assets

## Asset Files & Specifications
- **Transparent Official Logo**: `client/public/assets/branding/college-logo.png` (32-bit ARGB PNG with solid white background removed and anti-aliased edge un-premultiplication)
- **Original Source File**: `client/public/assets/branding/college-logo-raw.png` (Exact file supplied from `C:\Users\shaik\Downloads\ed project file\college logo.png`)

## Current Status (UI Phase 1)
- **Status**: Official institutional asset successfully integrated.
- **Background Removal**: The solid white canvas background has been cleanly extracted into transparency so the logo blends natively into the website UI backgrounds:
  - 60% Sage Fog (`#D7DCCF`) in HOD Admin Theme
  - 60% Almond Milk (`#E8E0CF`) in Student Portal Theme
  - 30% Claret Wine (`#4A192B`) / Dusty Teal (`#7FA8A1`) on floating navigation pills
  - Translucent glassmorphic surfaces (`backdrop-blur-md`)
- **Component**: `CollegeLogo.jsx` and `CollegeBrandHeader.jsx` directly load and render this transparent asset across all portal headers and previews.
