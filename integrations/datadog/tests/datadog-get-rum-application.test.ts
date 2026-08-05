import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-rum-application.js';

describe('datadog get-rum-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-rum-application',
        Model: 'ActionOutput_datadog_getrumapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
