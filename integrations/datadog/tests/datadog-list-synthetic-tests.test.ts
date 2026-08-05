import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-synthetic-tests.js';

describe('datadog list-synthetic-tests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-synthetic-tests',
        Model: 'ActionOutput_datadog_listsynthetictests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
