"""Optional Chromium touch QA with native multi-touch events; no state mutation."""
import json
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
HTML = (ROOT / 'prototype/index.html').read_text()
with sync_playwright() as p:
    args = {'headless': True}
    if os.environ.get('CHROMIUM_PATH'):
        args['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = p.chromium.launch(**args)
    results = []
    for width, height in [(393, 852), (852, 393)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, device_scale_factor=1)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        epoch = datetime(2026, 1, 1, tzinfo=timezone.utc)
        page.clock.install(time=epoch)
        page.set_content(HTML, wait_until='load')
        page.clock.pause_at(epoch + timedelta(seconds=2))
        label = 'portrait' if height > width else 'landscape'
        page.screenshot(path=str(OUT / f'title-mobile-{label}.png'))
        page.locator('#start-button').tap()
        page.clock.run_for(32)
        assert page.locator('#touch-controls').is_visible()
        snapshot = lambda: page.evaluate('window.__timeSlip.snapshot()')
        cdp = context.new_cdp_session(page)
        def point(selector, id):
            box = page.locator(selector).bounding_box()
            return {'x': box['x']+box['width']/2, 'y': box['y']+box['height']/2, 'id': id}
        right = point('[data-control=right]', 0)
        jump = point('[data-control=jump]', 1)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[right]})
        page.clock.run_for(670)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[right,jump]})
        page.clock.run_for(530)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[jump]})
        page.clock.run_for(220)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
        first = snapshot()
        assert first['player']['grounded'] and abs(first['player']['y'] - 474) < 1, first
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[right,jump]})
        page.clock.run_for(490)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[jump]})
        page.clock.run_for(250)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchCancel', 'touchPoints':[]})
        page.clock.run_for(150)
        state = snapshot()
        assert len(state['progress']['shards']) == 1, state
        assert state['nextLimit'] == 14
        assert abs(state['player']['vx']) < 1
        page.screenshot(path=str(OUT / f'play-mobile-{label}.png'))
        page.locator('#pause-button').tap()
        page.clock.run_for(32)
        assert snapshot()['mode'] == 'paused'
        page.locator('#restart-button').tap()
        page.locator('#reset-cancel').tap()
        assert len(snapshot()['progress']['shards']) == 1
        page.locator('#resume-button').tap()
        page.clock.run_for(32)
        assert snapshot()['mode'] == 'playing'
        assert not errors, errors
        results.append({'viewport': [width,height], 'native_multitouch_jump': 'PASS', 'shard_collection': 'PASS', 'pointer_cancel': 'PASS', 'pause_and_reset_cancel': 'PASS', 'console_errors': errors})
        context.close()
    browser.close()
    print(json.dumps(results, ensure_ascii=False))
