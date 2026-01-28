#!/usr/bin/env python3
"""
CA Healthcare Facility Ownership Network Analysis
==================================================
Builds a network graph linking facilities through shared attributes:
- Owner/Business Name
- Contact Email (Administrator)
- Phone Number
- Address

Includes financial data analysis for fraud detection.
Detects clusters of potential fraud/duplicate facilities using connected components.
"""

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import networkx as nx
import numpy as np

# Configuration
BASE_PATH = Path(__file__).parent.parent
DATA_PATH = BASE_PATH / "web/public/data/state/CA/all.min.json"
FINANCIAL_CSV = BASE_PATH / "data/enrichment/state/CA/hcai_hhah_util_2024.csv"
JOIN_KEYS_CSV = BASE_PATH / "data/enrichment/state/CA/hha_hospice_join_keys.csv"
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# Node colors by type
COLORS = {
    "facility": "#3b82f6",      # blue
    "owner": "#06b6d4",         # cyan
    "admin": "#ec4899",         # pink
    "phone": "#a855f7",         # purple
    "address": "#f59e0b",       # amber
    "highlight": "#ef4444",     # red (for suspicious clusters)
    "high_revenue": "#22c55e",  # green (high revenue)
}


def normalize_phone(phone: str | None) -> str | None:
    """Normalize phone number to digits only."""
    if not phone:
        return None
    digits = re.sub(r"[^0-9]", "", str(phone))
    return digits if len(digits) >= 10 else None


def normalize_address(address: str | None, city: str | None, zip_code: str | None) -> str | None:
    """Create normalized address key."""
    parts = []
    if address:
        parts.append(str(address).lower().strip())
    if city:
        parts.append(str(city).lower().strip())
    if zip_code:
        parts.append(str(zip_code).strip()[:5])
    return "|".join(parts) if parts else None


def normalize_text(text: str | None) -> str | None:
    """Normalize text for comparison."""
    if not text:
        return None
    normalized = str(text).lower().strip()
    return normalized if len(normalized) > 2 else None


def parse_int(val: str | None) -> int | None:
    """Parse integer from string, handling empty/invalid values."""
    if not val or not str(val).strip():
        return None
    try:
        return int(str(val).replace(",", "").strip())
    except ValueError:
        return None


def load_financial_data(path: Path) -> dict:
    """Load financial data from CSV, indexed by license number and facility number."""
    print(f"Loading financial data from {path}...")

    financial = {}
    if not path.exists():
        print(f"  Warning: Financial data file not found")
        return financial

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fac_no = row.get("FAC_NO", "").strip()
            license_no = row.get("LICENSE_NO", "").strip()

            data = {
                "fac_no": fac_no,
                "fac_name": row.get("FAC_NAME", ""),
                "license_no": license_no,
                "license_status": row.get("LICENSE_STATUS", ""),
                "category": row.get("LIC_CAT", ""),
                "licensee_type": row.get("HHAH_LICEE_TOC", ""),
                "medi_cal_visits": parse_int(row.get("HHAH_MEDI_CAL_VISITS")),
                "medicare_visits": parse_int(row.get("HHAH_MEDICARE_VISITS")),
                "hospice_medi_cal_patients": parse_int(row.get("HOSPICE_PATS_PAID_BY_MEDI_CAL")),
                "hospice_medicare_patients": parse_int(row.get("HOSPICE_PATS_PAID_BY_MEDICARE")),
                "hospice_medi_cal_revenue": parse_int(row.get("HOSPICE_MEDI_CAL_REVENUE")),
                "hospice_medicare_revenue": parse_int(row.get("HOSPICE_MEDICARE_REVENUE")),
                "total_revenue": parse_int(row.get("HOSPICE_TOT_OPER_REVENUE")),
                "net_income": parse_int(row.get("HOSPICE_NET_INCOME")),
            }

            # Index by both facility number and license number
            if fac_no:
                financial[f"fac:{fac_no}"] = data
            if license_no:
                financial[f"lic:{license_no}"] = data

    print(f"  Loaded {len(financial) // 2} financial records")
    return financial


def load_facilities(path: Path) -> list[dict]:
    """Load facility data from JSON file."""
    print(f"Loading facility data from {path}...")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    records = data.get("records", [])
    print(f"  Loaded {len(records)} facilities")
    return records


def get_financial_for_facility(facility: dict, financial_data: dict) -> dict | None:
    """Get financial data for a facility by matching on ID or license number."""
    fac_id = facility.get("id")
    license_no = facility.get("licenseNumber")

    if fac_id and f"fac:{fac_id}" in financial_data:
        return financial_data[f"fac:{fac_id}"]
    if license_no and f"lic:{license_no}" in financial_data:
        return financial_data[f"lic:{license_no}"]
    return None


def build_network(facilities: list[dict], financial_data: dict) -> nx.Graph:
    """
    Build network graph from facility data with financial information.
    """
    G = nx.Graph()

    # Track attribute -> facility mappings
    owner_facilities = defaultdict(set)
    admin_facilities = defaultdict(set)
    phone_facilities = defaultdict(set)
    address_facilities = defaultdict(set)

    # Financial statistics
    total_revenue_sum = 0
    facilities_with_revenue = 0

    print("Building network graph...")

    for f in facilities:
        fac_id = f.get("id")
        if not fac_id:
            continue

        # Get financial data
        fin = get_financial_for_facility(f, financial_data)
        revenue = fin.get("total_revenue") if fin else None
        net_income = fin.get("net_income") if fin else None
        visits = None
        if fin:
            mc_visits = fin.get("medi_cal_visits") or 0
            medicare_visits = fin.get("medicare_visits") or 0
            visits = mc_visits + medicare_visits if (mc_visits or medicare_visits) else None

        if revenue:
            total_revenue_sum += revenue
            facilities_with_revenue += 1

        # Add facility node with financial data
        G.add_node(
            f"fac:{fac_id}",
            node_type="facility",
            name=f.get("name", "Unknown"),
            category=f.get("categoryName", ""),
            in_service=f.get("inService", False),
            revenue=revenue,
            net_income=net_income,
            visits=visits,
            has_financial=fin is not None,
        )

        # Owner connection
        owner = normalize_text(f.get("businessName"))
        if owner:
            owner_node = f"owner:{owner}"
            if owner_node not in G:
                G.add_node(owner_node, node_type="owner", name=owner)
            G.add_edge(f"fac:{fac_id}", owner_node, edge_type="owner")
            owner_facilities[owner].add(fac_id)

        # Admin connection
        admin = normalize_text(f.get("contactEmail"))
        if admin and "@" in admin:
            admin_node = f"admin:{admin}"
            if admin_node not in G:
                G.add_node(admin_node, node_type="admin", name=admin)
            G.add_edge(f"fac:{fac_id}", admin_node, edge_type="admin")
            admin_facilities[admin].add(fac_id)

        # Phone connection
        phone = normalize_phone(f.get("phone"))
        if phone:
            phone_node = f"phone:{phone}"
            if phone_node not in G:
                G.add_node(phone_node, node_type="phone", name=phone)
            G.add_edge(f"fac:{fac_id}", phone_node, edge_type="phone")
            phone_facilities[phone].add(fac_id)

        # Address connection
        addr = normalize_address(f.get("address"), f.get("city"), f.get("zip"))
        if addr:
            addr_node = f"addr:{addr}"
            if addr_node not in G:
                G.add_node(addr_node, node_type="address", name=addr)
            G.add_edge(f"fac:{fac_id}", addr_node, edge_type="address")
            address_facilities[addr].add(fac_id)

    print(f"  Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
    print(f"  Financial data: {facilities_with_revenue} facilities with revenue data")
    if facilities_with_revenue > 0:
        print(f"  Total revenue tracked: ${total_revenue_sum:,.0f}")
        print(f"  Average revenue: ${total_revenue_sum / facilities_with_revenue:,.0f}")

    # Print sharing statistics
    def count_shared(d, name):
        shared = {k: v for k, v in d.items() if len(v) > 1}
        total_facs = sum(len(v) for v in shared.values())
        print(f"  {name}: {len(shared)} shared values linking {total_facs} facilities")
        return shared

    print("\nShared attribute statistics:")
    count_shared(owner_facilities, "Owners")
    count_shared(admin_facilities, "Admins")
    count_shared(phone_facilities, "Phones")
    count_shared(address_facilities, "Addresses")

    return G


def analyze_components(G: nx.Graph) -> list[set]:
    """Analyze connected components to find potential fraud clusters."""
    components = list(nx.connected_components(G))
    components.sort(key=len, reverse=True)

    print(f"\nFound {len(components)} connected components")

    sizes = [len(c) for c in components]
    print(f"  Sizes: min={min(sizes)}, max={max(sizes)}, avg={np.mean(sizes):.1f}")

    # Find suspicious clusters (multiple facilities connected)
    suspicious = [c for c in components if len([n for n in c if n.startswith("fac:")]) >= 3]
    print(f"  Suspicious clusters (3+ facilities): {len(suspicious)}")

    return components


def compute_fraud_scores(G: nx.Graph, components: list[set]) -> dict:
    """
    Compute fraud risk scores including financial anomalies.
    """
    scores = {}

    for i, comp in enumerate(components):
        facilities = [n for n in comp if n.startswith("fac:")]
        owners = [n for n in comp if n.startswith("owner:")]
        admins = [n for n in comp if n.startswith("admin:")]
        phones = [n for n in comp if n.startswith("phone:")]
        addresses = [n for n in comp if n.startswith("addr:")]

        if len(facilities) < 2:
            continue

        # Calculate financial metrics for cluster
        revenues = []
        net_incomes = []
        visits_list = []

        for fac_node in facilities:
            node_data = G.nodes[fac_node]
            if node_data.get("revenue"):
                revenues.append(node_data["revenue"])
            if node_data.get("net_income") is not None:
                net_incomes.append(node_data["net_income"])
            if node_data.get("visits"):
                visits_list.append(node_data["visits"])

        total_revenue = sum(revenues) if revenues else 0
        total_visits = sum(visits_list) if visits_list else 0
        avg_revenue = np.mean(revenues) if revenues else 0

        # Score factors
        fac_count = len(facilities)
        shared_types = sum([
            1 if len(phones) > 0 and len(facilities) > len(phones) else 0,
            1 if len(addresses) > 0 and len(facilities) > len(addresses) else 0,
            1 if len(admins) > 0 and len(facilities) > len(admins) else 0,
        ])

        # Financial anomaly factors
        high_revenue_factor = 1.0
        if total_revenue > 10_000_000:  # $10M+ cluster
            high_revenue_factor = 1.5
        if total_revenue > 50_000_000:  # $50M+ cluster
            high_revenue_factor = 2.0

        # Negative income is suspicious
        negative_income_factor = 1.0
        if net_incomes and any(ni < 0 for ni in net_incomes):
            negative_income_factor = 1.2

        # Higher score = more suspicious
        score = fac_count * (1 + shared_types * 0.5) * high_revenue_factor * negative_income_factor

        if score > 3:
            scores[i] = {
                "score": score,
                "facilities": fac_count,
                "shared_owners": len(owners),
                "shared_admins": len(admins),
                "shared_phones": len(phones),
                "shared_addresses": len(addresses),
                "total_revenue": total_revenue,
                "avg_revenue": avg_revenue,
                "total_visits": total_visits,
                "has_negative_income": any(ni < 0 for ni in net_incomes) if net_incomes else False,
                "component": comp,
            }

    return scores


def create_visualization(
    G: nx.Graph,
    components: list[set],
    fraud_scores: dict,
    output_path: Path,
    top_n: int = 10,
):
    """Create network visualization highlighting suspicious clusters."""

    print(f"\nGenerating visualization...")

    # Get top suspicious components
    top_suspicious = sorted(
        fraud_scores.items(),
        key=lambda x: x[1]["score"],
        reverse=True
    )[:top_n]

    if not top_suspicious:
        print("  No suspicious clusters found to visualize")
        return

    # Create subgraph of top suspicious components
    suspicious_nodes = set()
    for idx, data in top_suspicious:
        suspicious_nodes.update(data["component"])

    subgraph = G.subgraph(suspicious_nodes)

    # Create figure with 3 subplots
    fig = plt.figure(figsize=(24, 16))

    # Main title
    fig.suptitle(
        "CA Healthcare Facility Ownership Network Analysis\n"
        "Suspicious Clusters with Financial Data",
        fontsize=18,
        fontweight="bold",
        y=0.98
    )

    # Subplot 1: Full network
    ax1 = fig.add_subplot(2, 2, 1)
    ax1.set_title(f"Top {len(top_suspicious)} Suspicious Clusters\n({subgraph.number_of_nodes()} nodes)")

    node_colors = []
    node_sizes = []
    for node in subgraph.nodes():
        node_type = G.nodes[node].get("node_type", "facility")
        revenue = G.nodes[node].get("revenue", 0) or 0

        if node_type == "facility":
            if revenue > 5_000_000:
                node_colors.append(COLORS["high_revenue"])
                node_sizes.append(200)
            else:
                node_colors.append(COLORS["facility"])
                node_sizes.append(100)
        elif node_type == "owner":
            node_colors.append(COLORS["owner"])
            node_sizes.append(200)
        elif node_type == "admin":
            node_colors.append(COLORS["admin"])
            node_sizes.append(150)
        elif node_type == "phone":
            node_colors.append(COLORS["phone"])
            node_sizes.append(150)
        else:
            node_colors.append(COLORS["address"])
            node_sizes.append(150)

    pos = nx.spring_layout(subgraph, k=2, iterations=50, seed=42)
    nx.draw_networkx_nodes(subgraph, pos, ax=ax1, node_color=node_colors, node_size=node_sizes, alpha=0.8)
    nx.draw_networkx_edges(subgraph, pos, ax=ax1, alpha=0.3, edge_color="#666")

    legend_elements = [
        mpatches.Patch(color=COLORS["facility"], label="Facility"),
        mpatches.Patch(color=COLORS["high_revenue"], label="High Revenue ($5M+)"),
        mpatches.Patch(color=COLORS["owner"], label="Owner"),
        mpatches.Patch(color=COLORS["admin"], label="Admin Email"),
        mpatches.Patch(color=COLORS["phone"], label="Phone"),
        mpatches.Patch(color=COLORS["address"], label="Address"),
    ]
    ax1.legend(handles=legend_elements, loc="upper left", fontsize=8)
    ax1.axis("off")

    # Subplot 2: Top cluster detail
    ax2 = fig.add_subplot(2, 2, 2)
    if top_suspicious:
        top_idx, top_data = top_suspicious[0]
        top_comp = top_data["component"]
        top_subgraph = G.subgraph(top_comp)

        revenue_str = f"${top_data['total_revenue']:,.0f}" if top_data['total_revenue'] else "N/A"
        ax2.set_title(
            f"#1 Highest Risk Cluster (Score: {top_data['score']:.1f})\n"
            f"{top_data['facilities']} facilities | Revenue: {revenue_str}"
        )

        top_colors = []
        top_sizes = []
        labels = {}
        for node in top_subgraph.nodes():
            node_type = G.nodes[node].get("node_type", "facility")
            name = G.nodes[node].get("name", node)
            revenue = G.nodes[node].get("revenue", 0) or 0

            if node_type == "facility":
                if revenue > 5_000_000:
                    top_colors.append(COLORS["high_revenue"])
                else:
                    top_colors.append(COLORS["highlight"])
                top_sizes.append(300)
                label = name[:18] + "..." if len(name) > 18 else name
                if revenue:
                    label += f"\n${revenue/1e6:.1f}M"
                labels[node] = label
            elif node_type == "owner":
                top_colors.append(COLORS["owner"])
                top_sizes.append(400)
                labels[node] = f"OWNER:\n{name[:15]}..."
            elif node_type == "admin":
                top_colors.append(COLORS["admin"])
                top_sizes.append(250)
                labels[node] = f"ADMIN:\n{name[:15]}..."
            elif node_type == "phone":
                top_colors.append(COLORS["phone"])
                top_sizes.append(250)
                if len(name) >= 10:
                    labels[node] = f"({name[:3]}){name[3:6]}-{name[6:10]}"
                else:
                    labels[node] = name
            else:
                top_colors.append(COLORS["address"])
                top_sizes.append(250)
                labels[node] = f"ADDR:\n{name[:20]}..."

        pos2 = nx.spring_layout(top_subgraph, k=3, iterations=100, seed=42)
        nx.draw_networkx_nodes(top_subgraph, pos2, ax=ax2, node_color=top_colors, node_size=top_sizes, alpha=0.9)
        nx.draw_networkx_edges(top_subgraph, pos2, ax=ax2, alpha=0.5, edge_color="#666", width=2)
        nx.draw_networkx_labels(top_subgraph, pos2, labels, ax=ax2, font_size=6)
        ax2.axis("off")

    # Subplot 3: Revenue by cluster bar chart
    ax3 = fig.add_subplot(2, 2, 3)
    ax3.set_title("Revenue by Suspicious Cluster (Top 15)")

    cluster_names = []
    cluster_revenues = []
    cluster_colors = []

    for i, (idx, data) in enumerate(top_suspicious[:15]):
        cluster_names.append(f"#{i+1}\n({data['facilities']} fac)")
        cluster_revenues.append(data['total_revenue'] / 1e6 if data['total_revenue'] else 0)
        cluster_colors.append(COLORS["highlight"] if data.get("has_negative_income") else COLORS["facility"])

    bars = ax3.bar(cluster_names, cluster_revenues, color=cluster_colors, edgecolor="white")
    ax3.set_ylabel("Revenue (Millions $)")
    ax3.set_xlabel("Cluster")
    ax3.tick_params(axis='x', rotation=0, labelsize=8)

    # Add value labels
    for bar, val in zip(bars, cluster_revenues):
        if val > 0:
            ax3.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                    f'${val:.1f}M', ha='center', va='bottom', fontsize=7)

    # Subplot 4: Summary stats table
    ax4 = fig.add_subplot(2, 2, 4)
    ax4.axis("off")
    ax4.set_title("Top 10 Clusters Summary", fontsize=12, fontweight="bold")

    table_data = []
    headers = ["Rank", "Score", "Facilities", "Revenue", "Phones", "Addresses", "Admins"]

    for i, (idx, data) in enumerate(top_suspicious[:10], 1):
        revenue_str = f"${data['total_revenue']/1e6:.1f}M" if data['total_revenue'] else "N/A"
        table_data.append([
            f"#{i}",
            f"{data['score']:.1f}",
            str(data['facilities']),
            revenue_str,
            str(data['shared_phones']),
            str(data['shared_addresses']),
            str(data['shared_admins']),
        ])

    table = ax4.table(
        cellText=table_data,
        colLabels=headers,
        cellLoc="center",
        loc="center",
        colColours=["#374151"] * len(headers),
        cellColours=[["#1f2937"] * len(headers) for _ in table_data]
    )
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1.2, 1.5)

    # Style header
    for (row, col), cell in table.get_celld().items():
        if row == 0:
            cell.set_text_props(color="white", fontweight="bold")
        else:
            cell.set_text_props(color="white")

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="#111827")
    print(f"  Saved visualization to {output_path}")
    plt.close()


def generate_report(G: nx.Graph, components: list[set], fraud_scores: dict, output_path: Path):
    """Generate comprehensive text report."""

    ranked = sorted(
        fraud_scores.items(),
        key=lambda x: x[1]["score"],
        reverse=True
    )

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("CA HEALTHCARE FACILITY NETWORK ANALYSIS REPORT\n")
        f.write("Potential Fraud / Duplicate Detection with Financial Data\n")
        f.write("=" * 80 + "\n\n")

        f.write("SUMMARY\n")
        f.write("-" * 40 + "\n")
        f.write(f"Total nodes in graph: {G.number_of_nodes():,}\n")
        f.write(f"Total edges in graph: {G.number_of_edges():,}\n")
        f.write(f"Connected components: {len(components):,}\n")
        f.write(f"Suspicious clusters (score > 3): {len(fraud_scores)}\n")

        # Financial summary
        total_revenue = sum(d["total_revenue"] for d in fraud_scores.values() if d["total_revenue"])
        f.write(f"\nTotal revenue in suspicious clusters: ${total_revenue:,.0f}\n")
        f.write(f"Clusters with negative income: {sum(1 for d in fraud_scores.values() if d.get('has_negative_income'))}\n")
        f.write("\n")

        f.write("TOP 25 SUSPICIOUS CLUSTERS\n")
        f.write("-" * 40 + "\n\n")

        for i, (idx, data) in enumerate(ranked[:25], 1):
            f.write(f"{'='*60}\n")
            f.write(f"CLUSTER #{i} - Risk Score: {data['score']:.1f}\n")
            f.write(f"{'='*60}\n")
            f.write(f"  Facilities: {data['facilities']}\n")
            f.write(f"  Shared Owners: {data['shared_owners']}\n")
            f.write(f"  Shared Admins: {data['shared_admins']}\n")
            f.write(f"  Shared Phones: {data['shared_phones']}\n")
            f.write(f"  Shared Addresses: {data['shared_addresses']}\n")

            # Financial data
            f.write(f"\n  FINANCIAL DATA:\n")
            if data['total_revenue']:
                f.write(f"    Total Revenue: ${data['total_revenue']:,.0f}\n")
                f.write(f"    Avg Revenue: ${data['avg_revenue']:,.0f}\n")
            else:
                f.write(f"    Total Revenue: N/A\n")
            if data['total_visits']:
                f.write(f"    Total Visits: {data['total_visits']:,}\n")
            if data.get('has_negative_income'):
                f.write(f"    ⚠️  HAS NEGATIVE NET INCOME\n")

            # List facilities
            facilities = [n for n in data["component"] if n.startswith("fac:")]
            f.write(f"\n  FACILITIES IN CLUSTER:\n")
            for fac_node in facilities[:15]:
                node_data = G.nodes[fac_node]
                name = node_data.get("name", "Unknown")
                revenue = node_data.get("revenue")
                rev_str = f" | Rev: ${revenue:,.0f}" if revenue else ""
                f.write(f"    - {name}{rev_str}\n")
            if len(facilities) > 15:
                f.write(f"    ... and {len(facilities) - 15} more\n")

            # List shared attributes
            phones = [n for n in data["component"] if n.startswith("phone:")]
            if phones:
                f.write(f"\n  SHARED PHONES:\n")
                for p in phones[:5]:
                    phone = G.nodes[p].get("name", "")
                    if len(phone) >= 10:
                        f.write(f"    - ({phone[:3]}) {phone[3:6]}-{phone[6:10]}\n")
                    else:
                        f.write(f"    - {phone}\n")

            addresses = [n for n in data["component"] if n.startswith("addr:")]
            if addresses:
                f.write(f"\n  SHARED ADDRESSES:\n")
                for a in addresses[:5]:
                    addr = G.nodes[a].get("name", "").replace("|", ", ")
                    f.write(f"    - {addr}\n")

            f.write("\n")

        f.write("\n" + "=" * 80 + "\n")
        f.write("END OF REPORT\n")

    print(f"  Saved report to {output_path}")


def main():
    """Main analysis pipeline."""
    print("=" * 60)
    print("CA Healthcare Facility Network Analysis")
    print("With Financial Data Integration")
    print("=" * 60 + "\n")

    # Load data
    financial_data = load_financial_data(FINANCIAL_CSV)
    facilities = load_facilities(DATA_PATH)

    # Build network with financial data
    G = build_network(facilities, financial_data)

    # Analyze components
    components = analyze_components(G)

    # Compute fraud scores
    fraud_scores = compute_fraud_scores(G, components)

    # Generate outputs
    create_visualization(
        G, components, fraud_scores,
        OUTPUT_DIR / "ownership_network.png",
        top_n=15
    )

    generate_report(
        G, components, fraud_scores,
        OUTPUT_DIR / "analysis_report.txt"
    )

    # Save graph data for external analysis (filter out None values for GEXF compatibility)
    G_export = G.copy()
    for node in G_export.nodes():
        for key, value in list(G_export.nodes[node].items()):
            if value is None:
                G_export.nodes[node][key] = ""
    try:
        nx.write_gexf(G_export, OUTPUT_DIR / "facility_network.gexf")
        print(f"  Saved graph data to {OUTPUT_DIR / 'facility_network.gexf'}")
    except Exception as e:
        print(f"  Warning: Could not save GEXF: {e}")

    # Export top clusters to JSON
    top_clusters = sorted(
        fraud_scores.items(),
        key=lambda x: x[1]["score"],
        reverse=True
    )[:50]

    clusters_export = []
    for idx, data in top_clusters:
        facilities_in_cluster = []
        for n in data["component"]:
            if n.startswith("fac:"):
                node_data = G.nodes[n]
                facilities_in_cluster.append({
                    "id": n.replace("fac:", ""),
                    "name": node_data.get("name"),
                    "category": node_data.get("category"),
                    "revenue": node_data.get("revenue"),
                    "net_income": node_data.get("net_income"),
                    "visits": node_data.get("visits"),
                })

        clusters_export.append({
            "rank": len(clusters_export) + 1,
            "score": data["score"],
            "facility_count": data["facilities"],
            "total_revenue": data["total_revenue"],
            "shared_phones": data["shared_phones"],
            "shared_addresses": data["shared_addresses"],
            "shared_admins": data["shared_admins"],
            "has_negative_income": data.get("has_negative_income", False),
            "facilities": facilities_in_cluster,
        })

    with open(OUTPUT_DIR / "suspicious_clusters.json", "w") as f:
        json.dump(clusters_export, f, indent=2)
    print(f"  Saved cluster data to {OUTPUT_DIR / 'suspicious_clusters.json'}")

    print("\n" + "=" * 60)
    print("Analysis complete!")
    print(f"Outputs saved to: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
