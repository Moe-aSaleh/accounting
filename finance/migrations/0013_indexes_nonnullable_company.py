from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0012_auditlog'),
    ]

    operations = [
        # Safety: fix any orphaned rows before adding NOT NULL constraint.
        # In practice all rows should already have a company, but this ensures
        # the migration never fails due to unexpected NULL values.
        migrations.RunSQL(
            sql="""
                UPDATE finance_income
                SET company_id = (SELECT id FROM finance_company ORDER BY id LIMIT 1)
                WHERE company_id IS NULL
                  AND (SELECT COUNT(*) FROM finance_company) > 0;

                UPDATE finance_expense
                SET company_id = (SELECT id FROM finance_company ORDER BY id LIMIT 1)
                WHERE company_id IS NULL
                  AND (SELECT COUNT(*) FROM finance_company) > 0;

                UPDATE finance_salary
                SET company_id = (SELECT id FROM finance_company ORDER BY id LIMIT 1)
                WHERE company_id IS NULL
                  AND (SELECT COUNT(*) FROM finance_company) > 0;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Make company non-nullable on Income
        migrations.AlterField(
            model_name='income',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='finance.company',
            ),
        ),

        # Make company non-nullable on Expense
        migrations.AlterField(
            model_name='expense',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='finance.company',
            ),
        ),

        # Make company non-nullable on Salary
        migrations.AlterField(
            model_name='salary',
            name='company',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='finance.company',
            ),
        ),

        # Add composite (company, date) index on Income
        migrations.AddIndex(
            model_name='income',
            index=models.Index(fields=['company', 'date'], name='finance_inc_company_date_idx'),
        ),

        # Add composite (company, date) index on Expense
        migrations.AddIndex(
            model_name='expense',
            index=models.Index(fields=['company', 'date'], name='finance_exp_company_date_idx'),
        ),

        # Add composite (company, date) index on Salary
        migrations.AddIndex(
            model_name='salary',
            index=models.Index(fields=['company', 'date'], name='finance_sal_company_date_idx'),
        ),
    ]
