from django.contrib import admin
from .models import Company, UserProfile, Income, Expense, Salary, MonthlyOpeningBalance, AuditLog

admin.site.register(Company)
admin.site.register(UserProfile)
admin.site.register(Income)
admin.site.register(Expense)
admin.site.register(Salary)
admin.site.register(MonthlyOpeningBalance)
admin.site.register(AuditLog)
