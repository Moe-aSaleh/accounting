from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0004_company_expense_company_income_company_userprofile"),
    ]

    operations = [
        migrations.CreateModel(
            name="Salary",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("employee_name", models.CharField(max_length=255)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("date", models.DateField()),
                (
                    "company",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="finance.company",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="auth.user",
                    ),
                ),
            ],
        ),
    ]
