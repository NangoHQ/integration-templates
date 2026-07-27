import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-time-entry.js';

describe('workable create-time-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-time-entry',
        Model: 'ActionOutput_workable_createtimeentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
