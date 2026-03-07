from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import (
    clear_month_view,
    clear_year_view,
    create_company_user_view,
    company_settings_view,
    company_users_view,
    IncomeViewSet,
    ExpenseViewSet,
    SalaryViewSet,
    summary_view,
    available_years_view,
    month_overview_view,
    year_overview_view,
    import_monthly_csv_view,
    set_opening_balance_view,
    update_user_role_view,
)

router = DefaultRouter()
router.register(r'income', IncomeViewSet, basename='income')
router.register(r'expense', ExpenseViewSet, basename='expense')
router.register(r'salaries', SalaryViewSet, basename='salaries')

urlpatterns = router.urls + [
    path('summary/', summary_view),
    path('available-years/', available_years_view),
    path('month-overview/', month_overview_view),
    path('year-overview/', year_overview_view),
    path('import-monthly-csv/', import_monthly_csv_view),
    path('clear-month/', clear_month_view),
    path('clear-year/', clear_year_view),
    path('opening-balance/', set_opening_balance_view),
    path('company-settings/', company_settings_view),
    path('company-users/', company_users_view),
    path('company-users/create/', create_company_user_view),
    path('company-users/<int:profile_id>/role/', update_user_role_view),
]
