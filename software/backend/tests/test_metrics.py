"""
Tests for backend/engine/metrics.py — the core schedulability/overlap
formulas. These encode, as permanent regression tests, the manual
consistency checks used to validate the P0 fidelity fix (schedulability
must be evaluated forall t in (0, H], not just t = H).
"""
import math

from backend.engine.metrics import (
    compute_hyperperiod,
    compute_total_overlaps,
    compute_pairwise_overlap_matrix,
    compute_schedulability_status,
    compute_dbf_curves,
    compute_incremental_dbf_series,
    compute_total_overlaps_mg,
    compute_path_overlaps_factor_3hop,
    compute_schedulability_status_mg,
    compute_dbf_curves_mg,
)


def make_flows(paths, T, D, conflict_pair_mode="paper_double", w=2):
    return {
        "n": len(paths),
        "C": [(len(p) - 1) * w for p in paths],
        "T": T,
        "D": D,
        "paths": paths,
        "conflict_pair_mode": conflict_pair_mode,
    }


class TestHyperperiod:
    def test_harmonic_periods_reduce_to_max(self):
        # Powers of two: lcm reduces to the maximum value.
        assert compute_hyperperiod([16, 32, 64, 16]) == 64

    def test_general_lcm(self):
        assert compute_hyperperiod([4, 6]) == 12
        assert compute_hyperperiod([3, 5, 7]) == 105

    def test_single_period(self):
        assert compute_hyperperiod([50]) == 50

    def test_empty(self):
        assert compute_hyperperiod([]) == 1


class TestOverlaps:
    def test_total_overlaps_no_shared_nodes(self):
        paths = [[1, 3, 9], [2, 4, 9]]
        # Fully disjoint intermediate nodes; only the gateway (9) is shared,
        # and the gateway is excluded from the overlap count by definition.
        assert compute_total_overlaps(paths, gateway=9) == 0

    def test_total_overlaps_excludes_gateway(self):
        # Two paths that only meet at the gateway must NOT count as overlap.
        paths = [[1, 5], [2, 5]]
        assert compute_total_overlaps(paths, gateway=5) == 0

    def test_total_overlaps_counts_shared_relay(self):
        paths = [[1, 3, 9], [2, 3, 9]]
        # Node 3 is shared (relay), gateway 9 excluded -> Omega = 1
        assert compute_total_overlaps(paths, gateway=9) == 1

    def test_pairwise_matrix_symmetric_and_zero_diagonal(self):
        paths = [[1, 3, 9], [2, 3, 9], [4, 9]]
        M = compute_pairwise_overlap_matrix(paths, gateway=9)
        assert (M == M.T).all()
        assert all(M[i, i] == 0 for i in range(len(paths)))


class TestSchedulabilityForallT:
    """
    The core P0 fidelity fix: schedulability must be decided by checking
    EVERY window t in (0, H], not just t = H. These tests assert the
    boolean returned by compute_schedulability_status is always consistent
    with an independent scan of compute_dbf_curves (single source of truth).
    """

    def _assert_consistent(self, flows, gateway, m, H):
        is_sched, details = compute_schedulability_status(flows, gateway, m, H)
        curves = compute_dbf_curves(flows, gateway, m, H)
        violations = [c["t"] for c in curves if c["demand"] > c["t"] + 1e-9]
        assert (len(violations) == 0) == is_sched
        if violations:
            assert details["failing_window"] == violations[0]
        else:
            assert details["failing_window"] is None
        return is_sched, details

    def test_schedulable_case(self):
        # Sparse traffic, plenty of channels: should be schedulable.
        paths = [[0, 9], [1, 9]]
        flows = make_flows(paths, T=[128, 128], D=[128, 128])
        is_sched, _ = self._assert_consistent(flows, gateway=9, m=16, H=128)
        assert is_sched is True

    def test_overloaded_case_mid_hyperperiod(self):
        # Many overlapping high-frequency flows with few channels: must be
        # rejected. This is the exact failure mode the professor flagged:
        # an overload that occurs before t = H must still be caught.
        paths = [[0, 5, 9], [1, 5, 9], [2, 5, 9], [3, 5, 9]]
        flows = make_flows(paths, T=[16, 16, 16, 16], D=[16, 16, 16, 16])
        is_sched, details = self._assert_consistent(flows, gateway=9, m=2, H=128)
        assert is_sched is False
        assert details["failing_window"] is not None
        assert details["failing_window"] <= 128

    def test_worst_window_has_minimum_slack(self):
        paths = [[0, 5, 9], [1, 5, 9]]
        flows = make_flows(paths, T=[32, 64], D=[32, 64])
        _, details = compute_schedulability_status(flows, gateway=9, m=4, H=64)
        curves = compute_dbf_curves(flows, gateway=9, m=4, H=64)
        min_slack = min(c["t"] - c["demand"] for c in curves)
        assert math.isclose(details["worst_slack"], min_slack, abs_tol=1e-6)


class TestIncrementalDbf:
    def test_full_prefix_matches_direct_computation(self):
        paths = [[0, 9], [1, 9], [2, 9]]
        flows = make_flows(paths, T=[64, 64, 64], D=[64, 64, 64])
        series = compute_incremental_dbf_series(flows, gateway=9, m=8, H=64)
        assert len(series) == 3
        assert series[-1]["numFlows"] == 3
        # The last entry (all flows) must match the direct schedulability call.
        is_sched_direct, _ = compute_schedulability_status(flows, gateway=9, m=8, H=64)
        assert series[-1]["isSchedulable"] == is_sched_direct

    def test_overlaps_are_non_decreasing_as_flows_are_added(self):
        paths = [[0, 5, 9], [1, 5, 9], [2, 5, 9]]
        flows = make_flows(paths, T=[64, 64, 64], D=[64, 64, 64])
        series = compute_incremental_dbf_series(flows, gateway=9, m=8, H=64)
        overlaps = [pt["totalOverlaps"] for pt in series]
        assert overlaps == sorted(overlaps)


class Test3HopReuseRule:
    def test_no_shared_edges_is_zero(self):
        assert compute_path_overlaps_factor_3hop([0, 1, 2], [3, 4, 5]) == 0

    def test_short_shared_segment_uncapped(self):
        # Shared segment of 2 edges (0-1-2), below the cap of 3.
        assert compute_path_overlaps_factor_3hop([0, 1, 2, 8], [9, 0, 1, 2]) == 2

    def test_long_shared_segment_capped_at_3(self):
        # Shared segment of 5 edges: 0-1-2-3-4-5 -> capped at min(3, 5) = 3.
        p1 = [10, 0, 1, 2, 3, 4, 5]
        p2 = [0, 1, 2, 3, 4, 5, 20]
        assert compute_path_overlaps_factor_3hop(p1, p2) == 3


class TestMultiGatewayMetrics:
    def test_single_gateway_matches_legacy_function(self):
        # With exactly one gateway, the MG overlap function must reduce to
        # the same result as the single-gateway function.
        paths = [[1, 3, 9], [2, 3, 9]]
        assert compute_total_overlaps_mg(paths, gateways=[9]) == compute_total_overlaps(paths, gateway=9)

    def test_excludes_all_gateways(self):
        # Two paths meeting only at DIFFERENT gateways must not count as overlap.
        paths = [[1, 3, 9], [2, 3, 8]]
        # Node 3 is shared and is NOT a gateway -> counts once.
        assert compute_total_overlaps_mg(paths, gateways=[9, 8]) == 1

    def test_mg_schedulability_forall_t_consistent(self):
        paths = [[0, 5, 9], [1, 5, 9], [2, 6, 8]]
        flows = make_flows(paths, T=[16, 16, 32], D=[16, 16, 32])
        is_sched, details = compute_schedulability_status_mg(flows, m=2, H=64)
        curves = compute_dbf_curves_mg(flows, m=2, H=64)
        violations = [c["t"] for c in curves if c["demand"] > c["t"] + 1e-9]
        assert (len(violations) == 0) == is_sched
        if violations:
            assert details["failing_window"] == violations[0]
