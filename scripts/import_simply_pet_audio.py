"""Copy supplied Simply PET MP3/M4A audio unchanged and add per-test tracks."""
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
    replacements = manifest.setdefault('replacements', [])
    for source in sorted(args.audio_directory.iterdir()):
        match = re.fullmatch(r'Test ([1-8]) Part ([1-4])(?:\(\d+\))?\.(mp3|m4a)', source.name)
        if not match:
            continue
        test, part = map(int, match.groups()[:2])
        extension = match.group(3)
        unit = units[f'simply-pet-test-{test}']
        probe = json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-show_entries',
            'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', str(source)]))
        assert len(probe['streams']) == 1
        assert probe['streams'][0]['codec_name'] == {'mp3': 'mp3', 'm4a': 'aac'}[extension]
        duration = round(float(probe['format']['duration']), 3)
        assert duration > 0
        decode = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-xerror', '-i',
            str(source), '-f', 'null', '-'], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        decoder_warning = decode.returncode != 0 or bool(decode.stderr.strip())
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        relative = f'audio/simply-pet/test-{test}-part-{part}.{digest[:12]}.{extension}'
        shutil.copyfile(source, ROOT / 'dist' / relative)
        track = {'id': f'part-{part}', 'title': f'Part {part}', 'src': relative, 'duration': duration}
        existing = {item['id']: item for item in unit.get('listening', [])}
        existing[track['id']] = track
        unit['listening'] = sorted(existing.values(), key=lambda item: item['id'])
        previous = records.get((test, part))
        if previous and previous['sourceSha256'] != digest:
            replacements.append({'test': test, 'part': part, 'previousAsset': previous['asset'],
                'previousSha256': previous['sourceSha256'], 'replacementAsset': relative,
                'replacementSha256': digest, 'reason': 'User supplied a replacement recording.'})
        records[test, part] = {'test': test, 'part': part, 'sourceFilename': source.name,
            'sourceSha256': digest, 'asset': relative, 'bytes': source.stat().st_size,
            'durationSeconds': duration, **probe['streams'][0],
            'decodeReview': {'decoder': 'FFmpeg', 'status': 'warning' if decoder_warning else 'passed',
                'errors': [re.sub(r' @ 0x[0-9a-f]+', '', line) for line in decode.stderr.strip().splitlines()[:4]]}}
        found += 1
    if not found:
        raise SystemExit('No matching Test N Part N.mp3 or .m4a files found.')
    manifest['source'] = 'User-supplied Simply PET recordings; MP3 and M4A replacements preserved.'
    manifest['processing'] = 'Original audio bytes and file formats preserved; no trimming, resampling or re-encoding.'
    manifest['tracks'] = [records[key] for key in sorted(records)]
    manifest['testCount'] = len({item['test'] for item in manifest['tracks']})
    manifest['trackCount'] = len(manifest['tracks'])
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'Imported {found} original recordings; {manifest["trackCount"]} tracks across {manifest["testCount"]} tests.')
    issues = [item['sourceFilename'] for item in manifest['tracks'] if item['decodeReview']['status'] != 'passed']
    if issues:
        print('Decoder diagnostics to review (not a replacement decision): ' + ', '.join(issues))


if __name__ == '__main__':
    main()

