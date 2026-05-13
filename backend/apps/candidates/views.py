"""
Candidates app views.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.candidates.models import CandidateProfile, SavedJob, Notification
from apps.candidates.serializers import (
    CandidateProfileSerializer,
    SavedJobSerializer,
    NotificationSerializer,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_candidate(user):
    return user.role == 'candidate'


# ── Candidate Profile ─────────────────────────────────────────────────────────

class CandidateProfileView(APIView):
    """
    GET  /api/v1/candidates/profile/   — retrieve my profile (create if missing)
    PUT  /api/v1/candidates/profile/   — full update
    PATCH /api/v1/candidates/profile/  — partial update
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_or_create_profile(self, user):
        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        if not _is_candidate(request.user):
            return Response({'detail': 'Candidates only.'}, status=status.HTTP_403_FORBIDDEN)
        profile = self._get_or_create_profile(request.user)
        return Response(CandidateProfileSerializer(profile, context={'request': request}).data)

    def patch(self, request):
        if not _is_candidate(request.user):
            return Response({'detail': 'Candidates only.'}, status=status.HTTP_403_FORBIDDEN)
        profile = self._get_or_create_profile(request.user)
        serializer = CandidateProfileSerializer(
            profile, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)


# ── Saved Jobs ────────────────────────────────────────────────────────────────

class SavedJobListView(APIView):
    """GET /api/v1/candidates/saved-jobs/  — list all saved jobs"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_candidate(request.user):
            return Response({'detail': 'Candidates only.'}, status=status.HTTP_403_FORBIDDEN)
        qs = SavedJob.objects.filter(candidate=request.user).select_related('job')
        serializer = SavedJobSerializer(qs, many=True, context={'request': request})
        return Response({'count': qs.count(), 'results': serializer.data})


class SavedJobToggleView(APIView):
    """
    POST   /api/v1/candidates/saved-jobs/<job_id>/toggle/
    Saves the job if not saved, removes it if already saved.
    Returns: { saved: bool }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, job_id):
        if not _is_candidate(request.user):
            return Response({'detail': 'Candidates only.'}, status=status.HTTP_403_FORBIDDEN)
        from apps.jobs.models import Job
        try:
            job = Job.objects.get(pk=job_id)
        except Job.DoesNotExist:
            return Response({'detail': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

        existing = SavedJob.objects.filter(candidate=request.user, job=job).first()
        if existing:
            existing.delete()
            return Response({'saved': False})
        SavedJob.objects.create(candidate=request.user, job=job)
        return Response({'saved': True}, status=status.HTTP_201_CREATED)


class SavedJobStatusView(APIView):
    """GET /api/v1/candidates/saved-jobs/<job_id>/status/  → { saved: bool }"""
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        saved = SavedJob.objects.filter(candidate=request.user, job_id=job_id).exists()
        return Response({'saved': saved})


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationListView(APIView):
    """GET /api/v1/candidates/notifications/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user).order_by('-created_at')[:50]
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        serializer = NotificationSerializer(qs, many=True)
        return Response({'unread_count': unread_count, 'results': serializer.data})


class NotificationMarkReadView(APIView):
    """
    POST /api/v1/candidates/notifications/mark-read/
    Body: { ids: [1,2,3] }  OR  { all: true }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mark_all = request.data.get('all', False)
        if mark_all:
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
            return Response({'marked': 'all'})
        ids = request.data.get('ids', [])
        if ids:
            Notification.objects.filter(user=request.user, id__in=ids).update(is_read=True)
        return Response({'marked': len(ids)})


class NotificationUnreadCountView(APIView):
    """GET /api/v1/candidates/notifications/unread-count/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


class NotificationDeleteView(APIView):
    """DELETE /api/v1/candidates/notifications/<pk>/  — delete a single notification."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = Notification.objects.filter(user=request.user, pk=pk).delete()
        if not deleted:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationBulkDeleteView(APIView):
    """
    DELETE /api/v1/candidates/notifications/bulk-delete/
    Body: { ids: [1, 2, 3] }  OR  { all: true }
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        delete_all = request.data.get('all', False)
        if delete_all:
            count, _ = Notification.objects.filter(user=request.user).delete()
            return Response({'deleted': count})
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'deleted': 0})
        count, _ = Notification.objects.filter(user=request.user, id__in=ids).delete()
        return Response({'deleted': count})

