"""年假额度：每年 14 天，最多 5 天可结转至次年 3 月 31 日，逾期清零。"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

ANNUAL_GRANT_DAYS = 14.0
CARRYOVER_LIMIT_DAYS = 5.0
CARRYOVER_DEADLINE_MONTH = 3
CARRYOVER_DEADLINE_DAY = 31
_EPS = 0.001
_COMPANY_TZ = ZoneInfo("Asia/Shanghai")


def company_today() -> date:
    return datetime.now(_COMPANY_TZ).date()


def carryover_deadline(year: int) -> date:
    return date(year, CARRYOVER_DEADLINE_MONTH, CARRYOVER_DEADLINE_DAY)


def _q(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


@dataclass(frozen=True)
class AnnualLeaveUsage:
    start_date: date
    end_date: date
    days: float
    leave_id: int = 0


@dataclass(frozen=True)
class AnnualLeaveBalance:
    year: int
    grant_days: float
    used_days: float
    remaining_days: float
    carryover_from_year: int | None
    carryover_limit_days: float
    carryover_days: float
    carryover_used_days: float
    carryover_expired_days: float
    carryover_deadline: date
    carryover_active: bool
    total_available: float


def _first_grant_year(usages: list[AnnualLeaveUsage], hire_date: date | None, as_of: date) -> int:
    if hire_date is not None:
        return hire_date.year
    # 未登记入职日期时，仍从上一年起算，保证当年未休假也能结转最多 5 天。
    earliest_leave = min((item.start_date.year for item in usages), default=as_of.year)
    return min(earliest_leave, as_of.year - 1)


def _split_by_year(start: date, end: date, days: float) -> list[tuple[date, date, float]]:
    spans: list[tuple[date, date, int]] = []
    cursor = start
    while cursor <= end:
        year_end = date(cursor.year, 12, 31)
        seg_end = min(end, year_end)
        spans.append((cursor, seg_end, (seg_end - cursor).days + 1))
        cursor = seg_end + timedelta(days=1)

    total_cal = sum(item[2] for item in spans)
    parts: list[tuple[date, date, float]] = []
    allocated = 0.0
    for index, (seg_start, seg_end, cal_days) in enumerate(spans):
        if index == len(spans) - 1:
            seg_days = _q(days - allocated)
        else:
            seg_days = _q(days * cal_days / total_cal)
            allocated = _q(allocated + seg_days)
        parts.append((seg_start, seg_end, seg_days))
    return parts


def _carryover_eligible_days(seg_start: date, seg_end: date, seg_days: float) -> float:
    deadline = carryover_deadline(seg_start.year)
    if seg_end <= deadline:
        return seg_days
    if seg_start > deadline:
        return 0.0
    cal_total = (seg_end - seg_start).days + 1
    cal_eligible = (deadline - seg_start).days + 1
    return min(seg_days, _q(seg_days * cal_eligible / cal_total))


def _replay(
    usages: list[AnnualLeaveUsage], first_year: int
) -> tuple[dict[int, float], dict[int, float], float]:
    """按请假开始日期顺序扣减。结转年假优先于当年额度。

    返回 (各年已占用额度, 各年已使用的上年结转, 无法抵扣的天数)。
    """
    grant_used: dict[int, float] = {}
    carry_used: dict[int, float] = {}
    shortfall = 0.0

    def grant_of(year: int) -> float:
        return ANNUAL_GRANT_DAYS if year >= first_year else 0.0

    def carry_cap(year: int) -> float:
        if grant_of(year - 1) <= 0:
            return 0.0
        unused = max(0.0, grant_of(year - 1) - grant_used.get(year - 1, 0.0))
        return min(CARRYOVER_LIMIT_DAYS, unused)

    ordered = sorted(usages, key=lambda item: (item.start_date, item.end_date, item.leave_id))
    for usage in ordered:
        if usage.end_date < usage.start_date or usage.days <= 0:
            continue
        for seg_start, seg_end, seg_days in _split_by_year(usage.start_date, usage.end_date, usage.days):
            if seg_days <= 0:
                continue
            year = seg_start.year
            eligible = _carryover_eligible_days(seg_start, seg_end, seg_days)
            carry_left = max(0.0, _q(carry_cap(year) - carry_used.get(year, 0.0)))
            take_carry = min(eligible, carry_left)
            rest = _q(seg_days - take_carry)
            grant_left = max(0.0, _q(grant_of(year) - grant_used.get(year, 0.0)))
            take_grant = min(rest, grant_left)
            uncovered = _q(rest - take_grant)
            if uncovered > _EPS:
                shortfall = _q(shortfall + uncovered)
            if take_carry > _EPS:
                carry_used[year] = _q(carry_used.get(year, 0.0) + take_carry)
            if take_grant > _EPS:
                grant_used[year] = _q(grant_used.get(year, 0.0) + take_grant)
    return grant_used, carry_used, shortfall


def annual_leave_shortfall(usages: list[AnnualLeaveUsage], hire_date: date | None, as_of: date | None = None) -> float:
    anchor = as_of or (min((item.start_date for item in usages), default=company_today()))
    first_year = _first_grant_year(usages, hire_date, anchor)
    _, _, shortfall = _replay(usages, first_year)
    return shortfall


def project_annual_leave(
    usages: list[AnnualLeaveUsage],
    *,
    hire_date: date | None,
    as_of: date,
) -> AnnualLeaveBalance:
    first_year = _first_grant_year(usages, hire_date, as_of)
    grant_used, carry_used, _shortfall = _replay(usages, first_year)
    year = as_of.year
    grant_days = ANNUAL_GRANT_DAYS if year >= first_year else 0.0
    used_days = grant_used.get(year, 0.0)
    remaining_days = _q(max(0.0, grant_days - used_days))

    previous_year = year - 1
    has_previous = previous_year >= first_year
    deadline = carryover_deadline(year)
    active = has_previous and as_of <= deadline
    if has_previous:
        unused_previous = max(0.0, ANNUAL_GRANT_DAYS - grant_used.get(previous_year, 0.0))
        cap = min(CARRYOVER_LIMIT_DAYS, unused_previous)
        used_carry = carry_used.get(year, 0.0)
        leftover = _q(max(0.0, cap - used_carry))
        if active:
            carryover_days = leftover
            expired_days = 0.0
        else:
            carryover_days = 0.0
            expired_days = leftover
    else:
        cap = 0.0
        used_carry = 0.0
        carryover_days = 0.0
        expired_days = 0.0

    return AnnualLeaveBalance(
        year=year,
        grant_days=grant_days,
        used_days=used_days,
        remaining_days=remaining_days,
        carryover_from_year=previous_year if has_previous else None,
        carryover_limit_days=CARRYOVER_LIMIT_DAYS,
        carryover_days=carryover_days,
        carryover_used_days=used_carry if has_previous else 0.0,
        carryover_expired_days=expired_days,
        carryover_deadline=deadline,
        carryover_active=active,
        total_available=_q(remaining_days + carryover_days),
    )
