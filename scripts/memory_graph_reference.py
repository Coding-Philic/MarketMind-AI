#!/usr/bin/env python3
"""
MarketMind AI — Memory-First Multi-Agent Reference Implementation
A command-line tool showing the core mathematical and logical structure of the
hindsight-driven long-term memory graph, expectation auditing, and memo generation.
"""

import sys
import time
import json
import random

# ==========================================
# SEED DATABASE STRUCTURE
# ==========================================

COMPANIES = {
    "nvda": {
        "name": "NVIDIA Corporation",
        "ticker": "NVDA",
        "sector": "Semiconductors",
        "alignment_score": 88,
        "revenue_data": [
            {"period": "2024", "revenue": 60922, "margin": 48.8},
            {"period": "2025", "revenue": 96300, "margin": 53.2}
        ],
        "expectations": [
            {"id": "nvda-exp-1", "desc": "Blackwell GPU volume shipments starting in Q4 2024", "target": "Q4 2024"},
            {"id": "nvda-exp-2", "desc": "DGX Cloud subscription ARR reaching $5B by 2026", "target": "2026"}
        ]
    },
    "aapl": {
        "name": "Apple Inc.",
        "ticker": "AAPL",
        "sector": "Consumer Tech",
        "alignment_score": 62,
        "revenue_data": [
            {"period": "2024", "revenue": 391035, "margin": 25.8},
            {"period": "2025", "revenue": 412500, "margin": 26.5}
        ],
        "expectations": [
            {"id": "aapl-exp-1", "desc": "Apple Vision Pro units exceeding 1,000,000 in Year 1", "target": "Q1 2025"},
            {"id": "aapl-exp-2", "desc": "Apple Intelligence driving a 20% iPhone upgrade supercycle", "target": "Q4 2025"}
        ]
    },
    "tsla": {
        "name": "Tesla, Inc.",
        "ticker": "TSLA",
        "sector": "Automotive & Robotics",
        "alignment_score": 54,
        "revenue_data": [
            {"period": "2024", "revenue": 98450, "margin": 11.2},
            {"period": "2025", "revenue": 112000, "margin": 12.8}
        ],
        "expectations": [
            {"id": "tsla-exp-1", "desc": "Autonomous Robotaxi network active in major cities by Q3 2025", "target": "Q3 2025"},
            {"id": "tsla-exp-2", "desc": "Cybertruck reaching 250k production rate by end of 2024", "target": "Q4 2024"}
        ]
    }
}

HINDSIGHT_LEDGER = [
    {
        "id": "h-1",
        "company_id": "aapl",
        "company_name": "Apple Inc.",
        "expectation": "Launch autonomous electric vehicle (Project Titan) by 2025",
        "outcome": "Apple cancelled Project Titan in Feb 2024, shifting resources to Generative AI after $10B R&D.",
        "deviation": "cancelled",
        "lesson": "High-capital EV margins contradict Apple's asset-light model. Software intelligence moats carry lower structural friction."
    },
    {
        "id": "h-2",
        "company_id": "nvda",
        "company_name": "NVIDIA Corporation",
        "expectation": "Blackwell GPU volume shipping in Q3 2024 with no manufacturing yield bottlenecks",
        "outcome": "TSMC CoWoS-L bridge packaging defect detected, causing low yields and delaying volume shipment by 90 days.",
        "deviation": "lagging",
        "lesson": "Advanced silicon integration (multi-die CoWoS) carries high single-point yield risks. Buffer initial rollouts by 120 days."
    }
]

MEMORY_NODES = [
    {"id": "sec-semi", "label": "Semiconductors Sector", "type": "sector"},
    {"id": "sec-consumer", "label": "Consumer Tech Sector", "type": "sector"},
    {"id": "sec-auto", "label": "Automotive Sector", "type": "sector"},
    {"id": "co-nvda", "label": "NVIDIA Corp.", "type": "company"},
    {"id": "co-aapl", "label": "Apple Inc.", "type": "company"},
    {"id": "co-tsla", "label": "Tesla Inc.", "type": "company"},
    {"id": "less-packaging", "label": "Advanced Packaging Yield Risks", "type": "lesson"},
    {"id": "less-capital-traps", "label": "Capital-Intensive Supply Traps", "type": "lesson"}
]

MEMORY_EDGES = [
    ("co-nvda", "sec-semi", "belongs_to"),
    ("co-aapl", "sec-consumer", "belongs_to"),
    ("co-tsla", "sec-auto", "belongs_to"),
    ("co-nvda", "less-packaging", "triggers"),
    ("co-aapl", "less-capital-traps", "triggers"),
    ("less-capital-traps", "sec-auto", "impacts")
]

EVENT_POOL = [
    {
        "company_id": "nvda",
        "company_name": "NVIDIA Corporation",
        "title": "TSMC expands CoWoS capacity ahead of schedule",
        "content": "TSMC converted active fabrication lines to advanced packaging to clear Blackwell wafer logs, accelerating deliveries.",
        "impact_type": "positive",
        "metric": "revenue",
        "change": 15
    },
    {
        "company_id": "aapl",
        "company_name": "Apple Inc.",
        "title": "Apple Intelligence unit conversion estimates missed",
        "content": "Early consumer surveys indicate on-device Siri upgrades failed to trigger upgrading supercycle in premium segments.",
        "impact_type": "negative",
        "metric": "growth",
        "change": -8
    },
    {
        "company_id": "tsla",
        "company_name": "Tesla, Inc.",
        "title": "Autonomous taxi compliance hearings pushed to 2026",
        "content": "California DMV announced audits on autonomous vehicles will take 6-12 months longer due to sensor calibration disputes.",
        "impact_type": "negative",
        "metric": "regulatory",
        "change": -12
    }
]

# ==========================================
# CLI CORE FUNCTIONS
# ==========================================

def print_header(title):
    print("\n" + "=" * 60)
    print(f" {title.upper()} ".center(60, "-"))
    print("=" * 60)

def list_companies():
    print_header("Coverage Companies & Financial Metrics")
    for cid, c in COMPANIES.items():
        print(f"\n* {c['name']} ({c['ticker']})")
        print(f"  Sector: {c['sector']}")
        print(f"  Memory Alignment Score: {c['alignment_score']}/100")
        print(f"  Financials:")
        for rev in c['revenue_data']:
            print(f"    - Period {rev['period']}: Revenue ${rev['revenue']}M | Margin {rev['margin']}%")
        print("  Active Monitored Expectations:")
        for exp in c['expectations']:
            print(f"    - [{exp['target']}] {exp['desc']}")

def view_ledger():
    print_header("Hindsight Learning Ledger")
    if not HINDSIGHT_LEDGER:
        print("No hindsight entries recorded.")
        return
    for item in HINDSIGHT_LEDGER:
        print(f"\n[Audit Record {item['id'].upper()} - {item['company_name']}]")
        print(f"  Expectation : {item['expectation']}")
        print(f"  Real Outcome: {item['outcome']}")
        print(f"  Deviation   : {item['deviation'].upper()}")
        print(f"\033[93m  Hindsight   : {item['lesson']}\033[0m")

def print_ascii_graph():
    print_header("ASCII Memory Connection Graph")
    print("Legend: [S] Sector  [C] Company  [L] Hindsight Lesson\n")
    
    # Simple ASCII visualization of the edges
    nodes_by_type = {}
    for n in MEMORY_NODES:
        nodes_by_type[n["id"]] = n
        
    print("Network Layout:")
    for edge in MEMORY_EDGES:
        src, tgt, label = edge
        n_src = nodes_by_type.get(src)
        n_tgt = nodes_by_type.get(tgt)
        if n_src and n_tgt:
            src_tag = f"[{n_src['type'][0].upper()}] {n_src['label']}"
            tgt_tag = f"[{n_tgt['type'][0].upper()}] {n_tgt['label']}"
            print(f"  {src_tag:<32} --({label:^10})--> {tgt_tag}")
            
    # Draw a quick schematic representation
    print("\nCognitive Connections Mapping:")
    print("      [S] Semiconductors <───────── [C] NVIDIA Corp. ─────────► [L] Advanced Packaging Yield")
    print("                                                                             │ (impacts)")
    print("      [S] Automotive <────────── [C] Tesla Inc. <────────────────────────────┘")
    print("            ▲")
    print("            │ (impacts)")
    print("      [L] Capital-Intensive Traps ◄── [C] Apple Inc. ─────────► [S] Consumer Tech")

def run_agent_simulation_step():
    print_header("Agent Processing Cycle")
    
    # Pick a random event from the pool
    event = random.choice(EVENT_POOL)
    print(f"\033[96m[Market Monitor Agent]\033[0m Scanning streams...")
    time.sleep(0.5)
    print(f"Ingested event: '{event['title']}' for {event['company_name']}.")
    
    company = COMPANIES.get(event['company_id'])
    if not company:
        print("Company not in coverage registry. Skipping.")
        return

    # Check expectation matches
    time.sleep(0.6)
    print(f"\033[93m[Hindsight Analyst Agent]\033[0m Auditing expectations vs actual data...")
    matched_exp = None
    for exp in company['expectations']:
        # Simple semantic overlap check (e.g. check if target or product overlaps)
        if ("blackwell" in exp['desc'].lower() and "cowos" in event['title'].lower()) or \
           ("taxi" in exp['desc'].lower() and "dmv" in event['content'].lower()) or \
           ("intelligence" in exp['desc'].lower() and "siri" in event['content'].lower()):
            matched_exp = exp
            break
            
    new_lesson = None
    if matched_exp:
        print(f"\033[91m  MATCH DETECTED!\033[0m Event contradicts Target Expectation:")
        print(f"  Expected: {matched_exp['desc']}")
        print(f"  Actual: {event['content']}")
        
        # Calculate deviation details
        deviation = "lagging" if event['change'] < 0 else "exceeded"
        lesson_text = f"Friction in {event['metric'].upper()} indicates standard rollout margins are lagging models. Adjust scale timeline out."
        if "dmv" in event['content'].lower():
            lesson_text = "Autonomy compliance testing is subject to regulatory bottlenecks. Adjust validation curves out by 12 months."
            
        new_lesson = {
            "id": f"h-gen-{random.randint(100,999)}",
            "company_id": event['company_id'],
            "company_name": event['company_name'],
            "expectation": matched_exp['desc'],
            "outcome": event['content'],
            "deviation": deviation,
            "lesson": lesson_text
        }
        HINDSIGHT_LEDGER.append(new_lesson)
        
        # Remove active expectation
        company['expectations'] = [e for e in company['expectations'] if e['id'] != matched_exp['id']]
        print(f"  Hindsight lesson recorded: '{lesson_text}'")
    else:
        print("  No active registered expectation affected. Procedural metrics updated.")

    # Memory graph update
    time.sleep(0.5)
    print(f"\033[92m[Memory Consolidator Agent]\033[0m Re-indexing nodes...")
    event_node_id = f"ev-{random.randint(1000,9999)}"
    MEMORY_NODES.append({"id": event_node_id, "label": event['title'], "type": "event"})
    MEMORY_EDGES.append((event_node_id, f"co-{event['company_id']}", "impacts"))
    
    if new_lesson:
        lesson_node_id = f"less-{new_lesson['id']}"
        MEMORY_NODES.append({"id": lesson_node_id, "label": new_lesson['deviation'].upper(), "type": "lesson"})
        MEMORY_EDGES.append((f"co-{event['company_id']}", lesson_node_id, "triggers"))
        MEMORY_EDGES.append((lesson_node_id, event_node_id, "resolves"))

    # Portfolio strategy refit
    time.sleep(0.5)
    print(f"\033[94m[Revenue Intelligence Agent]\033[0m Re-modeling strategist memos...")
    alignment_change = -5 if event['change'] < 0 else 2
    company['alignment_score'] = max(10, min(99, company['alignment_score'] + alignment_change))
    
    # Financial update
    last_rev = company['revenue_data'][-1]
    last_rev['revenue'] = int(last_rev['revenue'] * (1 + (event['change']/100)*0.1))
    
    print(f"  {company['name']} Alignment Score updated to {company['alignment_score']}%")
    print(f"  Financial outlook re-modeled: New Revenue forecast ${last_rev['revenue']}M")
    print(f"\033[92m[Success] Agent reasoning cycle successfully completed.\033[0m")

def main():
    while True:
        print("\n" + "=" * 60)
        print(" MARKETMIND AI — COMMAND-LINE AGENT CONTROLLER ".center(60, "#"))
        print("=" * 60)
        print("1. List Coverage Companies")
        print("2. View Hindsight Ledger")
        print("3. Print ASCII Memory Network Graph")
        print("4. Ingest Simulated Market Event (Run Cycle)")
        print("5. Exit")
        
        try:
            choice = input("\nSelect execution node [1-5]: ").strip()
            if choice == "1":
                list_companies()
            elif choice == "2":
                view_ledger()
            elif choice == "3":
                print_ascii_graph()
            elif choice == "4":
                run_agent_simulation_step()
            elif choice == "5":
                print("\nShutting down cognitive controllers. Standby.")
                break
            else:
                print("Invalid select node. Try again.")
        except KeyboardInterrupt:
            print("\nTerminated.")
            break
        except Exception as e:
            print(f"Execution fault: {e}")

if __name__ == "__main__":
    main()
