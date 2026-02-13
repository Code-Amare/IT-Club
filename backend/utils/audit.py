from django.forms.models import model_to_dict


def get_model_snapshot(instance):
    data = model_to_dict(instance)

    # Convert related fields to ID only
    for field in instance._meta.fields:
        if field.is_relation:
            data[field.name] = getattr(instance, f"{field.name}_id")

    return data
