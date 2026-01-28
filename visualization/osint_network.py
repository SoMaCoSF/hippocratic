# ==============================================================================
# file_id: SOM-SCR-0028-v1.0.0
# name: osint_network.py
# description: ManimGL visualization of CA healthcare facility fraud network
# project_id: HIPPOCRATIC
# category: script
# tags: [visualization, manimgl, network, osint, fraud-detection]
# created: 2026-01-28
# version: 1.0.0
# ==============================================================================
#
# Usage:
#   manimgl osint_network.py OSINTNetworkScene -o  # render to file
#   manimgl osint_network.py OSINTNetworkScene     # interactive preview
#
# Requirements:
#   pip install manimgl networkx
#
# ==============================================================================

from manimlib import *
import json
import networkx as nx
import random
from pathlib import Path

# Color palette matching the web app
COLORS = {
    "standard": "#3b82f6",  # blue
    "address": "#f59e0b",   # amber
    "phone": "#a855f7",     # purple
    "owner": "#06b6d4",     # cyan
    "admin": "#ec4899",     # pink
    "multiple": "#ef4444",  # red
    "edge_address": "#f59e0b",
    "edge_phone": "#a855f7",
    "edge_owner": "#06b6d4",
    "edge_admin": "#ec4899",
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple for manim."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))


class OSINTNetworkScene(Scene):
    """
    Animated visualization of the CA Healthcare Facility OSINT network.
    Shows suspicious clusters with shared addresses, phones, owners, and admins.
    """

    def construct(self):
        # Load cluster data
        data_path = Path(__file__).parent.parent / "analysis" / "output" / "suspicious_clusters.json"

        if not data_path.exists():
            # Fallback to web public data
            data_path = Path(__file__).parent.parent / "web" / "public" / "data" / "analysis" / "clusters.json"

        if not data_path.exists():
            self.show_error("Cluster data not found")
            return

        with open(data_path, 'r') as f:
            clusters = json.load(f)

        # Title sequence
        self.show_title()

        # Show summary stats
        self.show_stats(clusters)

        # Visualize top clusters
        self.visualize_top_clusters(clusters[:10])

        # Final summary
        self.show_final_summary(clusters)

    def show_error(self, message):
        """Display error message."""
        error = Text(message, color=RED, font_size=48)
        self.play(Write(error))
        self.wait(2)

    def show_title(self):
        """Animated title sequence."""
        title = Text(
            "HIPPOCRATIC",
            font_size=72,
            color=WHITE,
            weight=BOLD
        )
        subtitle = Text(
            "CA Healthcare Facility Fraud Network Analysis",
            font_size=36,
            color=BLUE_C
        )
        subtitle.next_to(title, DOWN, buff=0.5)

        osint_label = Text(
            "OSINT NETWORK VISUALIZATION",
            font_size=24,
            color=GREY_B
        )
        osint_label.next_to(subtitle, DOWN, buff=0.8)

        group = VGroup(title, subtitle, osint_label)

        self.play(
            Write(title, run_time=1.5),
            rate_func=smooth
        )
        self.play(
            FadeIn(subtitle, shift=UP * 0.3),
            run_time=0.8
        )
        self.play(
            FadeIn(osint_label, shift=UP * 0.2),
            run_time=0.5
        )
        self.wait(1)
        self.play(FadeOut(group), run_time=0.5)

    def show_stats(self, clusters):
        """Display summary statistics with animation."""
        total_clusters = len(clusters)
        total_facilities = sum(c['facility_count'] for c in clusters)
        total_revenue = sum(c['total_revenue'] for c in clusters if c['total_revenue'])
        negative_income = sum(1 for c in clusters if c['has_negative_income'])

        # Create stat boxes
        stats = [
            ("Suspicious Clusters", str(total_clusters), BLUE_C),
            ("Facilities Involved", f"{total_facilities:,}", YELLOW_C),
            ("Total Revenue", f"${total_revenue/1e9:.1f}B", GREEN_C),
            ("Negative Income", str(negative_income), RED_C),
        ]

        stat_groups = []
        for i, (label, value, color) in enumerate(stats):
            # Value
            val_text = Text(value, font_size=48, color=color, weight=BOLD)
            # Label
            label_text = Text(label, font_size=20, color=GREY_B)
            label_text.next_to(val_text, DOWN, buff=0.2)

            stat_group = VGroup(val_text, label_text)
            stat_groups.append(stat_group)

        # Arrange in a row
        all_stats = VGroup(*stat_groups)
        all_stats.arrange(RIGHT, buff=1.5)
        all_stats.move_to(ORIGIN)

        # Animate each stat
        for stat_group in stat_groups:
            self.play(
                FadeIn(stat_group, scale=0.8),
                run_time=0.4
            )

        self.wait(2)
        self.play(FadeOut(all_stats), run_time=0.5)

    def visualize_top_clusters(self, clusters):
        """Visualize top suspicious clusters as network graphs."""
        for i, cluster in enumerate(clusters[:5]):  # Top 5 clusters
            self.visualize_cluster(cluster, i + 1)

    def visualize_cluster(self, cluster, rank):
        """Visualize a single cluster as an animated network."""
        # Header
        header = Text(
            f"Cluster #{rank} - Risk Score: {cluster['score']:.0f}",
            font_size=36,
            color=RED if cluster['score'] >= 500 else YELLOW if cluster['score'] >= 100 else WHITE
        )
        header.to_edge(UP, buff=0.5)

        # Stats bar
        stats_text = Text(
            f"{cluster['facility_count']} facilities | "
            f"{cluster['shared_addresses']} shared addresses | "
            f"{cluster['shared_phones']} shared phones | "
            f"{cluster['shared_admins']} shared admins",
            font_size=18,
            color=GREY_B
        )
        stats_text.next_to(header, DOWN, buff=0.3)

        self.play(Write(header), run_time=0.5)
        self.play(FadeIn(stats_text), run_time=0.3)

        # Build network graph
        G = nx.Graph()

        # Add facility nodes (limit to 30 for visibility)
        facilities = cluster['facilities'][:30]
        for f in facilities:
            G.add_node(f['id'], name=f['name'], category=f['category'])

        # Create visual nodes
        n = len(facilities)
        if n == 0:
            self.wait(1)
            self.play(FadeOut(header), FadeOut(stats_text))
            return

        # Arrange nodes in a circle
        radius = 2.5
        node_dots = {}
        node_labels = {}

        for i, f in enumerate(facilities):
            angle = i * TAU / n - PI / 2
            pos = radius * np.array([np.cos(angle), np.sin(angle), 0])

            # Determine node color based on category
            if "DIALYSIS" in f['category'].upper():
                color = COLORS['standard']
            elif "HOSPICE" in f['category'].upper():
                color = COLORS['admin']
            elif "HOME HEALTH" in f['category'].upper():
                color = COLORS['owner']
            else:
                color = COLORS['standard']

            dot = Dot(pos, radius=0.12, color=color)
            node_dots[f['id']] = dot

            # Truncate name for label
            short_name = f['name'][:20] + "..." if len(f['name']) > 20 else f['name']
            label = Text(short_name, font_size=10, color=GREY_A)
            label.next_to(dot, normalize(pos) * 0.3, buff=0.05)
            label.rotate(angle if -PI/2 < angle < PI/2 else angle + PI)
            node_labels[f['id']] = label

        # Animate nodes appearing
        node_group = VGroup(*node_dots.values())
        self.play(
            LaggedStart(*[
                GrowFromCenter(dot) for dot in node_dots.values()
            ], lag_ratio=0.02),
            run_time=1
        )

        # Create edges for shared connections
        edges = []
        edge_types = []

        # Simulate shared connections based on cluster data
        # In reality, we'd have explicit edge data, but we'll create representative edges
        num_address_edges = min(cluster['shared_addresses'], n * (n - 1) // 4)
        num_phone_edges = min(cluster['shared_phones'], n * (n - 1) // 4)

        facility_ids = [f['id'] for f in facilities]

        # Create address edges
        random.seed(cluster['rank'])
        for _ in range(min(num_address_edges, 20)):
            if len(facility_ids) >= 2:
                i, j = random.sample(range(len(facility_ids)), 2)
                edges.append((facility_ids[i], facility_ids[j]))
                edge_types.append("address")

        # Create phone edges
        for _ in range(min(num_phone_edges, 15)):
            if len(facility_ids) >= 2:
                i, j = random.sample(range(len(facility_ids)), 2)
                edges.append((facility_ids[i], facility_ids[j]))
                edge_types.append("phone")

        # Animate edges
        edge_lines = []
        for (u, v), etype in zip(edges, edge_types):
            if u in node_dots and v in node_dots:
                start = node_dots[u].get_center()
                end = node_dots[v].get_center()
                color = COLORS[f'edge_{etype}']
                line = Line(start, end, stroke_width=1, color=color, stroke_opacity=0.4)
                edge_lines.append(line)

        if edge_lines:
            self.play(
                LaggedStart(*[
                    Create(line) for line in edge_lines
                ], lag_ratio=0.01),
                run_time=1.5
            )

        # Show some labels
        selected_labels = list(node_labels.values())[:8]
        if selected_labels:
            self.play(
                LaggedStart(*[
                    FadeIn(label) for label in selected_labels
                ], lag_ratio=0.05),
                run_time=0.5
            )

        # Revenue callout if available
        if cluster['total_revenue'] > 0:
            revenue_text = Text(
                f"${cluster['total_revenue']:,.0f}",
                font_size=28,
                color=GREEN_C
            )
            revenue_label = Text("Total Revenue", font_size=14, color=GREY_B)
            revenue_label.next_to(revenue_text, DOWN, buff=0.1)
            revenue_group = VGroup(revenue_text, revenue_label)
            revenue_group.to_corner(DR, buff=0.5)

            self.play(FadeIn(revenue_group), run_time=0.3)
            self.wait(0.5)
            self.play(FadeOut(revenue_group), run_time=0.2)

        self.wait(1)

        # Clean up
        all_elements = VGroup(
            header, stats_text, node_group,
            *edge_lines, *selected_labels
        )
        self.play(FadeOut(all_elements), run_time=0.5)

    def show_final_summary(self, clusters):
        """Final summary with key findings."""
        # Title
        title = Text(
            "Key Findings",
            font_size=48,
            color=WHITE,
            weight=BOLD
        )
        title.to_edge(UP, buff=0.8)

        findings = [
            f"Total suspicious clusters identified: {len(clusters)}",
            f"Total facilities in suspicious networks: {sum(c['facility_count'] for c in clusters):,}",
            f"Total revenue at risk: ${sum(c['total_revenue'] for c in clusters)/1e9:.2f}B",
            f"Clusters with negative income: {sum(1 for c in clusters if c['has_negative_income'])}",
            f"Highest risk score: {max(c['score'] for c in clusters):.0f}",
        ]

        finding_texts = []
        for i, finding in enumerate(findings):
            text = Text(f"• {finding}", font_size=24, color=GREY_A)
            finding_texts.append(text)

        findings_group = VGroup(*finding_texts)
        findings_group.arrange(DOWN, aligned_edge=LEFT, buff=0.4)
        findings_group.next_to(title, DOWN, buff=0.8)

        self.play(Write(title), run_time=0.5)

        for text in finding_texts:
            self.play(FadeIn(text, shift=RIGHT * 0.3), run_time=0.4)

        self.wait(2)

        # Final message
        warning = Text(
            "These networks require further investigation",
            font_size=20,
            color=RED_C
        )
        warning.to_edge(DOWN, buff=1)

        self.play(FadeIn(warning), run_time=0.5)
        self.wait(2)

        self.play(
            FadeOut(VGroup(title, findings_group, warning)),
            run_time=1
        )


class ClusterZoomScene(Scene):
    """
    Deep dive into a single high-risk cluster with detailed visualization.
    """

    def construct(self):
        # Load data
        data_path = Path(__file__).parent.parent / "web" / "public" / "data" / "analysis" / "clusters.json"

        if not data_path.exists():
            data_path = Path(__file__).parent.parent / "analysis" / "output" / "suspicious_clusters.json"

        if not data_path.exists():
            error = Text("Cluster data not found", color=RED)
            self.play(Write(error))
            return

        with open(data_path, 'r') as f:
            clusters = json.load(f)

        # Focus on cluster #1 (highest risk)
        cluster = clusters[0]

        self.show_cluster_deep_dive(cluster)

    def show_cluster_deep_dive(self, cluster):
        """Detailed visualization of a single cluster."""
        # Title
        title = Text(
            f"CLUSTER #1 DEEP DIVE",
            font_size=42,
            color=RED_C,
            weight=BOLD
        )
        title.to_edge(UP, buff=0.5)

        score_text = Text(
            f"Risk Score: {cluster['score']:.0f}",
            font_size=32,
            color=YELLOW_C
        )
        score_text.next_to(title, DOWN, buff=0.3)

        self.play(Write(title), run_time=0.8)
        self.play(FadeIn(score_text), run_time=0.4)

        # Create connection type breakdown
        connections = [
            ("Shared Addresses", cluster['shared_addresses'], COLORS['address']),
            ("Shared Phones", cluster['shared_phones'], COLORS['phone']),
            ("Shared Admins", cluster['shared_admins'], COLORS['admin']),
        ]

        # Create bar chart
        max_val = max(c[1] for c in connections)
        bar_height = 0.4
        bar_max_width = 4

        bars = []
        for i, (label, value, color) in enumerate(connections):
            width = (value / max_val) * bar_max_width if max_val > 0 else 0
            bar = Rectangle(
                width=width,
                height=bar_height,
                fill_color=color,
                fill_opacity=0.8,
                stroke_width=0
            )

            label_text = Text(label, font_size=18, color=GREY_A)
            value_text = Text(str(value), font_size=18, color=WHITE)

            label_text.next_to(bar, LEFT, buff=0.3)
            value_text.next_to(bar, RIGHT, buff=0.2)

            bar_group = VGroup(bar, label_text, value_text)
            bars.append(bar_group)

        bars_vgroup = VGroup(*bars)
        bars_vgroup.arrange(DOWN, buff=0.3, aligned_edge=LEFT)
        bars_vgroup.move_to(ORIGIN + DOWN * 0.5)

        for bar_group in bars:
            bar, label, value = bar_group
            self.play(
                GrowFromEdge(bar, LEFT),
                FadeIn(label),
                FadeIn(value),
                run_time=0.5
            )

        self.wait(2)

        # Show sample facilities
        self.play(FadeOut(bars_vgroup), run_time=0.3)

        facilities_title = Text(
            f"Sample Facilities ({cluster['facility_count']} total)",
            font_size=28,
            color=BLUE_C
        )
        facilities_title.move_to(UP * 1.5)

        self.play(FadeIn(facilities_title), run_time=0.3)

        # Show first 10 facility names
        sample_facilities = cluster['facilities'][:10]
        facility_texts = []

        for f in sample_facilities:
            name = f['name'][:40] + "..." if len(f['name']) > 40 else f['name']
            text = Text(f"• {name}", font_size=16, color=GREY_A)
            facility_texts.append(text)

        facilities_group = VGroup(*facility_texts)
        facilities_group.arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        facilities_group.next_to(facilities_title, DOWN, buff=0.5)

        self.play(
            LaggedStart(*[
                FadeIn(text, shift=RIGHT * 0.2) for text in facility_texts
            ], lag_ratio=0.1),
            run_time=2
        )

        self.wait(2)

        # Final fade out
        self.play(
            FadeOut(VGroup(title, score_text, facilities_title, facilities_group)),
            run_time=1
        )


class ConnectionTypeScene(Scene):
    """
    Explains the different types of suspicious connections.
    """

    def construct(self):
        # Title
        title = Text(
            "Connection Types",
            font_size=48,
            color=WHITE,
            weight=BOLD
        )
        title.to_edge(UP, buff=0.5)
        self.play(Write(title), run_time=0.5)

        connections = [
            ("ADDRESS", COLORS['address'], "Multiple facilities at same physical location"),
            ("PHONE", COLORS['phone'], "Facilities sharing the same phone number"),
            ("OWNER", COLORS['owner'], "Same business entity owns multiple facilities"),
            ("ADMIN", COLORS['admin'], "Same administrator across facilities"),
        ]

        items = []
        for conn_type, color, description in connections:
            # Color dot
            dot = Dot(radius=0.15, color=color)

            # Type label
            type_text = Text(conn_type, font_size=28, color=color, weight=BOLD)
            type_text.next_to(dot, RIGHT, buff=0.3)

            # Description
            desc_text = Text(description, font_size=18, color=GREY_A)
            desc_text.next_to(type_text, DOWN, buff=0.1, aligned_edge=LEFT)

            item = VGroup(dot, type_text, desc_text)
            items.append(item)

        items_group = VGroup(*items)
        items_group.arrange(DOWN, buff=0.6, aligned_edge=LEFT)
        items_group.move_to(ORIGIN)

        for item in items:
            self.play(
                FadeIn(item, shift=RIGHT * 0.3),
                run_time=0.6
            )

        self.wait(3)

        self.play(FadeOut(VGroup(title, items_group)), run_time=0.5)


# Run with: manimgl osint_network.py OSINTNetworkScene -o
if __name__ == "__main__":
    print("Run with:")
    print("  manimgl osint_network.py OSINTNetworkScene -o    # render to file")
    print("  manimgl osint_network.py OSINTNetworkScene       # interactive preview")
    print("  manimgl osint_network.py ClusterZoomScene -o     # cluster deep dive")
    print("  manimgl osint_network.py ConnectionTypeScene -o  # connection types explainer")
