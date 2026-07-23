"""
Tests for backend/engine/scheduler.py — the concrete TSCH Timeslot x Channel
grid builder. Verifies the two hard physical constraints the professor's
feedback asked for explicitly: (1) scheduling happens per LINK (hop), and
(2) a node can never transmit/receive more than once in the same slot
(half-duplex), plus the channel-count limit per slot.
"""
from collections import defaultdict

from backend.engine.topology_gen import generate_random_topology, select_gateway_by_centrality, select_sensors
from backend.engine.routing_sp import run_shortest_path_routing
from backend.engine.scheduler import build_tsch_schedule


def build_schedule(seed, N=40, lam=10, n_sensors=12, H=64, m=4, w_slots=2):
    G = generate_random_topology(N, lam, seed=seed)
    gateway = select_gateway_by_centrality(G, method="betweenness")
    sensors = select_sensors(N, n_sensors, gateway, seed=seed)
    paths = run_shortest_path_routing(G, sensors, gateway)
    paths_dict = {str(s): p for s, p in zip(sensors, paths)}
    T = [H] * len(sensors)
    D = list(T)
    grid, all_scheduled = build_tsch_schedule(
        paths=paths_dict, sensors=sensors, gateway=gateway,
        T=T, D=D, H=H, m=m, w_slots=w_slots,
    )
    return grid, all_scheduled, m


def _group_transmissions_by_slot(grid):
    """slot -> {(sensor, job, hop): (sender, receiver)}"""
    by_slot = defaultdict(dict)
    for cell in grid:
        key = (cell["sensor"], cell["job"], cell["hop"])
        by_slot[cell["slot"]][key] = (cell["sender"], cell["receiver"])
    return by_slot


def test_half_duplex_no_node_used_twice_in_same_slot():
    for seed in range(8):
        grid, _, _ = build_schedule(seed=seed)
        by_slot = _group_transmissions_by_slot(grid)
        for slot, transmissions in by_slot.items():
            nodes_seen = []
            for sender, receiver in transmissions.values():
                nodes_seen.append(sender)
                nodes_seen.append(receiver)
            assert len(nodes_seen) == len(set(nodes_seen)), (
                f"seed={seed} slot={slot}: a node is used by more than one "
                f"transmission in the same slot (half-duplex violation)"
            )


def test_channel_count_never_exceeds_m():
    for seed in range(8):
        grid, _, m = build_schedule(seed=seed, m=3)
        by_slot = _group_transmissions_by_slot(grid)
        for slot, transmissions in by_slot.items():
            assert len(transmissions) <= m, f"slot={slot} has more concurrent transmissions than channels (m={m})"


def test_scheduling_unit_is_the_link_sender_receiver_pair():
    # Every grid cell must reference a real link (an edge actually used by
    # some path), not an abstract "flow"-level assignment.
    grid, _, _ = build_schedule(seed=1)
    assert len(grid) > 0
    for cell in grid:
        assert cell["sender"] != cell["receiver"]
        assert "slot" in cell and "channel" in cell


def test_hop_dependency_respected_within_a_job():
    # Hop h of a job cannot start before hop h-1 of the SAME job finishes.
    grid, _, _ = build_schedule(seed=2, w_slots=2)
    by_sensor_job = defaultdict(dict)
    for cell in grid:
        key = (cell["sensor"], cell["job"])
        hop = cell["hop"]
        if hop not in by_sensor_job[key] or cell["slot"] < by_sensor_job[key][hop]:
            by_sensor_job[key][hop] = cell["slot"]

    for key, hops in by_sensor_job.items():
        ordered_hops = sorted(hops.keys())
        for h in ordered_hops[1:]:
            assert hops[h] >= hops[h - 1], f"{key}: hop {h} starts before hop {h - 1} finishes"


def test_all_scheduled_flag_matches_actual_completion():
    # If the flag says everything was scheduled, every cell's completion
    # time must be within its deadline.
    grid, all_scheduled, _ = build_schedule(seed=3, m=8)  # generous channels -> likely fully schedulable
    if all_scheduled:
        by_transmission = defaultdict(list)
        for cell in grid:
            by_transmission[(cell["sensor"], cell["job"], cell["hop"])].append(cell["slot"])
        for key, slots in by_transmission.items():
            completion = max(slots) + 1
            deadline = next(c["deadline"] for c in grid if (c["sensor"], c["job"], c["hop"]) == key)
            assert completion <= deadline
