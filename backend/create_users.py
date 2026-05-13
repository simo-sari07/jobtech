import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.users.models import User

def update_or_create_user(email, password, role, first_name, last_name, is_staff=False, is_superuser=False):
    user, created = User.objects.update_or_create(
        email=email,
        defaults={
            'role': role,
            'first_name': first_name,
            'last_name': last_name,
            'is_staff': is_staff,
            'is_superuser': is_superuser,
            'is_active': True,
        }
    )
    user.set_password(password)
    user.save()
    print(f"{'Created' if created else 'Updated'} {email} as {role}")

# System Admin
update_or_create_user('admin@jobtech.ma', 'Admin123!', 'admin', 'System', 'Admin', True, True)

# HR Manager
update_or_create_user('hr@jobtech.ma', 'Role123!', 'hr_manager', 'Hannah', 'Resources')

# Recruiter
update_or_create_user('recruiter@jobtech.ma', 'Role123!', 'recruiter', 'Rachel', 'Ruiter')

# Candidate
update_or_create_user('candidate@jobtech.ma', 'Role123!', 'candidate', 'Charles', 'Applicant')
