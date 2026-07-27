import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-time-entries-bulk.js';

describe('workable create-time-entries-bulk tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-time-entries-bulk',
        Model: 'ActionOutput_workable_createtimeentriesbulk'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
