import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-incident-alert.js';

describe('pagerduty update-incident-alert tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-incident-alert',
        Model: 'ActionOutput_pagerduty_updateincidentalert'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
