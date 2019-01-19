import base64
import json
import requests
import wsgiadapter
import __NOW_HANDLER_FILENAME as app

session = requests.Session()

try:
    app = app.api
    session = app.api.requests
except AttributeError:
    try:
        app = app.app
        session.mount("http://;/", wsgiadapter.WSGIAdapter(app))
    except AttributeError:
        app = app.application
        session.mount("http://;/", wsgiadapter.WSGIAdapter(app))


def now_handler(event, context):
    payload = json.loads(event["body"])
    path = payload["path"]
    headers = payload["headers"]
    method = payload["method"]
    encoding = payload.get("encoding")
    body = payload.get("body")

    if (
        (body is not None and len(body) > 0) and
        (encoding is not None and encoding == "base64")
    ):
        body = base64.b64decode(body)

    res = session.request(method, "http://;" + path, headers=headers, data=body)

    return {
        "statusCode": res.status_code,
        "headers": dict(res.headers),
        "body": res.text,
    }

