#!/usr/bin/env python3
"""Containment test image only. It is not a scientific verifier."""
import json
import os
import socket
import time

with open('/input/artifact') as stream:
    mode = stream.read().strip()
if mode == 'timeout':
    time.sleep(30)
if mode == 'malformed':
    print('PASS')
    raise SystemExit(0)
checks = {}
try:
    with open('/input/artifact', 'w') as stream:
        stream.write('mutated')
    checks['readonly_input'] = False
except OSError:
    checks['readonly_input'] = True
try:
    with open('/root-write', 'w') as stream:
        stream.write('mutated')
    checks['readonly_root'] = False
except OSError:
    checks['readonly_root'] = True
try:
    socket.create_connection(('1.1.1.1', 443), timeout=1)
    checks['no_network'] = False
except OSError:
    checks['no_network'] = True
checks['unprivileged'] = os.getuid() == 65532
checks['no_host_token'] = 'HODGEFORM_TOKEN' not in os.environ
checks['no_host_signing_key'] = 'HODGEFORM_RECEIPT_PRIVATE_KEY_B64' not in os.environ
print(json.dumps({'outcome': 'pass' if all(checks.values()) else 'fail', 'measurements': {'failed_tests': sum(not x for x in checks.values())}, 'details': json.dumps(checks)}))
