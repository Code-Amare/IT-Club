#!/bin/sh

python manage.py makemigrations
python manage.py migrate
# python manage.py runserver 0.0.0.0:8000
python manage.py runserver_plus 0.0.0.0:8000 --cert-file certs/localhost+2.pem --key-file certs/localhost+2-key.pem
