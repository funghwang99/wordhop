"""Copy supplied Simply PET MP3s unchanged and add per-test listening tracks."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'window.WQ_CATALOG = '


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('audio_directory', type=Path)
    args = parser.parse_args()
    catalog_path = ROOT / 'dist/data.js'
    catalog = json.loads(catalog_path.read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    units = {unit['id']: unit for unit in catalog['units']}
    target = ROOT / 'dist/audio/simply-pet'
    target.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT / 'source-assets/simply-pet-listening/source-manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        'book': 'Simply PET', 'source': 'User-supplied Test N Part N.mp3 files',
        'processing': 'Original MP3 bytes preserved; no trimming, resampling or re-encoding.', 'tracks': []}
    records = {(item['test'], item['part']): item for item in manifest['tracks']}
    found = 0
    for source in sorted(args.audio_directory.glob('*.mp3')):
        match = re.fullmatch(r'Test ([1-8]) Part ([1-4])\.mp3', source.name)
        if not match:
            continue
        test, part = map(int, match.groups())
        unit = units[f'simply-pet-test-{test}']
        probe = json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_entries',
            'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', str(source)]))
        assert len(probe['streams']) == 1 and probe['streams'][0]['codec_name'] == 'mp3'
        duration = round(float(probe['format']['duration']), 3)
        assert duration > 0
        decode = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-xerror', '-i',
            str(source), '-f', 'null', '-'], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        damaged = decode.returncode != 0 or bool(decode.stderr.strip())
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        relative = f'audio/simply-pet/test-{test}-part-{part}.{digest[:12]}.mp3'
        shutil.copyfile(source, ROOT / 'dist' / relative)
        track = {'id': f'part-{part}', 'title': f'Part {part}', 'src': relative, 'duration': duration}
        if damaged:
            track['sourceWarning'] = 'This supplied recording contains damaged audio data and may skip or stop. A replacement recording is needed.'
        existing = {item['id']: item for item in unit.get('listening', [])}
        existing[track['id']] = track
        unit['listening'] = sorted(existing.values(), key=lambda item: item['id'])
        records[test, part] = {'test': test, 'part': part, 'sourceFilename': source.name,
            'sourceSha256': digest, 'asset': relative, 'bytes': source.stat().st_size,
            'durationSeconds': duration, **probe['streams'][0],
            'decodeReview': {'decoder': 'FFmpeg', 'status': 'damaged-data' if damaged else 'passed',
                'errors': [re.sub(r' @ 0x[0-9a-f]+', '', line) for line in decode.stderr.strip().splitlines()[:4]]}}
        found += 1
    if not found:
        raise SystemExit('No matching Test N Part N.mp3 files found.')
    manifest['tracks'] = [records[key] for key in sorted(records)]
    manifest['testCount'] = len({item['test'] for item in manifest['tracks']})
    manifest['trackCount'] = len(manifest['tracks'])
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'Imported {found} original MP3s; {manifest["trackCount"]} tracks across {manifest["testCount"]} tests.')
    issues = [item['sourceFilename'] for item in manifest['tracks'] if item['decodeReview']['status'] != 'passed']
    if issues:
        print('Source recordings needing replacement: ' + ', '.join(issues))


if __name__ == '__main__':
    main()
