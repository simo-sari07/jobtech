"""
Seed Phase 2 sample data: skills + job offers.
Run: python seed_phase2.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.users.models import User
from apps.jobs.models import Skill, Job

# ── Skills ────────────────────────────────────────────────────────────────────
SKILLS = [
    'Python', 'Django', 'React', 'TypeScript', 'MySQL', 'PostgreSQL',
    'Docker', 'REST API', 'Git', 'JavaScript', 'Node.js', 'TailwindCSS',
    'Machine Learning', 'Communication', 'Agile', 'SQL',
]

print("Creating skills...")
skill_objs = {}
for name in SKILLS:
    skill, created = Skill.objects.get_or_create(name=name)
    skill_objs[name] = skill
    if created:
        print(f"  + {name}")

# ── Jobs ──────────────────────────────────────────────────────────────────────
recruiter = User.objects.filter(role='recruiter').first()
hr        = User.objects.filter(role='hr_manager').first()
creator   = recruiter or hr or User.objects.filter(is_superuser=True).first()

JOBS = [
    {
        'title': 'Senior Django Developer',
        'description': (
            'We are looking for an experienced Django developer to join our backend team.\n\n'
            'Responsibilities:\n'
            '- Design and implement scalable REST APIs\n'
            '- Write clean, well-tested Python code\n'
            '- Collaborate with frontend and DevOps teams\n'
            '- Mentor junior developers\n\n'
            'Requirements:\n'
            '- 4+ years Django experience\n'
            '- Strong understanding of DRF and JWT\n'
            '- Experience with MySQL or PostgreSQL'
        ),
        'contract_type': 'cdi',
        'location': 'Casablanca',
        'experience_years': 4,
        'salary_min': 18000,
        'salary_max': 28000,
        'status': 'open',
        'skills': ['Python', 'Django', 'REST API', 'MySQL', 'Git'],
    },
    {
        'title': 'React Frontend Engineer',
        'description': (
            'Join our product team to build the next generation of our HR platform.\n\n'
            'Responsibilities:\n'
            '- Build responsive UI components in React + TypeScript\n'
            '- Integrate REST APIs with Axios and React Query\n'
            '- Implement state management with Zustand\n\n'
            'Requirements:\n'
            '- 3+ years React experience\n'
            '- Strong TypeScript skills\n'
            '- Experience with TailwindCSS'
        ),
        'contract_type': 'cdi',
        'location': 'Rabat',
        'experience_years': 3,
        'salary_min': 15000,
        'salary_max': 22000,
        'status': 'open',
        'skills': ['React', 'TypeScript', 'JavaScript', 'TailwindCSS', 'Git'],
    },
    {
        'title': 'Full Stack Developer Internship',
        'description': (
            'An exciting internship opportunity for students or recent graduates.\n\n'
            'You will work on real projects alongside senior engineers.\n\n'
            'Requirements:\n'
            '- Some experience with Python or JavaScript\n'
            '- Eager to learn and grow\n'
            '- Available for 6 months minimum'
        ),
        'contract_type': 'internship',
        'location': 'Remote',
        'experience_years': 0,
        'salary_min': 4000,
        'salary_max': 6000,
        'status': 'open',
        'skills': ['Python', 'JavaScript', 'Git'],
    },
    {
        'title': 'Data Scientist',
        'description': (
            'We need a data scientist to help us build ML-powered candidate matching.\n\n'
            'Responsibilities:\n'
            '- Build and train NLP models for CV parsing\n'
            '- Implement TF-IDF scoring for candidate ranking\n'
            '- Collaborate with the backend team to integrate AI features\n\n'
            'Requirements:\n'
            '- 2+ years ML/NLP experience\n'
            '- Python, scikit-learn, spaCy\n'
            '- Strong SQL skills'
        ),
        'contract_type': 'cdi',
        'location': 'Casablanca',
        'experience_years': 2,
        'salary_min': 16000,
        'salary_max': 24000,
        'status': 'draft',
        'skills': ['Python', 'Machine Learning', 'SQL'],
    },
    {
        'title': 'DevOps Engineer',
        'description': (
            'Looking for a DevOps engineer to improve our deployment pipelines.\n\n'
            'Responsibilities:\n'
            '- Manage Docker-based infrastructure\n'
            '- Set up CI/CD with GitHub Actions\n'
            '- Monitor production systems\n\n'
            'Requirements:\n'
            '- Experience with Docker and Linux\n'
            '- Familiarity with Django/Python deployments'
        ),
        'contract_type': 'cdd',
        'location': 'Remote',
        'experience_years': 2,
        'salary_min': 14000,
        'salary_max': 20000,
        'status': 'open',
        'skills': ['Docker', 'Git', 'Python'],
    },
]

print("\nCreating jobs...")
for jd in JOBS:
    skills = jd.pop('skills')
    job, created = Job.objects.get_or_create(
        title=jd['title'],
        defaults={**jd, 'created_by': creator},
    )
    if created:
        job.skills.set([skill_objs[s] for s in skills if s in skill_objs])
        print(f"  + {job.title} [{job.status}]")
    else:
        print(f"  - {job.title} already exists, skipped")

print(f"\nDone! {Job.objects.count()} jobs, {Skill.objects.count()} skills in database.")
