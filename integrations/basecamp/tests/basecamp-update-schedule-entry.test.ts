import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-schedule-entry.js';

describe('basecamp update-schedule-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-schedule-entry',
        Model: 'ActionOutput_basecamp_updatescheduleentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
