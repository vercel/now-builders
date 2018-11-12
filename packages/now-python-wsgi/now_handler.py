import os
import json
import _thread

import requests
import wsgiadapter

import __NOW_HANDLER_FILENAME as app

session = requests.Session()

try:
    app = app.api
    session = app.api.requests
except AttributeError:
    app = app.app
    session.mount('http://;/', wsgiadapter.WSGIAdapter(app))
except AttributeError:
    app = app.application
    session.mount('http://;/', wsgiadapter.WSGIAdapter(app))



def now_handler(event, context):


    payload = json.loads(event['body'])
    path = payload['path']
    headers = payload['headers']
    method = payload['method']


    res = session.request(method, 'http://;' + path, headers=headers)

    return {
        'statusCode': res.status_code,
        'headers': dict(res.headers),
        'body': res.text
    }
