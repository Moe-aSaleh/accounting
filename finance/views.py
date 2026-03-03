import csv

from datetime import date, datetime
from decimal import Decimal
from calendar import month_name
from django.contrib.auth.models import User
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import api_view
from rest_framework.decorators import parser_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.db.models import Sum
from django.db.models.functions import ExtractMonth, ExtractYear
from django.db import transaction
from django.utils import timezone

from .models import Income, Expense, Salary, MonthlyOpeningBalance, UserProfile
from .serializers import (
    CompanyUserCreateSerializer,
    CompanySerializer,
    IncomeSerializer,
    ExpenseSerializer,
    SalarySerializer,
    MonthlyOpeningBalanceSerializer,
    UserProfileRoleSerializer,
)

MONTH_TILE_YEARS = (2025, 2026)
IMPORT_HEADER_ALIASES = {
    "record_type": "record_type",
    "recordtype": "record_type",
    "record_type_": "record_type",
    "record type": "record_type",
    "type": "record_type",
    "date": "date",
    "month": "date",
    "description": "description",
    "details": "description",
    "employee_name": "employee_name",
    "employee name": "employee_name",
    "employee": "employee_name",
    "spare_parts_amount": "spare_parts_amount",
    "spare parts amount": "spare_parts_amount",
    "spare_parts": "spare_parts_amount",
    "spare parts": "spare_parts_amount",
    "parts": "spare_parts_amount",
    "labor_amount": "labor_amount",
    "labor amount": "labor_amount",
    "labor": "labor_amount",
    "amount": "amount",
    "salary_type": "salary_type",
    "salary type": "salary_type",
    "commission_type": "salary_type",
    "commission type": "salary_type",
    "commission_percentage": "commission_percentage",
    "commission percentage": "commission_percentage",
    "commission_percent": "commission_percentage",
    "commission percent": "commission_percentage",
}


class AuthRateThrottle(AnonRateThrottle):
    scope = "auth"


class SecureTokenObtainPairView(TokenObtainPairView):
    throttle_classes = (AuthRateThrottle,)


class SecureTokenRefreshView(TokenRefreshView):
    throttle_classes = (AuthRateThrottle,)


def get_user_profile(user):
    user_profile = getattr(user, "userprofile", None)

    if user_profile is None:
        raise ValidationError(
            {"detail": "Your account is not linked to a company profile."}
        )

    return user_profile


def get_user_company(user):
    return get_user_profile(user).company


def get_user_role(user):
    return get_user_profile(user).role


def require_user_role(user, *allowed_roles):
    user_role = get_user_role(user)

    if user_role not in allowed_roles:
        raise PermissionDenied("You do not have permission to perform this action.")

    return user_role


def get_selected_month(request):
    month_value = request.query_params.get("month")

    if not month_value:
        return timezone.localdate().replace(day=1)

    try:
        year, month = month_value.split("-")
        return date(int(year), int(month), 1)
    except (TypeError, ValueError):
        raise ValidationError(
            {"detail": "Month must be in YYYY-MM format."}
        )


def get_monthly_filters(request, company):
    selected_month = get_selected_month(request)
    return selected_month, {
        "company": company,
        "date__year": selected_month.year,
        "date__month": selected_month.month,
    }


def get_selected_year(request):
    year_value = request.query_params.get("year")

    if year_value:
        try:
            return int(year_value)
        except (TypeError, ValueError):
            raise ValidationError({"detail": "Year must be in YYYY format."})

    return get_selected_month(request).year


def apply_record_filters(request, queryset):
    month_value = request.query_params.get("month")
    year_value = request.query_params.get("year")

    if month_value:
        selected_month = get_selected_month(request)
        return queryset.filter(
            date__year=selected_month.year,
            date__month=selected_month.month,
        )

    if year_value:
        selected_year = get_selected_year(request)
        return queryset.filter(date__year=selected_year)

    return queryset


def parse_import_date(value):
    supported_formats = (
        "%Y-%m-%d",
        "%Y-%m",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%m/%Y",
    )

    for date_format in supported_formats:
        try:
            return datetime.strptime(value, date_format).date()
        except ValueError:
            continue

    raise ValueError("date")


def build_import_error_message(row_errors):
    if not row_errors:
        return ""

    grouped_errors = {}

    for row_number, message in row_errors:
        grouped_errors.setdefault(message, []).append(row_number)

    summaries = []

    for message, rows in grouped_errors.items():
        if len(rows) == 1:
            summaries.append(f"Row {rows[0]}: {message}")
            continue

        preview_rows = ", ".join(str(row) for row in rows[:5])
        extra_count = len(rows) - 5
        extra_text = f" and {extra_count} more" if extra_count > 0 else ""
        summaries.append(
            f"{len(rows)} rows ({preview_rows}{extra_text}) have this issue: {message}"
        )

    return " ".join(summaries)


def canonicalize_import_key(value):
    if not value:
        return ""

    normalized_value = value.strip().lower().replace("-", " ").replace("_", " ")
    normalized_value = " ".join(normalized_value.split())
    direct_match = IMPORT_HEADER_ALIASES.get(normalized_value)

    if direct_match:
        return direct_match

    fallback_key = normalized_value.replace(" ", "_")
    return IMPORT_HEADER_ALIASES.get(fallback_key, fallback_key)


def get_income_total(validated_data):
    spare_parts_amount = validated_data.get("spare_parts_amount") or Decimal("0")
    labor_amount = validated_data.get("labor_amount") or Decimal("0")
    return spare_parts_amount + labor_amount


def calculate_salary_amount(company, validated_data):
    salary_type = validated_data.get("salary_type") or Salary.SALARY_TYPE_FIXED

    if salary_type == Salary.SALARY_TYPE_COMMISSION:
        commission_base = validated_data.get("commission_base")
        commission_percentage = validated_data.get("commission_percentage")
        salary_date = validated_data.get("date")

        if commission_base != Salary.COMMISSION_BASE_LABOR:
            raise ValidationError(
                {"commission_base": "Only labor commission is supported right now."}
            )

        if commission_percentage is None:
            raise ValidationError(
                {"commission_percentage": "Commission percentage is required."}
            )

        labor_total = Income.objects.filter(
            company=company,
            date__year=salary_date.year,
            date__month=salary_date.month,
        ).aggregate(total=Sum("labor_amount"))["total"] or Decimal("0")

        return (labor_total * commission_percentage) / Decimal("100")

    return validated_data.get("amount") or Decimal("0")


def get_computed_opening_balance(company, selected_month):
    latest_manual_balance = (
        MonthlyOpeningBalance.objects.filter(
            company=company,
            month__lt=selected_month,
        )
        .order_by("-month")
        .first()
    )

    if latest_manual_balance:
        baseline_amount = latest_manual_balance.amount
        activity_filters = {
            "company": company,
            "date__gte": latest_manual_balance.month,
            "date__lt": selected_month,
        }
    else:
        baseline_amount = Decimal("0")
        activity_filters = {
            "company": company,
            "date__lt": selected_month,
        }

    previous_income = Income.objects.filter(**activity_filters).aggregate(total=Sum('amount'))['total'] or 0
    previous_expense = Expense.objects.filter(**activity_filters).aggregate(total=Sum('amount'))['total'] or 0
    previous_salaries = Salary.objects.filter(**activity_filters).aggregate(total=Sum('amount'))['total'] or 0
    return baseline_amount + previous_income - previous_expense - previous_salaries


def get_period_net_change(company, start_date=None, end_date=None):
    activity_filters = {"company": company}

    if start_date is not None:
        activity_filters["date__gte"] = start_date

    if end_date is not None:
        activity_filters["date__lt"] = end_date

    total_income = (
        Income.objects.filter(**activity_filters).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )
    total_expense = (
        Expense.objects.filter(**activity_filters).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )
    total_salaries = (
        Salary.objects.filter(**activity_filters).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    return total_income - total_expense - total_salaries


class IncomeViewSet(ModelViewSet):
    serializer_class = IncomeSerializer

    def get_queryset(self):
        company = get_user_company(self.request.user)
        queryset = Income.objects.filter(company=company)

        if getattr(self, "action", None) == "list":
            return apply_record_filters(self.request, queryset)

        return queryset

    def perform_create(self, serializer):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
            UserProfile.ROLE_STAFF,
        )
        company = get_user_company(self.request.user)
        serializer.save(
            company=company,
            user=self.request.user,
            amount=get_income_total(serializer.validated_data),
        )

    def perform_update(self, serializer):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
            UserProfile.ROLE_STAFF,
        )
        serializer.save(amount=get_income_total(serializer.validated_data))

    def perform_destroy(self, instance):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
            UserProfile.ROLE_STAFF,
        )
        instance.delete()


class ExpenseViewSet(ModelViewSet):
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        company = get_user_company(self.request.user)
        queryset = Expense.objects.filter(company=company)

        if getattr(self, "action", None) == "list":
            return apply_record_filters(self.request, queryset)

        return queryset

    def perform_create(self, serializer):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
            UserProfile.ROLE_STAFF,
        )
        company = get_user_company(self.request.user)
        serializer.save(company=company, user=self.request.user)

    def perform_update(self, serializer):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
            UserProfile.ROLE_STAFF,
        )
        serializer.save()

    def perform_destroy(self, instance):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
            UserProfile.ROLE_STAFF,
        )
        instance.delete()


class SalaryViewSet(ModelViewSet):
    serializer_class = SalarySerializer

    def get_queryset(self):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
            UserProfile.ROLE_VIEWER,
        )
        company = get_user_company(self.request.user)
        queryset = Salary.objects.filter(company=company)

        if getattr(self, "action", None) == "list":
            return apply_record_filters(self.request, queryset)

        return queryset

    def perform_create(self, serializer):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
        )
        company = get_user_company(self.request.user)
        serializer.save(
            company=company,
            user=self.request.user,
            amount=calculate_salary_amount(company, serializer.validated_data),
        )

    def perform_update(self, serializer):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
        )
        company = get_user_company(self.request.user)
        serializer.save(amount=calculate_salary_amount(company, serializer.validated_data))

    def perform_destroy(self, instance):
        require_user_role(
            self.request.user,
            UserProfile.ROLE_OWNER,
            UserProfile.ROLE_ACCOUNTANT,
        )
        instance.delete()


@api_view(['GET'])
def summary_view(request):
    company = get_user_company(request.user)
    selected_month, monthly_filters = get_monthly_filters(request, company)

    total_income = Income.objects.filter(**monthly_filters).aggregate(total=Sum('amount'))['total'] or 0
    spare_parts_income = Income.objects.filter(**monthly_filters).aggregate(
        total=Sum('spare_parts_amount')
    )['total'] or 0
    labor_income = Income.objects.filter(**monthly_filters).aggregate(
        total=Sum('labor_amount')
    )['total'] or 0
    total_expense = Expense.objects.filter(**monthly_filters).aggregate(total=Sum('amount'))['total'] or 0
    total_salaries = Salary.objects.filter(**monthly_filters).aggregate(total=Sum('amount'))['total'] or 0
    manual_opening_balance = MonthlyOpeningBalance.objects.filter(
        company=company,
        month=selected_month,
    ).first()
    opening_balance = (
        manual_opening_balance.amount
        if manual_opening_balance
        else get_computed_opening_balance(company, selected_month)
    )
    monthly_balance = total_income - total_expense - total_salaries
    closing_balance = opening_balance + monthly_balance

    return Response({
        "month": selected_month.strftime("%B %Y"),
        "month_key": selected_month.strftime("%Y-%m"),
        "opening_balance": opening_balance,
        "has_manual_opening_balance": bool(manual_opening_balance),
        "total_income": total_income,
        "spare_parts_income": spare_parts_income,
        "labor_income": labor_income,
        "total_expense": total_expense,
        "total_salaries": total_salaries,
        "monthly_balance": monthly_balance,
        "closing_balance": closing_balance,
    })


@api_view(['GET'])
def month_overview_view(request):
    company = get_user_company(request.user)
    monthly_income_rows = (
        Income.objects.filter(company=company, date__year__in=MONTH_TILE_YEARS)
        .annotate(year=ExtractYear("date"), month=ExtractMonth("date"))
        .values("year", "month")
        .annotate(total_income=Sum("amount"))
    )
    totals_by_key = {
        (int(row["year"]), int(row["month"])): row["total_income"] or 0
        for row in monthly_income_rows
    }
    month_tiles = []

    for year in MONTH_TILE_YEARS:
        for month in range(1, 13):
            month_tiles.append({
                "month_key": f"{year}-{month:02d}",
                "label": month_name[month],
                "year": year,
                "total_income": totals_by_key.get((year, month), 0),
            })

    return Response(month_tiles)


@api_view(['GET'])
def year_overview_view(request):
    company = get_user_company(request.user)
    selected_year = get_selected_year(request)
    year_start = date(selected_year, 1, 1)

    income_rows = (
        Income.objects.filter(company=company, date__year=selected_year)
        .annotate(month=ExtractMonth("date"))
        .values("month")
        .annotate(
            total_income=Sum("amount"),
            spare_parts_income=Sum("spare_parts_amount"),
            labor_income=Sum("labor_amount"),
        )
    )
    expense_rows = (
        Expense.objects.filter(company=company, date__year=selected_year)
        .annotate(month=ExtractMonth("date"))
        .values("month")
        .annotate(total_expense=Sum("amount"))
    )
    salary_rows = (
        Salary.objects.filter(company=company, date__year=selected_year)
        .annotate(month=ExtractMonth("date"))
        .values("month")
        .annotate(total_salaries=Sum("amount"))
    )
    manual_balance_rows = MonthlyOpeningBalance.objects.filter(
        company=company,
        month__year=selected_year,
    )
    manual_opening_by_month = {
        row.month.month: row.amount for row in manual_balance_rows
    }
    income_by_month = {
        int(row["month"]): {
            "total_income": row["total_income"] or Decimal("0"),
            "spare_parts_income": row["spare_parts_income"] or Decimal("0"),
            "labor_income": row["labor_income"] or Decimal("0"),
        }
        for row in income_rows
    }
    expense_by_month = {
        int(row["month"]): row["total_expense"] or Decimal("0") for row in expense_rows
    }
    salary_by_month = {
        int(row["month"]): row["total_salaries"] or Decimal("0") for row in salary_rows
    }

    latest_manual_balance = (
        MonthlyOpeningBalance.objects.filter(company=company, month__lt=year_start)
        .order_by("-month")
        .first()
    )
    initial_opening_balance = (
        (latest_manual_balance.amount if latest_manual_balance else Decimal("0"))
        + get_period_net_change(
            company,
            start_date=latest_manual_balance.month if latest_manual_balance else None,
            end_date=year_start,
        )
    )
    months = []
    running_closing_balance = None

    for month in range(1, 13):
        selected_month = date(selected_year, month, 1)
        income_totals = income_by_month.get(
            month,
            {
                "total_income": Decimal("0"),
                "spare_parts_income": Decimal("0"),
                "labor_income": Decimal("0"),
            },
        )
        total_income = income_totals["total_income"]
        spare_parts_income = income_totals["spare_parts_income"]
        labor_income = income_totals["labor_income"]
        total_expense = expense_by_month.get(month, Decimal("0"))
        total_salaries = salary_by_month.get(month, Decimal("0"))
        opening_balance = manual_opening_by_month.get(
            month,
            initial_opening_balance if running_closing_balance is None else running_closing_balance,
        )
        net_profit = total_income - total_expense - total_salaries
        closing_balance = opening_balance + net_profit
        running_closing_balance = closing_balance

        months.append(
            {
                "month": month_name[month],
                "month_key": selected_month.strftime("%Y-%m"),
                "opening_balance": opening_balance,
                "total_income": total_income,
                "spare_parts_income": spare_parts_income,
                "labor_income": labor_income,
                "total_expense": total_expense,
                "total_salaries": total_salaries,
                "net_profit": net_profit,
                "closing_balance": closing_balance,
            }
        )

    return Response(
        {
            "year": selected_year,
            "months": months,
        }
    )


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def import_monthly_csv_view(request):
    require_user_role(request.user, UserProfile.ROLE_OWNER)
    company = get_user_company(request.user)
    upload = request.FILES.get("file")

    if upload is None:
        raise ValidationError({"detail": "Please choose a CSV file to import."})

    try:
        decoded_lines = upload.read().decode("utf-8-sig").splitlines()
    except UnicodeDecodeError:
        raise ValidationError({"detail": "The uploaded file must be a UTF-8 CSV."})

    reader = csv.DictReader(decoded_lines)

    if not reader.fieldnames:
        raise ValidationError({"detail": "The CSV file is empty."})

    normalized_headers = {canonicalize_import_key(header) for header in reader.fieldnames if header}
    required_headers = {"record_type", "date"}

    if not required_headers.issubset(normalized_headers):
        raise ValidationError(
            {"detail": "The CSV must include at least record_type and date columns."}
        )

    prepared_rows = []
    row_errors = []

    for row_number, row in enumerate(reader, start=2):
        normalized_row = {
            canonicalize_import_key(key): (value.strip() if value else "")
            for key, value in row.items()
        }

        if not any(normalized_row.values()):
            continue

        record_type = normalized_row.get("record_type", "").lower()
        date_value = normalized_row.get("date", "")

        try:
            record_date = parse_import_date(date_value)
        except ValueError:
            row_errors.append(
                (
                    row_number,
                    "date must be in YYYY-MM-DD, YYYY-MM, DD/MM/YYYY, MM/DD/YYYY, or MM/YYYY format.",
                )
            )
            continue

        if record_type not in {"income", "expense", "salary"}:
            row_errors.append(
                (
                    row_number,
                    "record_type must be income, expense, or salary.",
                )
            )
            continue

        prepared_rows.append(
            {
                "row_number": row_number,
                "record_type": record_type,
                "record_date": record_date,
                "data": normalized_row,
            }
        )

    if row_errors:
        raise ValidationError({"detail": build_import_error_message(row_errors)})

    if not prepared_rows:
        raise ValidationError({"detail": "The CSV file does not contain any data rows."})

    created_counts = {
        "income": 0,
        "expense": 0,
        "salary": 0,
    }
    imported_months = set()

    with transaction.atomic():
        for row_group in ("income", "expense", "salary"):
            group_rows = [row for row in prepared_rows if row["record_type"] == row_group]

            for row in group_rows:
                row_number = row["row_number"]
                row_data = row["data"]
                record_date = row["record_date"].isoformat()
                imported_months.add(row["record_date"].strftime("%Y-%m"))

                if row_group == "income":
                    serializer = IncomeSerializer(
                        data={
                            "description": row_data.get("description", ""),
                            "spare_parts_amount": row_data.get("spare_parts_amount") or "0",
                            "labor_amount": row_data.get("labor_amount") or "0",
                            "date": record_date,
                        }
                    )
                    try:
                        serializer.is_valid(raise_exception=True)
                    except ValidationError as exc:
                        raise ValidationError(
                            {"detail": f"Row {row_number}: {exc.detail}"}
                        )
                    serializer.save(
                        company=company,
                        user=request.user,
                        amount=get_income_total(serializer.validated_data),
                    )
                elif row_group == "expense":
                    serializer = ExpenseSerializer(
                        data={
                            "description": row_data.get("description", ""),
                            "amount": row_data.get("amount", ""),
                            "date": record_date,
                        }
                    )
                    try:
                        serializer.is_valid(raise_exception=True)
                    except ValidationError as exc:
                        raise ValidationError(
                            {"detail": f"Row {row_number}: {exc.detail}"}
                        )
                    serializer.save(company=company, user=request.user)
                else:
                    salary_type = (row_data.get("salary_type") or Salary.SALARY_TYPE_FIXED).lower()
                    serializer = SalarySerializer(
                        data={
                            "employee_name": row_data.get("employee_name", ""),
                            "salary_type": salary_type,
                            "commission_base": (
                                Salary.COMMISSION_BASE_LABOR
                                if salary_type == Salary.SALARY_TYPE_COMMISSION
                                else ""
                            ),
                            "commission_percentage": (
                                row_data.get("commission_percentage") or None
                                if salary_type == Salary.SALARY_TYPE_COMMISSION
                                else None
                            ),
                            "amount": row_data.get("amount") or "0",
                            "date": record_date,
                        }
                    )
                    try:
                        serializer.is_valid(raise_exception=True)
                        serializer.save(
                            company=company,
                            user=request.user,
                            amount=calculate_salary_amount(company, serializer.validated_data),
                        )
                    except ValidationError as exc:
                        raise ValidationError(
                            {"detail": f"Row {row_number}: {exc.detail}"}
                        )

                created_counts[row_group] += 1

    return Response(
        {
            "imported": created_counts,
            "months": sorted(imported_months),
        }
    )


@api_view(['POST'])
def clear_month_view(request):
    require_user_role(request.user, UserProfile.ROLE_OWNER)
    company = get_user_company(request.user)
    selected_month = get_selected_month(request)
    monthly_filters = {
        "company": company,
        "date__year": selected_month.year,
        "date__month": selected_month.month,
    }

    deleted_income, _ = Income.objects.filter(**monthly_filters).delete()
    deleted_expense, _ = Expense.objects.filter(**monthly_filters).delete()
    deleted_salary, _ = Salary.objects.filter(**monthly_filters).delete()

    return Response(
        {
            "month": selected_month.strftime("%B %Y"),
            "deleted": {
                "income": deleted_income,
                "expense": deleted_expense,
                "salary": deleted_salary,
            },
        }
    )


@api_view(['POST'])
def set_opening_balance_view(request):
    require_user_role(request.user, UserProfile.ROLE_OWNER)
    company = get_user_company(request.user)
    selected_month = get_selected_month(request)
    existing_balance = MonthlyOpeningBalance.objects.filter(
        company=company,
        month=selected_month,
    ).first()

    serializer = MonthlyOpeningBalanceSerializer(
        existing_balance,
        data=request.data,
        partial=True,
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(company=company, month=selected_month)

    return Response(
        {
            "month": selected_month.strftime("%B %Y"),
            "opening_balance": serializer.instance.amount,
        }
    )


@api_view(['GET', 'PUT'])
def company_settings_view(request):
    user_profile = get_user_profile(request.user)
    company = user_profile.company

    if request.method == 'GET':
        payload = CompanySerializer(company).data
        payload["current_user_role"] = user_profile.role
        payload["current_username"] = request.user.username
        return Response(payload)

    require_user_role(request.user, UserProfile.ROLE_OWNER)

    serializer = CompanySerializer(company, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
def company_users_view(request):
    require_user_role(request.user, UserProfile.ROLE_OWNER)
    company = get_user_company(request.user)
    profiles = UserProfile.objects.filter(company=company).select_related("user").order_by("user__username")
    return Response(UserProfileRoleSerializer(profiles, many=True).data)


@api_view(['PUT'])
def update_user_role_view(request, profile_id):
    require_user_role(request.user, UserProfile.ROLE_OWNER)

    if request.user.userprofile.id == profile_id:
        raise PermissionDenied("You cannot change your own role here.")

    company = get_user_company(request.user)
    profile = UserProfile.objects.filter(company=company, id=profile_id).select_related("user").first()

    if profile is None:
        raise ValidationError({"detail": "User was not found for this company."})

    serializer = UserProfileRoleSerializer(profile, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
def create_company_user_view(request):
    require_user_role(request.user, UserProfile.ROLE_OWNER)
    company = get_user_company(request.user)
    serializer = CompanyUserCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    with transaction.atomic():
        user = User.objects.create_user(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        profile = UserProfile.objects.create(
            user=user,
            company=company,
            role=serializer.validated_data["role"],
        )

    return Response(UserProfileRoleSerializer(profile).data, status=201)
