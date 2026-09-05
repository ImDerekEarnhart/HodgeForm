#!/usr/bin/env python3
"""Reference single-tenant Python verifier executor.

The web process never executes submitted code. This service runs as an unprivileged
account, binds a Unix socket, and runs Python in a temporary directory with no inherited
environment, strict rlimits, and a timeout. The production compose gives this
container no network stack and a read-only root filesystem.

For hostile multi-tenant arbitrary code, replace this reference executor with a
per-job microVM/container service. HodgeForm's verifier interface stays the same.
"""
import http.server, json, os, pwd, resource, socketserver, subprocess, tempfile
SOCKET=os.environ.get("HODGEFORM_SANDBOX_SOCKET","/runtime/sandbox/sandbox.sock")
UID=int(os.environ.get("HODGEFORM_SANDBOX_UID","10001")); GID=int(os.environ.get("HODGEFORM_SANDBOX_GID","10001")); TOKEN=os.environ.get("HODGEFORM_SANDBOX_TOKEN","").strip()
class UnixServer(socketserver.UnixStreamServer): allow_reuse_address=True
class Handler(http.server.BaseHTTPRequestHandler):
    server_version="HodgeFormExecutor/1"
    def log_message(self,*args): pass
    def do_POST(self):
        if self.path!="/execute": self.send_error(404); return
        if TOKEN and self.headers.get("authorization", "") != f"Bearer {TOKEN}":
            self._json(401,{"ok":False,"error":"unauthorized"}); return
        n=min(int(self.headers.get("content-length","0")),20000)
        try: body=json.loads(self.rfile.read(n)); code=str(body.get("code",""))
        except Exception: self.send_error(400); return
        if not code or len(code)>3500: self._json(400,{"ok":False,"error":"invalid code"}); return
        def limit():
            resource.setrlimit(resource.RLIMIT_CPU,(2,2)); resource.setrlimit(resource.RLIMIT_AS,(192*1024*1024,192*1024*1024)); resource.setrlimit(resource.RLIMIT_FSIZE,(1024*1024,1024*1024)); resource.setrlimit(resource.RLIMIT_NOFILE,(32,32)); resource.setrlimit(resource.RLIMIT_NPROC,(16,16))
        try:
            with tempfile.TemporaryDirectory() as cwd:
                p=subprocess.run(["python3","-I","-c",code],cwd=cwd,env={"PATH":"/usr/local/bin:/usr/bin:/bin"},capture_output=True,text=True,timeout=3,preexec_fn=limit)
                out=(p.stdout+p.stderr)[:6000]; self._json(200,{"ok":p.returncode==0,"output":out,"exitCode":p.returncode})
        except subprocess.TimeoutExpired: self._json(200,{"ok":False,"error":"timeout"})
        except Exception as e: self._json(500,{"ok":False,"error":type(e).__name__})
    def _json(self,status,obj):
        data=json.dumps(obj).encode(); self.send_response(status); self.send_header("content-type","application/json"); self.send_header("content-length",str(len(data))); self.end_headers(); self.wfile.write(data)
os.makedirs(os.path.dirname(SOCKET),exist_ok=True)
try: os.unlink(SOCKET)
except FileNotFoundError: pass
if os.geteuid()!=UID or os.getegid()!=GID: raise RuntimeError("executor must run as the configured unprivileged sandbox user")
server=UnixServer(SOCKET,Handler); os.chmod(SOCKET,0o666)
server.serve_forever()
