"""
Django settings for the accounting app.

This file is safe for local development and can be promoted to production
through environment variables without code changes.
"""

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    raw_value = os.getenv(name, default)
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def build_database_config():
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        parsed = urlparse(database_url)
        options = {}
        query_values = parse_qs(parsed.query)

        ssl_mode = query_values.get("sslmode", [None])[0]
        if ssl_mode:
            options["sslmode"] = ssl_mode

        channel_binding = query_values.get("channel_binding", [None])[0]
        if channel_binding:
            options["channel_binding"] = channel_binding

        config = {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(parsed.path.lstrip("/")),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or "5432"),
        }

        if options:
            config["OPTIONS"] = options

        return config

    config = {
        "ENGINE": os.getenv("DJANGO_DB_ENGINE", "django.db.backends.sqlite3"),
        "NAME": os.getenv("DJANGO_DB_NAME", str(BASE_DIR / "db.sqlite3")),
        "USER": os.getenv("DJANGO_DB_USER", ""),
        "PASSWORD": os.getenv("DJANGO_DB_PASSWORD", ""),
        "HOST": os.getenv("DJANGO_DB_HOST", ""),
        "PORT": os.getenv("DJANGO_DB_PORT", ""),
    }

    if config["ENGINE"] == "django.db.backends.sqlite3":
        return {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.getenv("DJANGO_DB_NAME", str(BASE_DIR / "db.sqlite3")),
        }

    options = {}
    ssl_mode = os.getenv("DJANGO_DB_SSL_MODE", "").strip()
    if ssl_mode:
        options["sslmode"] = ssl_mode

    channel_binding = os.getenv("DJANGO_DB_CHANNEL_BINDING", "").strip()
    if channel_binding:
        options["channel_binding"] = channel_binding

    if options:
        config["OPTIONS"] = options

    return config


SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-change-me-before-production",
)

DEBUG = env_bool("DJANGO_DEBUG", False)

ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1",
)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "finance",
    "rest_framework",
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"


DATABASES = {
    "default": build_database_config()
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {
            "min_length": 8,
        },
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True


STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("DRF_THROTTLE_ANON", "100/hour"),
        "user": os.getenv("DRF_THROTTLE_USER", "1000/hour"),
        "auth": os.getenv("DRF_THROTTLE_AUTH", "10/minute"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.getenv("JWT_ACCESS_MINUTES", "30"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_REFRESH_DAYS", "1"))
    ),
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "SIGNING_KEY": SECRET_KEY,
}


CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:5173",
)
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173",
)

SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

USE_HTTPS = env_bool("DJANGO_USE_HTTPS", not DEBUG)

SECURE_SSL_REDIRECT = USE_HTTPS
SESSION_COOKIE_SECURE = USE_HTTPS
CSRF_COOKIE_SECURE = USE_HTTPS
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

if USE_HTTPS:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_HSTS_SECONDS", "3600"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
else:
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False


DATA_UPLOAD_MAX_MEMORY_SIZE = int(
    os.getenv("DJANGO_DATA_UPLOAD_MAX_MEMORY_SIZE", str(5 * 1024 * 1024))
)
FILE_UPLOAD_MAX_MEMORY_SIZE = int(
    os.getenv("DJANGO_FILE_UPLOAD_MAX_MEMORY_SIZE", str(5 * 1024 * 1024))
)


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
    },
}
