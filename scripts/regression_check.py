#!/usr/bin/env python3
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_DIR = ROOT / 'js'


def run(cmd):
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def syntax_checks():
    failures = []
    for f in sorted(JS_DIR.glob('*.js')):
        code, out, err = run(['node', '--check', str(f)])
        if code != 0:
            failures.append((f.name, err.strip() or out.strip()))
    return failures


def export_checks():
    issues = []
    # simple contract checks for known regressions
    contracts = {
        'player.js': ['applyUpgrades', 'setMoveMultiplier'],
        'enemies.js': ['clearCrabs', 'drawCrabs', 'getCrabEnemies'],
    }
    for file, symbols in contracts.items():
        text = (JS_DIR / file).read_text(encoding='utf-8')
        matches = list(re.finditer(r'return\s*\{([\s\S]*?)\};', text))
        return_match = matches[-1] if matches else None
        if not return_match:
            issues.append(f'{file}: missing module return object')
            continue
        block = return_match.group(1)
        for s in symbols:
            if re.search(rf'\b{s}\b', block) is None:
                issues.append(f'{file}: missing export {s}')
    return issues


def undefined_sanity():
    # lightweight static sanity for past regressions
    issues = []
    game = (JS_DIR / 'game.js').read_text(encoding='utf-8')
    if 'openShop(' in game and 'function openShop' not in game:
        issues.append('game.js: openShop referenced but not defined')
    if 'Player.applyUpgrades' in game:
        player = (JS_DIR / 'player.js').read_text(encoding='utf-8')
        if 'applyUpgrades' not in player:
            issues.append('player.js: applyUpgrades missing while referenced from game.js')
    return issues


def main():
    syntax_fail = syntax_checks()
    export_fail = export_checks()
    undef_fail = undefined_sanity()

    report = {
        'syntax_failures': syntax_fail,
        'export_failures': export_fail,
        'undefined_sanity_failures': undef_fail,
    }

    print(json.dumps(report, indent=2))

    if syntax_fail or export_fail or undef_fail:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
