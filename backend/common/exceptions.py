import logging

from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework.exceptions import APIException, ValidationError as DRFValidationError

logger = logging.getLogger(__name__)


def _flatten_detail(detail):
    """
    DRF exception `detail` can be a dict (field -> [messages]),
    a list, or a single ErrorDetail/string. Normalize to (message, details).
    """
    if isinstance(detail, dict):
        details = detail
        parts = []
        for field, msgs in detail.items():
            if isinstance(msgs, (list, tuple)):
                joined = " ".join(str(m) for m in msgs)
            else:
                joined = str(msgs)
            parts.append(joined if field in ("non_field_errors", "__all__") else f"{field}: {joined}")
        message = " | ".join(parts)
        return message, details

    if isinstance(detail, (list, tuple)):
        return " ".join(str(m) for m in detail), None

    return str(detail), None


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        # Not a DRF/recognized exception (e.g. an unhandled Python exception) — 500
        logger.exception("Unhandled exception in view: %s", context.get("view"))
        return Response(
            {"success": False, "error_message": "Something went wrong. Please try again later."},
            status=500,
        )

    if isinstance(exc, DRFValidationError):
        message, details = _flatten_detail(exc.detail)
    elif isinstance(exc, APIException):
        message, details = _flatten_detail(exc.detail)
    else:
        message, details = str(exc), None

    payload = {"success": False, "error_message": message}
    if details:
        payload["details"] = details

    response.data = payload
    return response