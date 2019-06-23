from sanic import Sanic
from sanic import response
app = Sanic()


@app.route("/")
async def index(request):
    return response.text("wsgi:RANDOMNESS_PLACEHOLDER")
