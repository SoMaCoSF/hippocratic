# ManimGL Network Visualizations

Beautiful, interactive visualizations of the CA healthcare fraud network using ManimGL.

## Quick Start

### Installation

```bash
pip install manimgl
```

### Run Interactive Network (RECOMMENDED)

```bash
cd hippocratic/visualization
manimgl interactive_network.py FullyInteractiveNetwork
```

This opens an **interactive window** where you can:
- **Click nodes** to see their connections
- **Use number keys (1-9)** for quick selection
- **Arrow keys** to cycle through nodes
- **Press R** to reset view
- **Press SPACE** to toggle legend
- **Press Q** to quit

---

## Available Visualizations

### 1. **FullyInteractiveNetwork** (⭐ Best for Exploration)
```bash
manimgl interactive_network.py FullyInteractiveNetwork
```

**Features:**
- Click any node to see its connections
- Color-coded edges:
  - 🟡 **Amber**: Shared address
  - 🟣 **Purple**: Shared phone
  - 🔵 **Cyan**: Shared owner
  - 💗 **Pink**: Shared admin
- Financial data coloring:
  - 🟡 **Gold**: High revenue ($3M+)
  - 🟢 **Green**: Profitable
  - 🔴 **Red**: Losing money
  - 🔵 **Blue**: Neutral
- Info panel shows facility details and connection stats

### 2. **OSINTNetworkScene** (Animated Overview)
```bash
manimgl osint_network.py OSINTNetworkScene
```

Automated tour of the top clusters with statistics and analysis.

### 3. **ClusterZoomScene** (Deep Dive)
```bash
manimgl osint_network.py ClusterZoomScene
```

Detailed view of a single high-risk cluster.

### 4. **InteractiveNetworkScene** (Demo Mode)
```bash
manimgl osint_network.py InteractiveNetworkScene
```

Cycles through nodes automatically to demonstrate connections.

### 5. **ConnectionTypeScene** (Explainer)
```bash
manimgl osint_network.py ConnectionTypeScene
```

Explains the different types of suspicious connections.

---

## Controls Reference

### Interactive Mode Controls

| Key | Action |
|-----|--------|
| **Left Click** | Select node |
| **1-9** | Quick select first 9 nodes |
| **Arrow Keys** | Cycle through nodes (Up/Down or Left/Right) |
| **R** | Reset view / Deselect |
| **SPACE** | Toggle legend visibility |
| **Q** | Quit |
| **Scroll** | Zoom in/out |
| **Right Drag** | Rotate camera |

### ManimGL Built-in Controls

| Key | Action |
|-----|--------|
| **Mouse Drag** | Pan camera |
| **Ctrl+Drag** | Rotate 3D view |
| **S** | Save screenshot |
| **P** | Pause/Play animation |

---

## Rendering to Video

To render any scene to a video file:

```bash
manimgl interactive_network.py FullyInteractiveNetwork -o
```

The `-o` flag outputs to a video file (MP4).

**Output location:** `~/manimlib/` (default ManimGL output folder)

---

## Understanding the Visualization

### Node Colors (Financial Status)
- **🟡 Gold**: High revenue facilities ($3M+)
- **🟢 Green**: Profitable (positive net income)
- **🔴 Red**: Losing money (negative net income)
- **🔵 Blue**: Standard (neutral or no data)

### Edge Colors (Connection Types)
- **🟡 Amber**: Same physical address (suspicious!)
- **🟣 Purple**: Shared phone number (coordination?)
- **🔵 Cyan**: Same business owner (shell company?)
- **💗 Pink**: Same administrator (management fraud?)

### Cluster Statistics
- **Facilities**: Number of facilities in the cluster
- **Total Revenue**: Combined revenue of all facilities
- **Connections**: Number of suspicious connections

### Red Flags 🚩
Look for:
- **Multiple connection types** between facilities (fraud network)
- **High revenue + many connections** (organized fraud)
- **Same address + multiple facilities** (paper entities)
- **Dense clusters** (coordinated fraud ring)

---

## Data Sources

The visualization uses:
- **Facility data**: `web/public/data/all.min.json`
- **Cluster analysis**: `web/public/data/analysis/clusters.json`
- **Financial data**: `web/public/data/enrichment/state/CA/hcai_hhah_util_2024.csv`

---

## Customization

### Change Number of Nodes

Edit `interactive_network.py` line 82:
```python
facilities = cluster['facilities'][:30]  # Change 30 to any number
```

### Adjust Node Radius

Edit line 85:
```python
radius = 3.0  # Increase for larger circle
```

### Modify Colors

Edit the `COLORS` dictionary at the top:
```python
COLORS = {
    "address": "#f59e0b",  # Change to any hex color
    # ...
}
```

---

## Troubleshooting

### "Cluster data not found"
Make sure you're in the `hippocratic/visualization/` directory and the data files exist in `../web/public/data/analysis/`.

### ManimGL not found
Install ManimGL:
```bash
pip install manimgl
```

Or with all dependencies:
```bash
pip install manimgl numpy
```

### Slow performance
Reduce the number of nodes:
```python
facilities = cluster['facilities'][:15]  # Use fewer nodes
```

### Window not opening
Make sure you have OpenGL support. On Windows, you may need to update your graphics drivers.

---

## Tips for Investigation

1. **Start with high-revenue nodes** (gold) - most money involved
2. **Look for dense connection clusters** - coordinated fraud
3. **Track same-address connections** (amber) - paper entities
4. **Follow the money** - revenue + connections = fraud patterns
5. **Compare facility categories** - unusual business combinations

---

## Export for Analysis

To save a screenshot:
1. Run the visualization
2. Press **S** while viewing
3. Find the image in `~/manimlib/images/`

To render a video:
```bash
manimgl interactive_network.py FullyInteractiveNetwork -o
```

---

## Next Steps

- Add more financial metrics (profit margins, expense ratios)
- Implement time-series analysis (fraud over time)
- Add geographic clustering (map-based view)
- Export to network analysis tools (Gephi, NetworkX)

---

**Questions?** Check the main project README or contact the development team.
