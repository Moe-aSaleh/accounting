from django.contrib import admin
from .models import Company, UserProfile, Income, Expense

admin.site.register(Company)
admin.site.register(UserProfile)
admin.site.register(Income)
admin.site.register(Expense)