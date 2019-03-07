require 'webrick'
require 'json'

require_relative _NOW_HANDLER_FILE

module NowHandler
  # server = WEBrick::HTTPServer.new :Port => 3000
  # server.mount '/', Handler
  # trap('INT') { server.stop }
  # server.start


  def self.now_handler(event:, context:)
    server = WEBrick::HTTPServer.new :Port => 3000
    Thread.new(server) do |server|
      if Object.const_defined?('Handler')
        server.mount '/', Handler
      else
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
    end
    trap('INT') { server.stop }
    server.start
  end
end