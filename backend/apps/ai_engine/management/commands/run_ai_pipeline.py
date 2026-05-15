"""
Management command: run_ai_pipeline

Triggers the AI parse + score pipeline directly (no broker needed).
Calls the task functions synchronously — works in development with no Redis.

Usage:
    py manage.py run_ai_pipeline
    py manage.py run_ai_pipeline --force   # re-score already-scored apps
    py manage.py run_ai_pipeline --app 42  # single application only
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Run the AI pipeline (parse CV + score) for unscored applications'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Re-score already-scored apps')
        parser.add_argument('--app', type=int, default=None, help='Single application ID')

    def handle(self, *args, **options):
        from apps.applications.models import Application
        from apps.ai_engine.services.cv_parser import parse_cv
        from apps.ai_engine.services.matcher import score_candidate
        from apps.ai_engine.models import CandidateScore
        from decimal import Decimal
        from django.conf import settings

        if options['app']:
            qs = Application.objects.filter(pk=options['app'])
        elif options['force']:
            qs = Application.objects.all()
        else:
            qs = Application.objects.filter(ai_score__isnull=True)

        qs = qs.select_related('job', 'candidate')
        total = qs.count()

        if total == 0:
            self.stdout.write(self.style.WARNING('No applications to process.'))
            return

        self.stdout.write(f'Processing {total} application(s)...\n')

        ok = errors = 0
        model_version = getattr(settings, 'AI_MODEL_VERSION', '1.0.0')

        for app in qs:
            label = f'[{app.pk}] {app.candidate.get_full_name()} -> {app.job.title}'
            self.stdout.write(f'  {label} ... ', ending='')
            try:
                # Step 1: Parse CV
                parsed = parse_cv(app)
                app.ai_parsed_data = parsed
                app.save(update_fields=['ai_parsed_data'])

                if parsed.get('parse_error'):
                    self.stdout.write(self.style.WARNING(f'parse error: {parsed["parse_error"]}'))
                    errors += 1
                    continue

                # Step 2: Score candidate
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

                self.stdout.write(self.style.SUCCESS(f'OK score={app.ai_score:.1f}%'))
                ok += 1

            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'FAILED: {exc}'))
                errors += 1

        self.stdout.write(f'\nDone -- {ok} scored, {errors} errors.')
