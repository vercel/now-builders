require 'webrick'
require 'json'

require_relative _NOW_HANDLER_FILE


server = WEBrick::HTTPServer.new :Port => 3000
server.mount '/', HANDLER
trap('INT') { server.stop }
server.start


def now_handler(event, context)
  server = WEBrick::HTTPServer.new :Port => 3000
  Thread.new(server) do |server|
    server.mount_proc "/" do |req, res|
      payload = JSON.parse event['body']
      path = payload['path']
      headers = payload['headers']
      http_method = payload['method']

      res.body = "#{http_method}, 'http://0.0.0.0:3000'#{path} #{headers}"
      res.status = 200
      res.headers = headers
    end
  end
  trap('INT') { server.stop }
  server.start
end