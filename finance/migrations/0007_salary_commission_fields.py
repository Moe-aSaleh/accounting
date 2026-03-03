from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0006_income_breakdown"),
    ]

    operations = [
        migrations.AddField(
            model_name="salary",
            name="commission_base",
            field=models.CharField(blank=True, choices=[("labor", "Labor")], default="", max_length=20),
        ),
        migrations.AddField(
            model_name="salary",
            name="commission_percentage",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name="salary",
            name="salary_type",
            field=models.CharField(
                choices=[("fixed", "Fixed"), ("commission", "Commission")],
                default="fixed",
                max_length=20,
            ),
        ),
    ]
