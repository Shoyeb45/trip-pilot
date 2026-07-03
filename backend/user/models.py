from django.contrib.auth.models import AbstractUser
from django.db import models

from common.models import TimeStampedModel


class User(AbstractUser):
    email = models.CharField(
        max_length=255
    )
    name = models.CharField(max_length=255)
    
    def __str__(self):
        return self.username
