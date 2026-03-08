# JHU Claude Skills

A collection of [Claude Code](https://claude.ai/claude-code) skills for Johns Hopkins University AI certificate coursework. Each skill automates a repeatable workflow so assignments stay consistent and polished without manual effort.

This repo will grow over time as new skills are added for different parts of the JHU program.

## Skills

| Skill | Description |
|-------|-------------|
| [jhu-notebook-styler](jhu-notebook-styler/) | Applies a three-tier blue color hierarchy to Jupyter notebook markdown headers for consistent, branded assignment submissions. |

---

### jhu-notebook-styler

**What it does:** Transforms the plain markdown headers in completed JHU Jupyter notebook assignments into a branded visual style using inline HTML color spans. The result is a consistent, polished look across every module submission without any manual HTML editing.

**Color system:**

| Header Level | Color | Hex | Purpose |
|--------------|-------|-----|---------|
| H1 | Dark blue | `#0444CD` | Major sections (Problem Statement, Data Overview, etc.) |
| H2 | Medium blue | `#2F70F9` | Sub-sections (Business Context, question headings, etc.) |
| H3 | Light blue (italic) | `#82A8F9` | Sub-sub-sections (feature names, analysis labels) |

**Expected behavior:**
- Wraps H1/H2 header text in `<span style="color:...">` tags
- Wraps H3 header text in `<em style="color:...">` tags (italic)
- Skips headers that are already styled (idempotent — safe to run repeatedly)
- Skips specific H3 patterns that serve as structural markers rather than section labels (e.g. `### Step 1:`, `### Note on ...`, numbered items like `### 1.`)
- Only modifies the first line of markdown cells that start with a header prefix
- Preserves all other cell content (body text, code, LaTeX, images) untouched

**Triggers when you say things like:**
- "Style this notebook" / "Apply JHU styling"
- "Format this for submission" / "Make it look polished"
- "Apply my style" / "Make it look like the others"
- Uploading a `.ipynb` and asking to "clean it up"

**How it works:** The skill includes a Python script ([scripts/style_notebook.py](jhu-notebook-styler/scripts/style_notebook.py)) that reads a `.ipynb` file, applies the color transformations, and writes the styled output. It reports how many cells were modified and produces zero changes on already-styled notebooks.

```bash
python3 jhu-notebook-styler/scripts/style_notebook.py input.ipynb [output.ipynb]
```

---

## Installation

Add this repository as a skill source in your Claude Code configuration so skills are available across projects.

In your `~/.claude/settings.json`:

```json
{
  "skills": [
    "/path/to/jhu-claude-skills/jhu-notebook-styler/SKILL.md"
  ]
}
```

Once installed, Claude Code will automatically detect when a skill applies based on your prompt.

## Repo Structure

```
jhu-claude-skills/
├── README.md
└── <skill-name>/
    ├── SKILL.md          # Skill definition (triggers, instructions)
    └── scripts/          # Supporting scripts, if any
```

Each skill lives in its own directory with a `SKILL.md` that tells Claude Code when and how to use it. As new skills are added, they'll follow this same convention and be documented in the table above.
