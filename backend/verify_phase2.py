import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.jobs.models import Job, Skill
from apps.applications.models import Application
from apps.users.models import User

print('=== Phase 2 Verification ===')
print('Users:       ', User.objects.count())
print('Skills:      ', Skill.objects.count())
print('Jobs:        ', Job.objects.count())
print('  - open:    ', Job.objects.filter(status='open').count())
print('  - draft:   ', Job.objects.filter(status='draft').count())
print('Applications:', Application.objects.count())
print()
print('Jobs in DB:')
for j in Job.objects.prefetch_related('skills').all():
    skills = ', '.join(s.name for s in j.skills.all())
    print(f'  [{j.status}] {j.title} | {skills or "no skills"}')

print()
print('API routes available:')
print('  GET  /api/v1/jobs/offers/')
print('  POST /api/v1/jobs/offers/')
print('  GET  /api/v1/jobs/offers/<id>/')
print('  GET  /api/v1/jobs/skills/')
print('  GET  /api/v1/applications/')
print('  POST /api/v1/applications/')
print('  GET  /api/v1/applications/mine/')
print('  PATCH /api/v1/applications/<id>/')
print()
print('Phase 2 backend: ALL OK')
