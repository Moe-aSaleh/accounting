from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0009_company_settings_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Owner"),
                    ("accountant", "Accountant"),
                    ("staff", "Staff"),
                ],
                default="owner",
                max_length=20,
            ),
        ),
    ]
