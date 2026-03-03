from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0008_monthlyopeningbalance"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="address",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="company",
            name="contact_email",
            field=models.EmailField(blank=True, default="", max_length=254),
        ),
        migrations.AddField(
            model_name="company",
            name="currency",
            field=models.CharField(default="AED", max_length=10),
        ),
        migrations.AddField(
            model_name="company",
            name="logo_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="company",
            name="phone",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
    ]
