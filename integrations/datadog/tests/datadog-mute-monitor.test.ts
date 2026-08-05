import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mute-monitor.js';

describe('datadog mute-monitor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mute-monitor',
        Model: 'ActionOutput_datadog_mutemonitor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
