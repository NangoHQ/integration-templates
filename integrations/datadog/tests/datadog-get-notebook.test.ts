import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-notebook.js';

describe('datadog get-notebook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-notebook',
        Model: 'ActionOutput_datadog_getnotebook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
