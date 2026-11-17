"""
Unit tests for the registration photo size limit (5 MB).

A photo that fails the Cloudinary upload falls back to a base64 data URI,
which can be several MB; Firestore rejects documents over 1 MiB, so an
oversized photo must be rejected with a clear message instead of failing
at the write with a raw backend error. Run:

  cd backend
  export PYTHONPATH=.
  pytest tests/test_registration_photo.py -v
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.registration_form import (
    MAX_PHOTO_URL_BYTES,
    PHOTO_TOO_LARGE_MESSAGE,
    is_document_size_error,
    validate_registration_payload,
)


def _event_with_fields(fields):
    return {"registration_form_config": {"fields": fields}}


def _name_mobile_fields():
    return [
        {"id": "name", "key": "name", "label": "Full name", "type": "text",
         "enabled": True, "required": True},
        {"id": "contact_number", "key": "contact_number", "label": "Mobile number",
         "type": "tel", "enabled": True, "required": True},
    ]


def _payload(photo_url):
    return {"name": "Asha", "contact_number": "9999999999", "photo_url": photo_url}


def test_photo_url_under_limit_passes():
    event = _event_with_fields(_name_mobile_fields())
    assert validate_registration_payload(event, _payload("https://example.com/photo.jpg")) == []
    # A base64 data URI just under the cap is fine too.
    assert validate_registration_payload(
        event, _payload("data:image/jpeg;base64," + "A" * (MAX_PHOTO_URL_BYTES - 100))
    ) == []


def test_photo_url_at_limit_passes():
    event = _event_with_fields(_name_mobile_fields())
    assert validate_registration_payload(event, _payload("x" * MAX_PHOTO_URL_BYTES)) == []


def test_photo_url_over_limit_rejected_with_friendly_message():
    event = _event_with_fields(_name_mobile_fields())
    errors = validate_registration_payload(event, _payload("x" * (MAX_PHOTO_URL_BYTES + 1)))
    assert errors == [PHOTO_TOO_LARGE_MESSAGE]


def test_base64_photo_url_over_limit_rejected():
    event = _event_with_fields(_name_mobile_fields())
    data_url = "data:image/jpeg;base64," + "A" * MAX_PHOTO_URL_BYTES
    errors = validate_registration_payload(event, _payload(data_url))
    assert errors == [PHOTO_TOO_LARGE_MESSAGE]


def test_photo_size_check_applies_even_when_photo_field_disabled():
    # The photo URL lands on the stored document regardless of whether
    # the photo field is enabled in the form config, so the size check
    # is not gated on the field.
    event = _event_with_fields(_name_mobile_fields() + [
        {"id": "photo_url", "key": "photo_url", "label": "Player photo", "type": "image",
         "enabled": False, "required": False},
    ])
    errors = validate_registration_payload(event, _payload("x" * (MAX_PHOTO_URL_BYTES + 1)))
    assert errors == [PHOTO_TOO_LARGE_MESSAGE]


def test_missing_photo_url_is_not_a_size_error():
    event = _event_with_fields(_name_mobile_fields())
    assert validate_registration_payload(
        event, {"name": "Asha", "contact_number": "9999999999"}) == []


def test_is_document_size_error():
    assert is_document_size_error(
        "FAILED_PRECONDITION: Document exceeds maximum allowed size")
    assert is_document_size_error("Document exceeds maximum allowed size")
    assert not is_document_size_error("connection reset by peer")
    assert not is_document_size_error("")
    assert not is_document_size_error(ValueError("something else went wrong"))
