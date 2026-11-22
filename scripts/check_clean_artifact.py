"""Verify that a clean rebuild matches the artifact already validated in CI."""
from hashlib import sha256
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def inventory():
    return {
        path.relative_to(DIST).as_posix(): sha256(path.read_bytes()).hexdigest()
        for path in DIST.rglob("*") if path.is_file()
    }


if __name__ == "__main__":
    before = inventory()
    if "route-manifest.json" not in before:
        sys.exit("Build and validate the public artifact before checking reproducibility.")
    subprocess.run([sys.executable, str(ROOT / "scripts/build_site.py")], cwd=ROOT, check=True)
    after = inventory()
    changes = sorted(path for path in before.keys() | after.keys() if before.get(path) != after.get(path))
    if changes:
        sys.exit("Clean rebuild differs: " + ", ".join(changes))
    print(f"Clean rebuild matches {len(after)} public artifact files.")
