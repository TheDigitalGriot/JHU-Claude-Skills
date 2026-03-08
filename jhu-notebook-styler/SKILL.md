---
name: jhu-notebook-styler
description: Style completed JHU data science assignment Jupyter notebooks with Gavin's branded blue color hierarchy. Use this skill whenever the user asks to style a notebook, format a notebook for submission, apply JHU styling, pretty-print a notebook, or mentions making a notebook look polished/professional before turning it in. Also trigger when the user uploads a .ipynb file and asks to "clean it up", "make it look like the others", "apply my style", or references past assignment formatting. This skill applies a three-tier blue color system to markdown headers and ensures consistent visual branding across all module submissions.
---

# JHU Notebook Styler

Transforms completed Jupyter notebook assignments into Gavin's branded visual style — a three-tier blue color hierarchy applied to markdown headers that creates a polished, consistent look across all JHU AI certificate submissions.

## Why this exists

The JHU assignments come as template notebooks with plain markdown headers (`# **Title**`, `## Subtitle`, `### Detail`). After completing the assignment, Gavin applies a consistent color system that visually distinguishes section depth at a glance. This skill automates that transformation so every submission looks cohesive without manual HTML editing.

## The color system

The styling uses three shades of blue that darken with hierarchy level:

| Level | Color | Hex | HTML Pattern |
|-------|-------|-----|-------------|
| H1 (major sections) | Dark blue | `#0444CD` | `# <span style="color:#0444CD">**Title**</span>` |
| H2 (sub-sections) | Medium blue | `#2F70F9` | `## <span style="color:#2F70F9">Title</span>` |
| H3 (sub-sub-sections) | Light blue | `#82A8F9` | `### <em style="color:#82A8F9">Title</em>` |

Key details:
- H1 and H2 preserve whatever bold/non-bold formatting the template used
- H3 headers are wrapped in `<em>` (italic) rather than `<span>` — this is intentional and matches Gavin's established style
- Headers that already contain `<span>`, `<em>`, or `<font>` tags are left untouched (idempotent)

## What gets styled vs. what doesn't

**Always styled:**
- All `# ` headers (H1) — these are major sections like "Problem Statement", "Data Overview", "Hypothesis Testing"
- All `## ` headers (H2) — sub-sections like "Business Context", "Univariate Analysis", question headings

**Styled by default (H3), except for specific patterns:**
- Feature engineering sub-headers like "Season", "Airport Traffic" → styled
- `### Step N:` headers in hypothesis testing → NOT styled (these are procedural steps, not section labels)
- `### Correlation Analysis`, `### Note on Outliers` → NOT styled (structural sub-headers)
- `### N.` numbered items → NOT styled

This distinction matters because the hypothesis testing sections use `### Step 1:`, `### Step 4:`, etc. as structural markers within a single analysis flow. Styling them the same as section headers would create visual confusion.

## How to use

### Step 1: Run the styling script

The script lives at `scripts/style_notebook.py` relative to this skill. Run it against the completed notebook:

```bash
python3 /path/to/jhu-notebook-styler/scripts/style_notebook.py input.ipynb output.ipynb
```

If no output path is provided, it writes to `input_styled.ipynb`.

### Step 2: Verify the output

After running, the script reports how many cells were modified. Check:
- H1 headers should show dark blue `#0444CD`
- H2 headers should show medium blue `#2F70F9`  
- H3 headers (where appropriate) should show light blue italic `#82A8F9`
- Running the script again on the output should report "Styled 0 cells" (idempotent)

### Step 3: Optional — Pretty Jupyter export

For extra polish when sharing outside of the standard submission, Gavin can export using pretty-jupyter:

```bash
pip install pretty-jupyter
jupyter nbconvert --to html --template pj styled_notebook.ipynb
```

This adds a table of contents, code folding, and tabbed sections to the HTML output.

## Complete workflow example

```bash
# Copy the completed notebook
cp assignment_completed.ipynb assignment_final.ipynb

# Apply styling
python3 scripts/style_notebook.py assignment_final.ipynb

# Verify idempotency
python3 scripts/style_notebook.py assignment_final_styled.ipynb
# Should report: "Styled 0 cells"
```

## Adding new H3 skip patterns

If a future assignment introduces new structural H3 headers that shouldn't be styled (like `### Step N:` in hypothesis testing), add a regex pattern to the `H3_SKIP_PATTERNS` list in `scripts/style_notebook.py`. The current skip patterns are:

- `### Step N:` — hypothesis testing procedural steps
- `### Note on ...` — explanatory notes
- `### Correlation Analysis` — structural sub-headers
- `### N.` — numbered items

## Edge cases

- **Mixed case headers**: The script matches on the exact prefix (`# `, `## `, `### `) so it won't accidentally style H4 or deeper headers.
- **Already-styled notebooks**: Safe to run multiple times — detects existing HTML tags and skips.
- **Template notebooks with no code**: Works on empty templates too — just styles the headers.
- **Notebooks with custom markdown**: Only modifies the first line of markdown cells that are headers. All other content (body text, tables, LaTeX, images) is preserved exactly.
