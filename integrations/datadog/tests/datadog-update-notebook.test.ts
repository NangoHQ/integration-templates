import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-notebook.js';

describe('datadog update-notebook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-notebook',
        Model: 'ActionOutput_datadog_updatenotebook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
