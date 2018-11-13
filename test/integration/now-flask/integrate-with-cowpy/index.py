from flask import Flask
from cowpy import cow

app = Flask(__name__)

@app.route('/', defaults={'message': 'Hello from Python on Now Lambda!'})
@app.route('/<message>')
def hello_world(message):
    return cow.Daemon().milk(message)

if __name__ == '__main__':
    app.run(debug=True, port=3000)