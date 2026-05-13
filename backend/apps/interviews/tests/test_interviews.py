"""
Full test suite for the interviews app.

Coverage:
  - Interview model:  __str__, compute status, can_be_evaluated
  - Evaluation model: overall_score weighted average, auto-save
  - interview_service: schedule, status transitions, evaluation, queryset scoping
  - InterviewViewSet:  full lifecycle via API (schedule → complete → evaluate)
  - Permission matrix: candidate / recruiter / hr_manager / admin
  - Celery task:       send_interview_reminders filters and marks correctly
"""
import pytest
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.interviews.models import Interview, Evaluation
from apps.interviews.services.interview_service import (
    schedule_interview,
    update_interview,
    submit_evaluation,
    get_interviews_queryset,
)
from apps.interviews.tests.factories import InterviewFactory, EvaluationFactory


# ─────────────────────────────────────────────────────────────────────────────
# Shared fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def admin_user(django_user_model):
    return django_user_model.objects.create_user(
        email='admin@test.com', password='pass', role='admin',
        first_name='Admin', last_name='User',
    )


@pytest.fixture
def recruiter_user(django_user_model):
    return django_user_model.objects.create_user(
        email='recruiter@test.com', password='pass', role='recruiter',
        first_name='Recruiter', last_name='One',
    )


@pytest.fixture
def hr_user(django_user_model):
    return django_user_model.objects.create_user(
        email='hr@test.com', password='pass', role='hr_manager',
        first_name='HR', last_name='Manager',
    )


@pytest.fixture
def candidate_user(django_user_model):
    return django_user_model.objects.create_user(
        email='candidate@test.com', password='pass', role='candidate',
        first_name='Jane', last_name='Doe',
    )


@pytest.fixture
def job(recruiter_user):
    from apps.jobs.models import Job
    return Job.objects.create(
        title='Senior Django Dev',
        description='Great job',
        contract_type='cdi',
        location='Casablanca',
        experience_years=3,
        status='open',
        created_by=recruiter_user,
    )


@pytest.fixture
def application(candidate_user, job):
    from apps.applications.models import Application
    import tempfile, os
    # Create a minimal dummy PDF file for the cv_file field
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(b'%PDF-1.4 dummy')
        tmp_path = f.name
    from django.core.files import File
    app = Application(
        candidate=candidate_user,
        job=job,
        status=Application.Status.SHORTLISTED,
    )
    with open(tmp_path, 'rb') as f:
        app.cv_file.save('cv_test.pdf', File(f), save=False)
    app.save()
    os.unlink(tmp_path)
    return app


@pytest.fixture
def scheduled_interview(application, recruiter_user):
    return InterviewFactory(
        application=application,
        recruiter=recruiter_user,
        scheduled_at=timezone.now() + timedelta(days=2),
    )


@pytest.fixture
def completed_interview(scheduled_interview):
    scheduled_interview.status = Interview.Status.COMPLETED
    scheduled_interview.save()
    return scheduled_interview


# ─────────────────────────────────────────────────────────────────────────────
# Model tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestInterviewModel:
    def test_str_representation(self, scheduled_interview):
        s = str(scheduled_interview)
        assert 'candidate@test.com' in s
        assert 'scheduled' in s.lower()

    def test_is_completed_false_by_default(self, scheduled_interview):
        assert scheduled_interview.is_completed is False

    def test_is_completed_true_after_completion(self, completed_interview):
        assert completed_interview.is_completed is True

    def test_default_duration(self, scheduled_interview):
        assert scheduled_interview.duration_minutes == 60

    def test_reminder_sent_false_by_default(self, scheduled_interview):
        assert scheduled_interview.reminder_sent is False


@pytest.mark.django_db
class TestEvaluationModel:
    def test_overall_score_weighted_average(self, completed_interview, recruiter_user):
        """
        technical=4 (40%) + communication=3 (25%) + problem_solving=4 (25%) + motivation=5 (10%)
        = 1.60 + 0.75 + 1.00 + 0.50 = 3.85
        """
        ev = Evaluation.objects.create(
            interview=completed_interview,
            evaluator=recruiter_user,
            technical_score=4,
            communication_score=3,
            motivation_score=5,
            problem_solving_score=4,
            recommendation=Evaluation.Recommendation.HIRE,
        )
        assert ev.overall_score == Decimal('3.85')

    def test_perfect_scores_give_five(self, completed_interview, recruiter_user):
        ev = Evaluation.objects.create(
            interview=completed_interview,
            evaluator=recruiter_user,
            technical_score=5,
            communication_score=5,
            motivation_score=5,
            problem_solving_score=5,
            recommendation=Evaluation.Recommendation.HIRE,
        )
        assert ev.overall_score == Decimal('5.00')

    def test_minimum_scores_give_one(self, completed_interview, recruiter_user):
        ev = Evaluation.objects.create(
            interview=completed_interview,
            evaluator=recruiter_user,
            technical_score=1,
            communication_score=1,
            motivation_score=1,
            problem_solving_score=1,
            recommendation=Evaluation.Recommendation.REJECT,
        )
        assert ev.overall_score == Decimal('1.00')

    def test_str_representation(self, completed_interview, recruiter_user):
        ev = EvaluationFactory(
            interview=completed_interview,
            evaluator=recruiter_user,
        )
        assert 'hire' in str(ev).lower() or 'Hire' in str(ev)


# ─────────────────────────────────────────────────────────────────────────────
# Service layer tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestScheduleInterview:
    def test_creates_interview_successfully(self, recruiter_user, application):
        interview = schedule_interview(recruiter_user, {
            'application': application,
            'interview_type': Interview.InterviewType.VIDEO,
            'scheduled_at': timezone.now() + timedelta(days=3),
            'duration_minutes': 60,
            'location_or_link': 'https://zoom.us/test',
        })
        assert interview.pk is not None
        assert interview.status == Interview.Status.SCHEDULED
        assert interview.recruiter == recruiter_user

    def test_rejects_non_shortlisted_application(self, recruiter_user, application):
        from rest_framework.exceptions import ValidationError
        application.status = 'pending'
        application.save()
        with pytest.raises(ValidationError, match='shortlisted'):
            schedule_interview(recruiter_user, {
                'application': application,
                'interview_type': Interview.InterviewType.PHONE,
                'scheduled_at': timezone.now() + timedelta(days=1),
                'duration_minutes': 30,
            })

    def test_rejects_past_scheduled_date(self, recruiter_user, application):
        from rest_framework.exceptions import ValidationError
        with pytest.raises(ValidationError, match='future'):
            schedule_interview(recruiter_user, {
                'application': application,
                'interview_type': Interview.InterviewType.ONSITE,
                'scheduled_at': timezone.now() - timedelta(hours=1),
                'duration_minutes': 60,
            })

    def test_candidate_cannot_schedule(self, candidate_user, application):
        from rest_framework.exceptions import PermissionDenied
        with pytest.raises(PermissionDenied):
            schedule_interview(candidate_user, {
                'application': application,
                'interview_type': Interview.InterviewType.VIDEO,
                'scheduled_at': timezone.now() + timedelta(days=1),
                'duration_minutes': 45,
            })


@pytest.mark.django_db
class TestUpdateInterview:
    def test_scheduled_to_completed(self, scheduled_interview, recruiter_user):
        updated = update_interview(
            scheduled_interview, recruiter_user,
            {'status': Interview.Status.COMPLETED}
        )
        assert updated.status == Interview.Status.COMPLETED

    def test_scheduled_to_cancelled(self, scheduled_interview, recruiter_user):
        updated = update_interview(
            scheduled_interview, recruiter_user,
            {'status': Interview.Status.CANCELLED}
        )
        assert updated.status == Interview.Status.CANCELLED

    def test_scheduled_to_no_show(self, scheduled_interview, recruiter_user):
        updated = update_interview(
            scheduled_interview, recruiter_user,
            {'status': Interview.Status.NO_SHOW}
        )
        assert updated.status == Interview.Status.NO_SHOW

    def test_completed_is_terminal(self, completed_interview, recruiter_user):
        from rest_framework.exceptions import ValidationError
        with pytest.raises(ValidationError, match='terminal|Cannot'):
            update_interview(
                completed_interview, recruiter_user,
                {'status': Interview.Status.CANCELLED}
            )

    def test_notes_can_be_updated(self, scheduled_interview, recruiter_user):
        updated = update_interview(
            scheduled_interview, recruiter_user,
            {'notes': 'Candidate confirmed.'}
        )
        assert updated.notes == 'Candidate confirmed.'

    def test_candidate_cannot_update(self, scheduled_interview, candidate_user):
        from rest_framework.exceptions import PermissionDenied
        with pytest.raises(PermissionDenied):
            update_interview(
                scheduled_interview, candidate_user,
                {'status': Interview.Status.CANCELLED}
            )


@pytest.mark.django_db
class TestSubmitEvaluation:
    def _eval_data(self):
        return {
            'technical_score': 4,
            'communication_score': 3,
            'motivation_score': 4,
            'problem_solving_score': 5,
            'recommendation': Evaluation.Recommendation.HIRE,
            'comments': 'Great candidate.',
        }

    def test_creates_evaluation_for_completed_interview(
        self, completed_interview, recruiter_user
    ):
        ev = submit_evaluation(completed_interview, recruiter_user, self._eval_data())
        assert ev.pk is not None
        assert ev.overall_score is not None
        assert ev.evaluator == recruiter_user

    def test_rejects_if_interview_not_completed(self, scheduled_interview, recruiter_user):
        from rest_framework.exceptions import ValidationError
        with pytest.raises(ValidationError, match='completed'):
            submit_evaluation(scheduled_interview, recruiter_user, self._eval_data())

    def test_rejects_duplicate_evaluation(self, completed_interview, recruiter_user):
        from rest_framework.exceptions import ValidationError
        submit_evaluation(completed_interview, recruiter_user, self._eval_data())
        # Reload to get evaluation attached
        completed_interview.refresh_from_db()
        with pytest.raises(ValidationError, match='already been evaluated'):
            submit_evaluation(completed_interview, recruiter_user, self._eval_data())

    def test_candidate_cannot_evaluate(self, completed_interview, candidate_user):
        from rest_framework.exceptions import PermissionDenied
        with pytest.raises(PermissionDenied):
            submit_evaluation(completed_interview, candidate_user, self._eval_data())


@pytest.mark.django_db
class TestGetInterviewsQueryset:
    def test_recruiter_sees_only_own_interviews(
        self, recruiter_user, hr_user, application
    ):
        mine = InterviewFactory(
            application=application, recruiter=recruiter_user,
            scheduled_at=timezone.now() + timedelta(days=1),
        )
        # Create another interview assigned to hr_user
        other_app = application  # reuse; recruiter field differs
        InterviewFactory(
            application=application, recruiter=hr_user,
            scheduled_at=timezone.now() + timedelta(days=3),
        )
        qs = get_interviews_queryset(recruiter_user)
        ids = list(qs.values_list('id', flat=True))
        assert mine.id in ids
        # Hr_user's interview should NOT appear for recruiter
        assert all(Interview.objects.get(pk=i).recruiter == recruiter_user for i in ids)

    def test_hr_sees_all_interviews(self, recruiter_user, hr_user, application):
        InterviewFactory(
            application=application, recruiter=recruiter_user,
            scheduled_at=timezone.now() + timedelta(days=1),
        )
        qs = get_interviews_queryset(hr_user)
        assert qs.count() >= 1

    def test_candidate_sees_own_interviews(
        self, candidate_user, recruiter_user, application
    ):
        interview = InterviewFactory(
            application=application, recruiter=recruiter_user,
            scheduled_at=timezone.now() + timedelta(days=1),
        )
        qs = get_interviews_queryset(candidate_user)
        assert interview in qs


# ─────────────────────────────────────────────────────────────────────────────
# API view tests — full lifecycle
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestInterviewAPI:
    LIST_URL   = '/api/v1/interviews/'
    DETAIL_URL = '/api/v1/interviews/{}/'
    EVALUATE_URL = '/api/v1/interviews/{}/evaluate/'
    EVAL_READ_URL = '/api/v1/interviews/{}/evaluation/'

    def _auth(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_recruiter_can_schedule_interview(
        self, recruiter_user, application
    ):
        client = self._auth(recruiter_user)
        payload = {
            'application': application.id,
            'interview_type': 'video',
            'scheduled_at': (timezone.now() + timedelta(days=3)).isoformat(),
            'duration_minutes': 60,
            'location_or_link': 'https://meet.example.com',
        }
        resp = client.post(self.LIST_URL, payload, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['status'] == 'scheduled'

    def test_candidate_cannot_schedule_interview(
        self, candidate_user, application
    ):
        client = self._auth(candidate_user)
        payload = {
            'application': application.id,
            'interview_type': 'video',
            'scheduled_at': (timezone.now() + timedelta(days=3)).isoformat(),
            'duration_minutes': 60,
        }
        resp = client.post(self.LIST_URL, payload, format='json')
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_list_returns_own_interviews_for_recruiter(
        self, recruiter_user, scheduled_interview
    ):
        client = self._auth(recruiter_user)
        resp = client.get(self.LIST_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = [r['id'] for r in resp.data['results']]
        assert scheduled_interview.id in ids

    def test_candidate_sees_own_interviews(
        self, candidate_user, scheduled_interview
    ):
        client = self._auth(candidate_user)
        resp = client.get(self.LIST_URL)
        assert resp.status_code == status.HTTP_200_OK
        ids = [r['id'] for r in resp.data['results']]
        assert scheduled_interview.id in ids

    def test_patch_status_to_completed(
        self, recruiter_user, scheduled_interview
    ):
        client = self._auth(recruiter_user)
        resp = client.patch(
            self.DETAIL_URL.format(scheduled_interview.id),
            {'status': 'completed'},
            format='json',
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['status'] == 'completed'

    def test_patch_invalid_transition_rejected(
        self, recruiter_user, completed_interview
    ):
        client = self._auth(recruiter_user)
        resp = client.patch(
            self.DETAIL_URL.format(completed_interview.id),
            {'status': 'scheduled'},
            format='json',
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_full_lifecycle_schedule_complete_evaluate(
        self, recruiter_user, application
    ):
        client = self._auth(recruiter_user)

        # 1. Schedule
        resp = client.post(self.LIST_URL, {
            'application': application.id,
            'interview_type': 'technical',
            'scheduled_at': (timezone.now() + timedelta(days=5)).isoformat(),
            'duration_minutes': 90,
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        interview_id = resp.data['id']

        # 2. Complete
        resp = client.patch(
            self.DETAIL_URL.format(interview_id),
            {'status': 'completed'},
            format='json',
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['status'] == 'completed'

        # 3. Evaluate
        resp = client.post(self.EVALUATE_URL.format(interview_id), {
            'technical_score': 5,
            'communication_score': 4,
            'motivation_score': 4,
            'problem_solving_score': 5,
            'recommendation': 'hire',
            'comments': 'Excellent candidate.',
        }, format='json')
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data['overall_score'] is not None
        assert resp.data['recommendation'] == 'hire'

        # 4. Read evaluation
        resp = client.get(self.EVAL_READ_URL.format(interview_id))
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['recommendation'] == 'hire'

    def test_cannot_evaluate_scheduled_interview(
        self, recruiter_user, scheduled_interview
    ):
        client = self._auth(recruiter_user)
        resp = client.post(self.EVALUATE_URL.format(scheduled_interview.id), {
            'technical_score': 3,
            'communication_score': 3,
            'motivation_score': 3,
            'problem_solving_score': 3,
            'recommendation': 'hold',
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_score_out_of_range_rejected(
        self, recruiter_user, completed_interview
    ):
        client = self._auth(recruiter_user)
        resp = client.post(self.EVALUATE_URL.format(completed_interview.id), {
            'technical_score': 6,       # invalid — max is 5
            'communication_score': 3,
            'motivation_score': 3,
            'problem_solving_score': 3,
            'recommendation': 'hire',
        }, format='json')
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_blocked(self):
        client = APIClient()
        resp = client.get(self.LIST_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_evaluation_404_before_submission(
        self, recruiter_user, scheduled_interview
    ):
        client = self._auth(recruiter_user)
        resp = client.get(self.EVAL_READ_URL.format(scheduled_interview.id))
        assert resp.status_code == status.HTTP_404_NOT_FOUND


# ─────────────────────────────────────────────────────────────────────────────
# Celery task tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSendInterviewRemindersTask:
    def test_sends_reminder_for_upcoming_interview(
        self, scheduled_interview, mailoutbox
    ):
        """Interview within 24h window should get reminder emails."""
        # Move interview to be within the 24h reminder window
        scheduled_interview.scheduled_at = timezone.now() + timedelta(hours=12)
        scheduled_interview.reminder_sent = False
        scheduled_interview.save()

        from apps.interviews.tasks import send_interview_reminders
        result = send_interview_reminders()

        scheduled_interview.refresh_from_db()
        assert scheduled_interview.reminder_sent is True
        assert result['sent'] == 1
        # Both candidate and recruiter get an email
        assert len(mailoutbox) == 2

    def test_does_not_resend_already_reminded(
        self, scheduled_interview, mailoutbox
    ):
        """reminder_sent=True interviews are skipped."""
        scheduled_interview.scheduled_at = timezone.now() + timedelta(hours=12)
        scheduled_interview.reminder_sent = True
        scheduled_interview.save()

        from apps.interviews.tasks import send_interview_reminders
        result = send_interview_reminders()

        assert result['sent'] == 0
        assert len(mailoutbox) == 0

    def test_skips_interviews_outside_window(
        self, scheduled_interview, mailoutbox
    ):
        """Interview more than 24h away should not get reminder yet."""
        scheduled_interview.scheduled_at = timezone.now() + timedelta(days=3)
        scheduled_interview.reminder_sent = False
        scheduled_interview.save()

        from apps.interviews.tasks import send_interview_reminders
        result = send_interview_reminders()

        assert result['sent'] == 0
        scheduled_interview.refresh_from_db()
        assert scheduled_interview.reminder_sent is False

    def test_skips_cancelled_interviews(
        self, scheduled_interview, mailoutbox
    ):
        scheduled_interview.scheduled_at = timezone.now() + timedelta(hours=10)
        scheduled_interview.status = Interview.Status.CANCELLED
        scheduled_interview.reminder_sent = False
        scheduled_interview.save()

        from apps.interviews.tasks import send_interview_reminders
        result = send_interview_reminders()
        assert result['sent'] == 0
