import json, urllib.request, sys, time

jobs = ['gateway','auth-service','stations-service','sessions-service','billing-service','notification-service']

def get_json(url):
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.loads(r.read().decode('utf-8'))

print('==> Prometheus targets (up)')
query = get_json('http://localhost:9090/api/v1/query?query=up')
if query.get('status') != 'success':
    print('Prometheus query failed')
    sys.exit(1)

for job in jobs:
    data = get_json('http://localhost:9090/api/v1/query?query=up%7Bjob%3D%22'+job+'%22%7D')
    result = data.get('data', {}).get('result', [])
    if not result or result[0].get('value', [None, '0'])[1] != '1':
        print(f'Target {job} is not UP in Prometheus')
        sys.exit(1)
    print(f'  OK {job}')

print('==> Gateway metrics')
with urllib.request.urlopen('http://localhost:3000/metrics', timeout=10) as r:
    body = r.read().decode('utf-8')
if 'process_cpu_seconds_total' not in body:
    print('Gateway /metrics failed')
    sys.exit(1)

print('==> Grafana health')
grafana = get_json('http://localhost:3030/api/health')
if grafana.get('database') != 'ok':
    print('Grafana health failed')
    sys.exit(1)

print('==> Jaeger services')
services = get_json('http://localhost:16686/api/services').get('data', [])
if 'gateway' not in services:
    urllib.request.urlopen('http://localhost:3000/api/v1/health', timeout=10).read()
    time.sleep(3)
    services = get_json('http://localhost:16686/api/services').get('data', [])
if 'gateway' not in services:
    print('Jaeger trace export failed')
    sys.exit(1)

print('All observability checks passed.')
