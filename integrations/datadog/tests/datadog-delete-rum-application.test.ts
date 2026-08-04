import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-rum-application.js';

describe('datadog delete-rum-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-rum-application',
        Model: 'ActionOutput_datadog_deleterumapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
