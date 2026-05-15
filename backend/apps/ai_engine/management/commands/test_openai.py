"""
Management command: test_openai
Usage: python manage.py test_openai

Verifies:
  1. OPENAI_API_KEY is set in settings
  2. The OpenAI client can be instantiated
  3. Each configured model (CV parse / analysis / report) responds correctly
  4. JSON-mode works for each model

Run this after adding a new key to backend/.env to confirm everything is wired up.
"""
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Test the OpenAI API key and model connectivity'

    def handle(self, *args, **options):
        import logging
        # Suppress httpx/httpcore verbose debug logging from the openai SDK
        logging.getLogger('httpx').setLevel(logging.WARNING)
        logging.getLogger('httpcore').setLevel(logging.WARNING)
        logging.getLogger('openai').setLevel(logging.WARNING)

        self.stdout.write('\n[*] Checking OpenAI configuration...\n')

        # ── 1. Key present? ───────────────────────────────────────────────────
        api_key = getattr(settings, 'OPENAI_API_KEY', '')
        if not api_key:
            self.stderr.write(self.style.ERROR(
                '[FAIL] OPENAI_API_KEY is not set in backend/.env\n'
                '       Add it, then restart the server.'
            ))
            return

        masked = f"{api_key[:12]}...{api_key[-4:]}"
        self.stdout.write(f'  Key found: {masked}')

        # ── 2. Import openai (new SDK syntax only) ────────────────────────────
        try:
            from openai import OpenAI  # noqa: PLC0415  -- new SDK, not deprecated
        except ImportError:
            self.stderr.write(self.style.ERROR(
                '[FAIL] openai package not installed.\n'
                '       Run: pip install openai==1.30.1'
            ))
            return

        # Singleton client -- mirrors openai_client.py pattern
        client = OpenAI(api_key=api_key, timeout=60, max_retries=2)

        # ── 3. Test each model ────────────────────────────────────────────────
        models = {
            'CV parser (gpt-4.1-mini)':  getattr(settings, 'OPENAI_CV_PARSE_MODEL',  'gpt-4.1-mini'),
            'Analysis (gpt-4.1)':        getattr(settings, 'OPENAI_ANALYSIS_MODEL',  'gpt-4.1'),
            'Report (gpt-4.1)':          getattr(settings, 'OPENAI_REPORT_MODEL',    'gpt-4.1'),
        }

        all_ok = True
        for label, model in models.items():
            self.stdout.write(f'\n  Testing [{label}] model={model} ...', ending='')
            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=[
                        # NOTE: OpenAI requires the word 'json' in messages when
                        # using response_format={"type": "json_object"}
                        {'role': 'system', 'content': 'Respond with a valid JSON object: {"ok": true}.'},
                        {'role': 'user',   'content': 'Ping'},
                    ],
                    max_tokens=20,
                    response_format={'type': 'json_object'},
                )
                content = resp.choices[0].message.content
                self.stdout.write(self.style.SUCCESS(f'  [OK]  {content.strip()}'))
            except Exception as exc:
                all_ok = False
                self.stdout.write('')  # newline
                self.stderr.write(self.style.ERROR(f'  [FAIL] {type(exc).__name__}: {str(exc)[:200]}'))

        # ── 4. Summary ────────────────────────────────────────────────────────
        self.stdout.write('')
        if all_ok:
            self.stdout.write(self.style.SUCCESS(
                '[PASS] All models OK -- scoring pipeline is ready!\n'
            ))
        else:
            self.stderr.write(self.style.ERROR(
                '[FAIL] One or more models failed.\n'
                '  * AuthenticationError  -> key is revoked or invalid.\n'
                '    Get a fresh key at:  https://platform.openai.com/api-keys\n'
                '    Put it in:           backend/.env  (NEVER in .env.example)\n'
                '    Then restart:        Ctrl+C  then  py manage.py runserver\n'
                '\n'
                '  * NotFoundError        -> model not available on your account.\n'
                '    Edit backend/.env:\n'
                '      OPENAI_CV_PARSE_MODEL=gpt-4o-mini\n'
                '      OPENAI_ANALYSIS_MODEL=gpt-4o\n'
                '      OPENAI_REPORT_MODEL=gpt-4o\n'
            ))
