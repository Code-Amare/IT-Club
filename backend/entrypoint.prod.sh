#!/bin/sh

echo "Waiting for database..."

while ! nc -z db 5432; do
  sleep 0.5
done

echo "Database is up!"

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec daphne core.asgi:application -b 0.0.0.0 -p 8000
