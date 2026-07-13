import http.server, base64, os, json, threading

OUT_DIR = r"C:\atgv\time_sheet\timesheet\screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

class Handler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        data = json.loads(body)
        filename = data["filename"]
        b64 = data["data"]
        img_bytes = base64.b64decode(b64)
        path = os.path.join(OUT_DIR, filename)
        with open(path, "wb") as f:
            f.write(img_bytes)
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        msg = f"Saved: {filename} ({len(img_bytes)} bytes)"
        self.wfile.write(msg.encode())
        print(msg)

    def log_message(self, format, *args):
        pass

server = http.server.HTTPServer(("127.0.0.1", 9876), Handler)
print("Server started on port 9876")
server.serve_forever()
