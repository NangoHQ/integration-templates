import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-rum-applications.js';

describe('datadog list-rum-applications tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-rum-applications',
        Model: 'ActionOutput_datadog_listrumapplications'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
