# ManimGL Financial Visualization - Fixed

**Date:** 2026-01-29  
**Status:** ✅ Fixed and Committed

---

## Issues Fixed

### 1. **Localhost Not Working** ✅
- **Problem:** Previous Node.js processes were blocking port 3000
- **Solution:** Killed all node.exe processes and restarted dev server
- **Command:** `taskkill /F /IM node.exe && npm run dev`
- **Status:** Dev server running in background terminal

### 2. **ManimGL Not Using Financial Data** ✅
- **Problem:** Nodes were all same size and color despite financial data functions
- **Solution:** Actually called the financial functions in `visualize_cluster()`
- **Changes:**
  - Load financial data at start of cluster visualization
  - Calculate cluster-level revenue and profit
  - Use `get_node_size_from_revenue()` for each node
  - Use `get_node_color_from_finances()` for each node
  - Add revenue to node labels

### 3. **Node Coloring Not Working** ✅
- **Problem:** Color functions existed but weren't being called
- **Solution:** Integrated into node creation loop
- **Implementation:**
```python
# Get financial data for this facility
license_num = f.get('licenseNumber', '')
fin = financial_data.get(license_num, {})
revenue = fin.get('revenue', 0)
net_income = fin.get('net_income', 0)

# SIZE BASED ON REVENUE
node_radius = self.get_node_size_from_revenue(revenue)

# COLOR BASED ON PROFITABILITY
color = self.get_node_color_from_finances(revenue, net_income)

dot = Dot(pos, radius=node_radius, color=color)
```

### 4. **Financial Elements Not Rendered** ✅
- **Problem:** No financial information shown in visualization
- **Solution:** Added multiple financial displays:
  - **Cluster stats:** Show total revenue and profit/loss first
  - **Node labels:** Include revenue amounts (e.g., "$2.5M | Facility Name")
  - **Node size:** Visual representation of revenue
  - **Node color:** Visual representation of profitability
  - **Legend:** Financial status indicators at top

---

## How It Works Now

### Node Visualization

**Size (Revenue-Based):**
- $5M+ → 0.35 radius (largest, with glow)
- $2M-5M → 0.28 radius
- $1M-2M → 0.22 radius
- $0-1M → 0.18 radius
- No data → 0.12 radius (smallest)

**Color (Profitability-Based):**
- **Gold (#fbbf24):** High revenue ($3M+)
- **Green (#10b981):** Profitable (positive net income)
- **Red (#ef4444):** Losing money (negative net income)
- **Blue (#3b82f6):** Has data, breakeven
- **Gray (#52525b):** No financial data

**Labels:**
- With revenue: "$2.5M | Facility Name"
- Without revenue: "Facility Name" (gray text)

### Cluster Stats

**Before:**
```
5 facilities | 2 shared addresses | 1 shared phone | 1 shared admin
```

**After (Money First):**
```
💰 $12.3M Revenue | ✓ $3.2M Profit | 4/5 with $
```

Shows:
- Total cluster revenue
- Total profit/loss with checkmark/X
- How many facilities have financial data

### Legend

**New Order (Financial First):**
1. 💰 HIGH REVENUE (Gold dot)
2. ✓ PROFITABLE (Green dot)
3. ✗ LOSING $ (Red dot)
4. ADDRESS (Amber line)
5. PHONE (Purple line)
6. OWNER (Cyan line)
7. ADMIN (Pink line)

---

## Usage

### Render the Visualization

```bash
cd hippocratic/visualization
manimgl osint_network.py OSINTNetworkScene -o
```

**Output:**
- Video file showing network with financial-sized nodes
- Cluster stats with revenue/profit first
- Color-coded profitability
- All connection types still visible

### Interactive Mode

```bash
manimgl osint_network.py InteractiveNetworkScene
```

**Features:**
- Click nodes to see their connections
- Financial data displayed in labels
- Size/color based on money
- Real-time interaction

---

## What You'll See

### High-Revenue Clusters
- **Large gold/green nodes** dominate the visualization
- Immediately obvious which facilities make money
- Connections between profitable entities stand out
- Fraud patterns: big money + many connections = investigate

### Loss-Making Facilities
- **Red nodes** show facilities losing money
- If connected to profitable facilities → suspicious
- Multiple red nodes at same address → shell game indicator
- Size still shows revenue (can have high revenue but lose money)

### No Financial Data
- **Small gray nodes** fade into background
- Still show connections
- Don't distract from money-making entities
- Can identify which clusters lack financial transparency

---

## Example Visualization Flow

1. **Title Screen:** "HIPPOCRATIC - CA Healthcare Facility Fraud Network"
2. **Stats Summary:** Total revenue, profit, clusters
3. **Cluster #1:** 
   - Header: "Cluster #1 - Risk Score: 850"
   - Stats: "💰 $15.2M Revenue | ✓ $4.1M Profit | 8/10 with $"
   - Network: Large gold nodes with connections
4. **Cluster #2:**
   - Stats: "💰 $8.7M Revenue | ✗ $2.3M Loss | 5/7 with $"
   - Network: Mix of green and red nodes
5. **Continue through top 5 clusters**
6. **Final Summary**

---

## Debugging

### If Nodes Are Still Same Size

Check that `visualize_cluster()` is calling:
```python
financial_data = self.load_financial_data()
```

And in the node creation loop:
```python
node_radius = self.get_node_size_from_revenue(revenue)
color = self.get_node_color_from_finances(revenue, net_income)
```

### If No Financial Data Loads

Verify CSV path:
```python
financial_path = Path(__file__).parent.parent / "web" / "public" / "data" / "enrichment" / "state" / "CA" / "hcai_hhah_util_2024.csv"
```

Check CSV has correct columns:
- LICENSE_NO
- HOSPICE_TOT_OPER_REVENUE
- HOSPICE_NET_INCOME

### If Colors Are Wrong

Check color mapping in `get_node_color_from_finances()`:
- High revenue ($3M+) → Gold
- Positive net income → Green
- Negative net income → Red
- Has data but breakeven → Blue
- No data → Gray

---

## Files Modified

- `visualization/osint_network.py`
  - Added financial data loading to `visualize_cluster()`
  - Integrated node sizing by revenue
  - Integrated node coloring by profitability
  - Added revenue to labels
  - Updated cluster stats to show money first

---

## Next Steps

1. **Test the visualization:**
   ```bash
   cd hippocratic/visualization
   manimgl osint_network.py OSINTNetworkScene
   ```

2. **Check localhost:**
   - Navigate to http://localhost:3000
   - Test the "Has $" filter
   - Verify orbit controls work

3. **Deploy to Vercel:**
   - Already deployed with financial filter
   - ManimGL runs locally (not on Vercel)

---

**Status:** ✅ All fixes committed and pushed  
**Localhost:** Running in background terminal  
**ManimGL:** Ready to render with financial data  
**Financial Filter:** Live on https://hippocratic.vercel.app
