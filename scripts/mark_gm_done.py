#!/usr/bin/env python3
import json
from pathlib import Path

p = Path('.hermes/kanban.json')
board = json.loads(p.read_text())

# Move gm cards to done and mark statuses
ids_to_done = {
    'gm-14-level-flow-state-machine',
    'gm-15-powerup-balance-refactor',
    'gm-16-shop-depth-and-economy',
    'gm-17-crab-wave-lifecycle-consistency',
    'gm-18-settings-input-priority-hardening',
    'gm-19-automated-regression-gates',
}

# collect from backlog/in_progress
for col_name in ['backlog', 'in_progress']:
    cards = board['columns'][col_name]['cards']
    keep = []
    for c in cards:
        if c.get('id') in ids_to_done:
            c['column'] = 'done'
            c['status'] = 'done'
            board['columns']['done']['cards'].append(c)
        else:
            keep.append(c)
    board['columns'][col_name]['cards'] = keep

# normalize existing done statuses
for c in board['columns']['done']['cards']:
    if c.get('id') in ids_to_done:
        c['status'] = 'done'
        c['column'] = 'done'

p.write_text(json.dumps(board, indent=2) + '\n')
print('updated kanban: gm-14..gm-19 moved to done')
