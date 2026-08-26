import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-schedule-entry.js';

describe('basecamp create-schedule-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-schedule-entry',
        Model: 'ActionOutput_basecamp_createscheduleentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
