"""
Management command: reprocess_ai

Wipes all corrupt/stale AI data and re-runs the full parse → score pipeline
synchronously for every application. Safe to run multiple times.

Usage:
    py manage.py reprocess_ai              # all applications
    py manage.py reprocess_ai --offer 1    # only applications for job #1
"""
import logging
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Wipe and re-run the AI pipeline (parse + score) for all applications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--offer', type=int, default=None,
            help='Only reprocess applications for this job offer ID',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Show what would be reprocessed without actually doing it',
        )

    def handle(self, *args, **options):
        # Suppress noisy httpx/httpcore logging from the openai SDK
        logging.getLogger('httpx').setLevel(logging.WARNING)
        logging.getLogger('httpcore').setLevel(logging.WARNING)
        logging.getLogger('openai').setLevel(logging.WARNING)

        from apps.applications.models import Application
        from apps.ai_engine.models import CandidateScore
        from apps.ai_engine.services.cv_parser import parse_cv
        from apps.ai_engine.services.matcher import score_candidate
        from decimal import Decimal
        from django.conf import settings

        offer_id = options['offer']
        dry_run  = options['dry_run']

        qs = Application.objects.select_related('job', 'candidate').order_by('pk')
        if offer_id:
            qs = qs.filter(job_id=offer_id)

        apps = list(qs)
        total = len(apps)

        if not apps:
            self.stdout.write(self.style.WARNING('No applications found.'))
            return

        self.stdout.write(f'\n[*] Found {total} application(s) to reprocess.')
        if dry_run:
            for app in apps:
                self.stdout.write(f'  #{app.pk}  {app.candidate.get_full_name()}  job={app.job.title}')
            self.stdout.write(self.style.WARNING('\n[DRY RUN] No changes made.\n'))
            return

        # 1. Wipe all existing AI data
        self.stdout.write('[1] Wiping existing AI data...')
        app_ids = [a.pk for a in apps]
        deleted_count, _ = CandidateScore.objects.filter(application_id__in=app_ids).delete()
        Application.objects.filter(pk__in=app_ids).update(ai_parsed_data=None, ai_score=None)
        self.stdout.write(f'    Cleared {deleted_count} CandidateScore record(s), reset {total} application(s).')

        model_version = getattr(settings, 'AI_MODEL_VERSION', '1.0.0')
        ok_count = 0
        err_count = 0

        for i, app in enumerate(apps, 1):
            # Refresh from DB after bulk update
            app.refresh_from_db()
            name = app.candidate.get_full_name()
            self.stdout.write(f'\n[{i}/{total}] #{app.pk} {name} — {app.job.title}')

            # 2. Parse CV
            self.stdout.write('    Parsing CV...')
            if not app.cv_file:
                self.stdout.write(self.style.WARNING('    SKIP: No CV file attached.'))
                err_count += 1
                continue

            parsed = parse_cv(app)
            app.ai_parsed_data = parsed
            app.save(update_fields=['ai_parsed_data'])

            if parsed.get('parse_error'):
                self.stdout.write(self.style.ERROR(f'    PARSE ERROR: {parsed["parse_error"][:120]}'))
                err_count += 1
                continue

            skills_count = len(parsed.get('skills', []))
            self.stdout.write(self.style.SUCCESS(f'    Parsed OK ({skills_count} skills found)'))

            # 3. Score candidate
            self.stdout.write('    Scoring...')
            score_data = score_candidate(app)

            CandidateScore.objects.update_or_create(
                application=app,
                defaults={
                    'match_score':          Decimal(str(score_data.get('match_score', 0))),
                    'skills_match':         Decimal(str(score_data.get('skills_match', 0))),
                    'experience_match':     Decimal(str(score_data.get('experience_match', 0))),
                    'keyword_score':        Decimal(str(score_data.get('keyword_score', 0))),
                    'extracted_skills':     score_data.get('extracted_skills', []),
                    'extracted_experience': score_data.get('extracted_experience'),
                    'strengths':            score_data.get('strengths', []),
                    'gaps':                 score_data.get('gaps', []),
                    'reasoning':            score_data.get('reasoning', ''),
                    'error':                score_data.get('error', ''),
                    'model_version':        model_version,
                },
            )

            app.ai_score = Decimal(str(score_data.get('match_score', 0)))
            app.save(update_fields=['ai_score'])

            if score_data.get('error'):
                self.stdout.write(self.style.WARNING(f'    SCORE WARNING: {score_data["error"][:120]}'))
                err_count += 1
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'    Scored: {score_data["match_score"]:.1f}%  '
                    f'(skills={score_data["skills_match"]:.0f}, '
                    f'exp={score_data["experience_match"]:.0f}, '
                    f'kw={score_data["keyword_score"]:.0f}, '
                    f'fit={score_data.get("profile_fit", 0):.0f})'
                ))
                ok_count += 1

        self.stdout.write(f'\n{"="*60}')
        self.stdout.write(self.style.SUCCESS(f'[DONE] {ok_count} scored successfully, {err_count} errors, {total} total.'))
        self.stdout.write('')
