import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-slo-correction.js';

describe('datadog get-slo-correction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-slo-correction',
        Model: 'ActionOutput_datadog_getslocorrection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
