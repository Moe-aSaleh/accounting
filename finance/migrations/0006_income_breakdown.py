from decimal import Decimal

from django.db import migrations, models


def copy_existing_income_amounts(apps, schema_editor):
    Income = apps.get_model("finance", "Income")

    for income in Income.objects.all():
        income.spare_parts_amount = income.amount or Decimal("0")
        income.labor_amount = Decimal("0")
        income.save(update_fields=["spare_parts_amount", "labor_amount"])


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0005_salary"),
    ]

    operations = [
        migrations.AddField(
            model_name="income",
            name="labor_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="income",
            name="spare_parts_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.RunPython(copy_existing_income_amounts, migrations.RunPython.noop),
    ]
