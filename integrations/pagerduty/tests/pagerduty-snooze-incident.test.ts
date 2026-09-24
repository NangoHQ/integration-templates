import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/snooze-incident.js';

describe('pagerduty snooze-incident tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'snooze-incident',
        Model: 'ActionOutput_pagerduty_snoozeincident'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
