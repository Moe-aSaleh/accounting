from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0007_salary_commission_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="MonthlyOpeningBalance",
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
                ("month", models.DateField()),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                (
                    "company",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="finance.company",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="monthlyopeningbalance",
            constraint=models.UniqueConstraint(
                fields=("company", "month"),
                name="unique_company_opening_balance_month",
            ),
        ),
    ]
