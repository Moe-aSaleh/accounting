from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0010_userprofile_role"),
    ]

    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Owner"),
                    ("accountant", "Accountant"),
                    ("staff", "Staff"),
                    ("viewer", "Viewer"),
                ],
                default="owner",
                max_length=20,
            ),
        ),
    ]
