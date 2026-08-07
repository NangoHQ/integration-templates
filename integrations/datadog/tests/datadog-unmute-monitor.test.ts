import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unmute-monitor.js';

describe('datadog unmute-monitor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unmute-monitor',
        Model: 'ActionOutput_datadog_unmutemonitor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
