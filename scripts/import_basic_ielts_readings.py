"""Rebuild the reviewed Basic IELTS Reading data and catalog references."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
PREFIX = 'window.WQ_CATALOG = '
catalog = json.loads((DIST / 'data.js').read_text().removeprefix(PREFIX).strip().removesuffix(';'))
reviewed = json.loads((ROOT / 'source-assets/basic-ielts-reading/answer-keys.json').read_text())
for data in reviewed:
    unit = next(unit for unit in catalog['units'] if unit['id'] == data['id'])
    payload = (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    digest = hashlib.sha256(payload).hexdigest()[:12]
    target = Path('readings') / f"{data['id']}.{digest}.json"
    # Keep immutable earlier payloads for tabs still using a previous catalog.
    (DIST / target).write_bytes(payload)
    unit['readingFile'] = target.as_posix()
(DIST / 'data.js').write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'Imported {len(reviewed)} Basic IELTS Reading units.')
