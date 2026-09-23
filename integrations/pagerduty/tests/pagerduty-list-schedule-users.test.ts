import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-schedule-users.js';

describe('pagerduty list-schedule-users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-schedule-users',
        Model: 'ActionOutput_pagerduty_listscheduleusers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
