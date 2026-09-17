"""Optional browser QA: pip install playwright; playwright install chromium.
Uses the untouched, self-contained build with set_content, which also works in
network-restricted test environments. The storage-denied fallback is intentional.
No game-state mutations: controls are actual keyboard or pointer events.
"""
import json
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
HTML = (ROOT / 'prototype/index.html').read_text()


def run():
    with sync_playwright() as playwright:
        kwargs = {'headless': True}
        executable = os.environ.get('CHROMIUM_PATH')
        if executable:
            kwargs['executable_path'] = executable
        browser = playwright.chromium.launch(**kwargs)
        errors = []
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.on('pageerror', lambda error: errors.append(str(error)))
        epoch = datetime(2026, 1, 1, tzinfo=timezone.utc)
        page.clock.install(time=epoch)
        page.set_content(HTML, wait_until='load')
        page.clock.pause_at(epoch + timedelta(seconds=2))
        page.screenshot(path=str(OUT / 'title-desktop.png'))
        page.locator('#help-button').click()
        assert page.locator('#help-dialog').is_visible()
        page.locator('#help-close').click()
        page.locator('#start-button').click()
        page.clock.run_for(32)
        snapshot = lambda: page.evaluate('window.__timeSlip.snapshot()')
        assert snapshot()['mode'] == 'playing'
        page.keyboard.press('Escape')
        page.clock.run_for(32)
        before = snapshot()['remaining']
        page.clock.run_for(2200)
        assert snapshot()['remaining'] == before
        page.locator('#resume-button').click()
        page.clock.run_for(32)

        def navigate(target, jump=False):
            if jump:
                page.keyboard.down('Space')
            page.keyboard.down('ArrowRight')
            held = True
            for _ in range(400):
                page.clock.run_for(16)
                state = snapshot()
                if state['mode'] != 'playing':
                    raise AssertionError(f"Route failed: {target} {jump} {state}")
                p = state['player']
                if p['x'] >= target and held:
                    page.keyboard.up('ArrowRight')
                    held = False
                if not held and p['grounded'] and abs(p['vx']) < 1:
                    break
            else:
                raise AssertionError(f'Target unreachable: {target}')
            if jump:
                page.keyboard.up('Space')
            return snapshot()

        def next_loop():
            page.keyboard.press('KeyR')
            page.clock.run_for(800)
            assert snapshot()['mode'] == 'playing'
            page.keyboard.press('KeyE')
            page.clock.run_for(32)

        for x, jump in [(315,0),(478,1),(650,1),(922,0),(972,0),(1138,1),(1278,1),(1438,1),(1758,0)]:
            navigate(x, bool(jump))
        assert len(snapshot()['progress']['shards']) == 2
        page.screenshot(path=str(OUT / 'garden-cleared.png'))
        next_loop()
        for x, jump in [(2122,0),(2328,1),(2378,0),(2578,1),(2638,0),(2838,1),(2918,0),(3198,1),(3254,0),(3432,1),(3587,0),(3608,0),(3818,1),(3907,0)]:
            navigate(x, bool(jump))
        assert len(snapshot()['progress']['shards']) == 4
        page.screenshot(path=str(OUT / 'aqueduct-cleared.png'))
        next_loop()
        for x, jump in [(4118,0),(4298,1),(4343,0),(4508,1),(4576,0),(4748,1),(4806,0),(4978,1),(5238,0),(5282,0),(5473,1)]:
            navigate(x, bool(jump))
        page.keyboard.down('ArrowRight')
        page.clock.run_for(1100)
        page.keyboard.up('ArrowRight')
        result = snapshot()
        assert result['mode'] == 'won', result
        page.screenshot(path=str(OUT / 'ending.png'))
        assert errors == [], errors
        print(json.dumps({'desktop_full_route': 'PASS', 'pause': 'PASS', 'help': 'PASS', 'console_errors': errors, 'result': result['progress']}, ensure_ascii=False))
        browser.close()

if __name__ == '__main__':
    run()
