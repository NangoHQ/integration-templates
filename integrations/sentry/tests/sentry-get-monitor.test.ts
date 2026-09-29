import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-monitor.js';

describe('sentry get-monitor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-monitor',
        Model: 'ActionOutput_sentry_getmonitor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
