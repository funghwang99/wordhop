#!/usr/bin/env python3
"""Prepare user-provided MP3 files for WordHop PET Trainer. No internet required."""
from pathlib import Path
from argparse import ArgumentParser
import json, hashlib, re, shutil, sys
ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"source-assets/trainer/audio-manifest.json"
DST=ROOT/"dist/audio/trainer"
def main():
    parser=ArgumentParser()
    parser.add_argument("--source-dir",type=Path,required=True,help="Folder with the original Test N - TRACK NN.mp3 files")
    parser.add_argument("--check-only",action="store_true")
    args=parser.parse_args()
    manifest=json.loads(MANIFEST.read_text())
    if not args.source_dir.is_dir():
        parser.error(f"Source folder not found: {args.source_dir}")
    missing=[]
    found=[]
    for item in manifest["tracks"]:
        source=None
        names=[f'Test {item["test"]} - TRACK {item["track"]:02}.mp3', f'Test {item["test"]} - TRACK {item["track"]:02}(1).mp3']
        for name in names:
            path=args.source_dir/name
            if path.is_file():
                source=path
                break
        if not source:
            missing.append(names[0])
            continue
        if source.stat().st_size<10000:
            raise ValueError(f"Suspiciously small MP3: {source}")
        target=DST/item["file"]
        checksum=hashlib.sha256(source.read_bytes()).hexdigest()
        found.append((source,target,checksum))
    for name in missing:
        print(f"MISSING {name}",file=sys.stderr)
    if missing:
        raise SystemExit(f"Aborting: {len(missing)} recordings missing; no partial import")
    if not args.check_only:
        DST.mkdir(parents=True,exist_ok=True)
        for source,target,checksum in found:
            shutil.copy2(source,target)
        (DST/"sha256-manifest.json").write_text(json.dumps({t.name:h for _,t,h in found},indent=2)+"\n")
    print(f"Validated {len(found)} MP3 recordings. "+("Check-only: no changes." if args.check_only else f"Copied to {DST}"))
if __name__=="__main__":
    main()
