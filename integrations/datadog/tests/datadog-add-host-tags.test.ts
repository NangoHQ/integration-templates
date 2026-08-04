import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-host-tags.js';

describe('datadog add-host-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-host-tags',
        Model: 'ActionOutput_datadog_addhosttags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
