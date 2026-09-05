#!/usr/bin/env sh
set -eu
IMAGE="${1:-hodgeform-executor:smoke}"
TOKEN="hf_executor_smoke_token_0123456789"
VOL="hf-executor-smoke-$$"
NAME="hf-executor-smoke-$$"
cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker volume rm "$VOL" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker build -t "$IMAGE" ./executor >/dev/null
docker volume create "$VOL" >/dev/null
docker run -d --name "$NAME" --network none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL --pids-limit 64 --memory 256m --cpus .5 \
  -e HODGEFORM_SANDBOX_SOCKET=/runtime/sandbox/sandbox.sock \
  -e HODGEFORM_SANDBOX_TOKEN="$TOKEN" -v "$VOL:/runtime/sandbox" "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  if docker run --rm --network none -v "$VOL:/runtime/sandbox" --entrypoint python3 "$IMAGE" -c 'import os; raise SystemExit(0 if os.path.exists("/runtime/sandbox/sandbox.sock") else 1)' >/dev/null 2>&1; then break; fi
  sleep 0.2
done

request() {
  AUTH="$1" CODE="$2" docker run --rm --network none -v "$VOL:/runtime/sandbox" --entrypoint python3 "$IMAGE" -c '
import json, os, socket
sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM); sock.connect("/runtime/sandbox/sandbox.sock")
body=json.dumps({"code":os.environ["CODE"]}).encode()
headers=[b"POST /execute HTTP/1.1",b"Host: executor",b"Content-Type: application/json",f"Content-Length: {len(body)}".encode()]
a=os.environ.get("AUTH","")
if a: headers.append(f"Authorization: Bearer {a}".encode())
sock.sendall(b"\r\n".join(headers)+b"\r\n\r\n"+body)
out=b""
while True:
 d=sock.recv(4096)
 if not d: break
 out+=d
print(out.decode("utf8","replace"))
'
}

unauth="$(request wrong 'print(2+2)')"
echo "$unauth" | grep -q '401 Unauthorized'
ok="$(request "$TOKEN" 'print(2+2)')"
echo "$ok" | grep -q '"ok": true'
echo "$ok" | grep -q '4'
timeout="$(request "$TOKEN" 'while True: pass')"
echo "$timeout" | grep -Eq 'timeout|"ok": false'
netmode="$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$NAME")"
[ "$netmode" = "none" ]
echo "executor smoke: PASS"
