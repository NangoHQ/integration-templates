import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-slo-corrections.js';

describe('datadog list-slo-corrections tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-slo-corrections',
        Model: 'ActionOutput_datadog_listslocorrections'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
