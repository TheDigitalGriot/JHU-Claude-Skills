#!/usr/bin/env python3
"""
JHU Assignment Notebook Styler
Transforms plain markdown headers in completed Jupyter notebooks into
Gavin's branded blue color hierarchy styling system.

Color System:
  H1 (#0444CD dark blue)  → Major sections
  H2 (#2F70F9 medium blue) → Sub-sections  
  H3 (#82A8F9 light blue)  → Sub-sub-sections (italic via <em>)

Usage:
  python style_notebook.py input.ipynb [output.ipynb]
  
If no output path is given, writes to input_styled.ipynb
"""

import json
import re
import sys
import os
from copy import deepcopy


# ── Color constants ──────────────────────────────────────────────────
H1_COLOR = "#0444CD"  # Dark blue — major sections
H2_COLOR = "#2F70F9"  # Medium blue — sub-sections
H3_COLOR = "#82A8F9"  # Light blue — sub-sub-sections


# ── H3 headers that should NOT be styled ─────────────────────────────
# Hypothesis testing step headers and other structural headers that
# follow a different convention in the JHU assignment format.
H3_SKIP_PATTERNS = [
    r"^###\s+Step\s+\d+",            # "### Step 1: ..."
    r"^###\s+Note\s+on\b",           # "### Note on Outliers"
    r"^###\s+Correlation\s+Analysis", # Structural sub-header
    r"^###\s+\d+\.",                  # Numbered questions "### 1. ..."
]


def is_already_styled(line: str) -> bool:
    """Check if a header line already contains HTML styling."""
    return any(tag in line for tag in ["<span", "<em ", "<font"])


def should_skip_h3(line: str) -> bool:
    """Check if an H3 header matches a pattern that should remain unstyled."""
    for pattern in H3_SKIP_PATTERNS:
        if re.match(pattern, line.strip()):
            return True
    return False


def extract_header_content(line: str, prefix: str) -> str:
    """Extract the text content after the markdown header prefix.
    
    Examples:
        '# **Problem Statement**' → '**Problem Statement**'
        '## Data Preprocessing'   → 'Data Preprocessing'
    """
    return line[len(prefix):].strip()


def style_h1(content: str) -> str:
    """Wrap H1 content in dark blue span."""
    return f'# <span style="color:{H1_COLOR}">{content}</span>'


def style_h2(content: str) -> str:
    """Wrap H2 content in medium blue span."""
    return f'## <span style="color:{H2_COLOR}">{content}</span>'


def style_h3(content: str) -> str:
    """Wrap H3 content in light blue italic em tag."""
    # Remove existing bold/italic markers for the em wrap since <em> provides italic
    inner = content.strip("*_ ")
    return f'### <em style="color:{H3_COLOR}">{inner}</em>'


def style_markdown_cell(source_lines: list[str]) -> list[str]:
    """Apply color styling to markdown header lines.
    
    Only modifies the FIRST line of a cell if it's a header.
    Preserves all other content unchanged.
    """
    if not source_lines:
        return source_lines

    # Work with joined source then re-split to handle both
    # list-of-lines and single-string formats
    first_line = source_lines[0].rstrip("\n")

    # Skip already-styled headers
    if is_already_styled(first_line):
        return source_lines

    styled = None

    # H1: lines starting with exactly '# '
    if re.match(r"^# (?!#)", first_line):
        content = extract_header_content(first_line, "# ")
        if content:
            styled = style_h1(content)

    # H2: lines starting with exactly '## '
    elif re.match(r"^## (?!#)", first_line):
        content = extract_header_content(first_line, "## ")
        if content:
            styled = style_h2(content)

    # H3: lines starting with exactly '### '
    elif re.match(r"^### (?!#)", first_line):
        if not should_skip_h3(first_line):
            content = extract_header_content(first_line, "### ")
            if content:
                styled = style_h3(content)

    if styled is not None:
        result = list(source_lines)
        # Preserve trailing newline if present
        trailing = "\n" if source_lines[0].endswith("\n") else ""
        result[0] = styled + trailing
        return result

    return source_lines


def style_notebook(nb: dict) -> dict:
    """Apply styling transformations to all cells in a notebook."""
    nb = deepcopy(nb)

    for cell in nb["cells"]:
        if cell["cell_type"] == "markdown":
            cell["source"] = style_markdown_cell(cell["source"])

    return nb


def main():
    if len(sys.argv) < 2:
        print("Usage: python style_notebook.py input.ipynb [output.ipynb]")
        sys.exit(1)

    input_path = sys.argv[1]
    
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_styled{ext}"

    with open(input_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    styled_nb = style_notebook(nb)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(styled_nb, f, indent=1, ensure_ascii=False)

    # Report changes
    original_cells = nb["cells"]
    styled_cells = styled_nb["cells"]
    changed = 0
    for orig, new in zip(original_cells, styled_cells):
        if orig["source"] != new["source"]:
            changed += 1

    print(f"Styled {changed} cells → {output_path}")


if __name__ == "__main__":
    main()
