import unittest
from datetime import date

from app.services.annual_leave import (
    ANNUAL_GRANT_DAYS,
    AnnualLeaveUsage,
    annual_leave_shortfall,
    project_annual_leave,
)


def _usage(start: str, end: str, days: float, leave_id: int = 1) -> AnnualLeaveUsage:
    return AnnualLeaveUsage(date.fromisoformat(start), date.fromisoformat(end), days, leave_id)


class AnnualLeaveTests(unittest.TestCase):
    def test_missing_hire_date_still_carries_unused_leave(self) -> None:
        during = project_annual_leave([], hire_date=None, as_of=date(2026, 2, 1))
        self.assertEqual(during.carryover_days, 5)
        self.assertEqual(during.total_available, ANNUAL_GRANT_DAYS + 5)
        self.assertTrue(during.carryover_active)

        after = project_annual_leave([], hire_date=None, as_of=date(2026, 9, 30))
        self.assertEqual(after.carryover_expired_days, 5)
        self.assertEqual(after.total_available, ANNUAL_GRANT_DAYS)

    def test_hired_this_year_has_no_previous_carryover(self) -> None:
        balance = project_annual_leave([], hire_date=date(2026, 6, 1), as_of=date(2026, 9, 30))
        self.assertIsNone(balance.carryover_from_year)
        self.assertEqual(balance.carryover_expired_days, 0)
        self.assertEqual(balance.total_available, ANNUAL_GRANT_DAYS)

    def test_five_days_carry_into_next_year_until_march_31(self) -> None:
        balance = project_annual_leave([], hire_date=date(2025, 1, 1), as_of=date(2026, 2, 1))
        self.assertEqual(balance.carryover_days, 5)
        self.assertEqual(balance.remaining_days, 14)
        self.assertEqual(balance.total_available, 19)
        self.assertTrue(balance.carryover_active)
        self.assertEqual(balance.carryover_expired_days, 0)

    def test_unused_carryover_cleared_after_march_31(self) -> None:
        balance = project_annual_leave([], hire_date=date(2025, 1, 1), as_of=date(2026, 4, 1))
        self.assertEqual(balance.carryover_days, 0)
        self.assertEqual(balance.carryover_expired_days, 5)
        self.assertEqual(balance.total_available, 14)
        self.assertFalse(balance.carryover_active)

    def test_only_unused_up_to_five_days_can_carry(self) -> None:
        usages = [_usage("2025-06-01", "2025-06-10", 10)]
        balance = project_annual_leave(usages, hire_date=date(2025, 1, 1), as_of=date(2026, 2, 1))
        self.assertEqual(balance.carryover_days, 4)
        self.assertEqual(balance.total_available, 18)

    def test_carryover_is_consumed_before_current_grant(self) -> None:
        usages = [
            _usage("2025-06-01", "2025-06-10", 10, 1),
            _usage("2026-02-02", "2026-02-04", 3, 2),
        ]
        before_deadline = project_annual_leave(usages, hire_date=date(2025, 1, 1), as_of=date(2026, 2, 15))
        self.assertEqual(before_deadline.carryover_used_days, 3)
        self.assertEqual(before_deadline.carryover_days, 1)
        self.assertEqual(before_deadline.used_days, 0)
        self.assertEqual(before_deadline.total_available, 15)

        after_deadline = project_annual_leave(usages, hire_date=date(2025, 1, 1), as_of=date(2026, 4, 1))
        self.assertEqual(after_deadline.carryover_days, 0)
        self.assertEqual(after_deadline.carryover_expired_days, 1)
        self.assertEqual(after_deadline.remaining_days, 14)
        self.assertEqual(after_deadline.total_available, 14)

    def test_overflow_into_current_grant_is_not_cleared(self) -> None:
        usages = [
            _usage("2025-06-01", "2025-06-10", 10, 1),
            _usage("2026-02-02", "2026-02-07", 6, 2),
        ]
        balance = project_annual_leave(usages, hire_date=date(2025, 1, 1), as_of=date(2026, 4, 1))
        self.assertEqual(balance.carryover_expired_days, 0)
        self.assertEqual(balance.used_days, 2)
        self.assertEqual(balance.remaining_days, 12)
        self.assertEqual(balance.total_available, 12)

    def test_request_after_deadline_cannot_use_expired_carryover(self) -> None:
        usages = [_usage("2026-05-04", "2026-05-19", 16)]
        shortfall = annual_leave_shortfall(usages, date(2025, 1, 1), as_of=date(2026, 5, 1))
        self.assertEqual(shortfall, 2)

        within = [_usage("2026-05-04", "2026-05-17", 14)]
        self.assertEqual(annual_leave_shortfall(within, date(2025, 1, 1)), 0)

    def test_request_before_deadline_can_use_carryover(self) -> None:
        ok = [_usage("2026-01-05", "2026-01-23", 19)]
        self.assertEqual(annual_leave_shortfall(ok, date(2025, 1, 1)), 0)
        over = [_usage("2026-01-05", "2026-01-24", 20)]
        self.assertEqual(annual_leave_shortfall(over, date(2025, 1, 1)), 1)

    def test_half_day(self) -> None:
        usages = [_usage("2026-08-03", "2026-08-15", 13.5)]
        balance = project_annual_leave(usages, hire_date=None, as_of=date(2026, 8, 20))
        self.assertEqual(balance.remaining_days, 0.5)
        self.assertEqual(annual_leave_shortfall(usages + [_usage("2026-09-01", "2026-09-01", 1, 2)], None), 0.5)
        self.assertEqual(annual_leave_shortfall(usages + [_usage("2026-09-01", "2026-09-01", 0.5, 2)], None), 0)

    def test_leave_spanning_deadline_splits_carryover(self) -> None:
        usages = [_usage("2026-03-30", "2026-04-02", 4)]
        balance = project_annual_leave(usages, hire_date=date(2025, 1, 1), as_of=date(2026, 3, 30))
        self.assertEqual(balance.carryover_used_days, 2)
        self.assertEqual(balance.used_days, 2)
        self.assertEqual(balance.carryover_days, 3)
        self.assertEqual(balance.total_available, 15)

    def test_march_31_is_still_valid_and_april_1_clears_remainder(self) -> None:
        usages = [_usage("2026-03-31", "2026-03-31", 1)]
        on_deadline = project_annual_leave(usages, hire_date=date(2025, 1, 1), as_of=date(2026, 3, 31))
        self.assertEqual(on_deadline.carryover_used_days, 1)
        self.assertEqual(on_deadline.carryover_days, 4)
        self.assertEqual(on_deadline.total_available, 18)

        after = project_annual_leave(usages, hire_date=date(2025, 1, 1), as_of=date(2026, 4, 1))
        self.assertEqual(after.carryover_expired_days, 4)
        self.assertEqual(after.total_available, 14)


if __name__ == "__main__":
    unittest.main()
