import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-rum-application.js';

describe('datadog create-rum-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-rum-application',
        Model: 'ActionOutput_datadog_createrumapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
