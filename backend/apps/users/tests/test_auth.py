"""
Auth integration tests.
Run with: cd backend && python -m pytest apps/users/tests/ -v
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def candidate_user(db):
    return User.objects.create_user(
        email='candidate@example.com',
        password='TestPass1',
        first_name='Jane',
        last_name='Doe',
        role=User.Roles.CANDIDATE,
    )


@pytest.mark.django_db
class TestRegisterView:
    url = '/api/v1/auth/register/'

    def test_register_success(self, api_client):
        payload = {
            'email': 'new@example.com',
            'password': 'StrongPass1',
            'first_name': 'John',
            'last_name': 'Smith',
            'role': 'candidate',
        }
        response = api_client.post(self.url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['success'] is True
        assert 'access_token' in response.data['data']
        assert User.objects.filter(email='new@example.com').exists()

    def test_register_duplicate_email(self, api_client, candidate_user):
        payload = {
            'email': candidate_user.email,
            'password': 'StrongPass1',
            'first_name': 'John',
            'last_name': 'Smith',
        }
        response = api_client.post(self.url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['success'] is False

    def test_register_weak_password(self, api_client):
        payload = {
            'email': 'weak@example.com',
            'password': 'password',   # No uppercase or digit
            'first_name': 'Weak',
            'last_name': 'Pass',
        }
        response = api_client.post(self.url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLoginView:
    url = '/api/v1/auth/login/'

    def test_login_success(self, api_client, candidate_user):
        response = api_client.post(self.url, {
            'email': candidate_user.email,
            'password': 'TestPass1',
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert 'access_token' in response.data['data']

    def test_login_wrong_password(self, api_client, candidate_user):
        response = api_client.post(self.url, {
            'email': candidate_user.email,
            'password': 'WrongPass',
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # Must be generic — not "wrong password"
        assert 'credentials' in response.data['error']['message'].lower()

    def test_login_nonexistent_email(self, api_client):
        response = api_client.post(self.url, {
            'email': 'ghost@example.com',
            'password': 'anything',
        }, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        # Same error as wrong password (no user enumeration)
        assert 'credentials' in response.data['error']['message'].lower()


@pytest.mark.django_db
class TestMeView:
    url = '/api/v1/auth/me/'

    def test_me_authenticated(self, api_client, candidate_user):
        api_client.force_authenticate(user=candidate_user)
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['email'] == candidate_user.email
        # Must NOT expose password
        assert 'password' not in response.data['data']

    def test_me_unauthenticated(self, api_client):
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
