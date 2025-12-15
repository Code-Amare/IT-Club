FROM python:3.11

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Only copy requirements first to cache dependencies

COPY requirements.txt ./

RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the rest of the code after dependencies are installed

COPY . .

EXPOSE 8000

