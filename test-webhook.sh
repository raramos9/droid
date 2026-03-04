#!/bin/bash
curl -X POST 'http://localhost:8787/webhook' -H 'Content-Type: application/json' -H 'x-github-event: push' -H 'x-dev-bypass: true' -d '{"ref":"refs/heads/main","before":"7b2a048","after":"a1dab5a","repository":{"name":"droid","owner":{"login":"raramos9"}}}'
