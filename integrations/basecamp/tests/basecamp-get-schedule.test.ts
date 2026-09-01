import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-schedule.js';

describe('basecamp get-schedule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-schedule',
        Model: 'ActionOutput_basecamp_getschedule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
