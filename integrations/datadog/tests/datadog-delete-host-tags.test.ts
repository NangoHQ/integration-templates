import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-host-tags.js';

describe('datadog delete-host-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-host-tags',
        Model: 'ActionOutput_datadog_deletehosttags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
