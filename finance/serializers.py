from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Company, Income, Expense, Salary, MonthlyOpeningBalance, UserProfile


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "name", "logo_url", "contact_email", "phone", "address", "currency")
        read_only_fields = ("id",)


class UserProfileRoleSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = UserProfile
        fields = ("id", "username", "role")


class CompanyUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=UserProfile.ROLE_CHOICES)

    def validate_username(self, value):
        normalized_value = value.strip()

        if User.objects.filter(username=normalized_value).exists():
            raise serializers.ValidationError("A user with this username already exists.")

        return normalized_value

class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = '__all__'
        read_only_fields = ('id', 'user', 'company', 'amount')

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('id', 'user', 'company')


class SalarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Salary
        fields = '__all__'
        read_only_fields = ('id', 'user', 'company')


class MonthlyOpeningBalanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyOpeningBalance
        fields = "__all__"
        read_only_fields = ("id", "company", "month")
