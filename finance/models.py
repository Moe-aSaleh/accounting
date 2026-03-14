from django.db import models
from django.contrib.auth.models import User

class Company(models.Model):
    name = models.CharField(max_length=255)
    logo_url = models.URLField(blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    address = models.CharField(max_length=255, blank=True, default="")
    currency = models.CharField(max_length=10, default="AED")

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    ROLE_OWNER = "owner"
    ROLE_ACCOUNTANT = "accountant"
    ROLE_STAFF = "staff"
    ROLE_VIEWER = "viewer"
    ROLE_CHOICES = [
        (ROLE_OWNER, "Owner"),
        (ROLE_ACCOUNTANT, "Accountant"),
        (ROLE_STAFF, "Staff"),
        (ROLE_VIEWER, "Viewer"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_OWNER,
    )

    def __str__(self):
        return f"{self.user.username} -> {self.company.name} ({self.role})"

class Income(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    spare_parts_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    labor_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.CharField(max_length=255)
    date = models.DateField()

    class Meta:
        indexes = [
            models.Index(fields=["company", "date"]),
        ]

    def __str__(self):
        return f"{self.description} - {self.amount}"

class Expense(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    date = models.DateField()

    class Meta:
        indexes = [
            models.Index(fields=["company", "date"]),
        ]

    def __str__(self):
        return f"{self.description} - {self.amount}"


class Salary(models.Model):
    SALARY_TYPE_FIXED = "fixed"
    SALARY_TYPE_COMMISSION = "commission"
    SALARY_TYPE_CHOICES = [
        (SALARY_TYPE_FIXED, "Fixed"),
        (SALARY_TYPE_COMMISSION, "Commission"),
    ]
    COMMISSION_BASE_LABOR = "labor"
    COMMISSION_BASE_CHOICES = [
        (COMMISSION_BASE_LABOR, "Labor"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    employee_name = models.CharField(max_length=255)
    salary_type = models.CharField(
        max_length=20,
        choices=SALARY_TYPE_CHOICES,
        default=SALARY_TYPE_FIXED,
    )
    commission_base = models.CharField(
        max_length=20,
        choices=COMMISSION_BASE_CHOICES,
        blank=True,
        default="",
    )
    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()

    class Meta:
        indexes = [
            models.Index(fields=["company", "date"]),
        ]

    def __str__(self):
        return f"{self.employee_name} - {self.amount}"


class MonthlyOpeningBalance(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    month = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "month"],
                name="unique_company_opening_balance_month",
            )
        ]

    def __str__(self):
        return f"{self.company.name} - {self.month} - {self.amount}"


class AuditLog(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.CharField(max_length=100, blank=True, default="")
    summary = models.CharField(max_length=255)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M:%S} - {self.action}"
