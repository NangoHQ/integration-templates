import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-schedule-overrides.js';

describe('pagerduty list-schedule-overrides tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-schedule-overrides',
        Model: 'ActionOutput_pagerduty_listscheduleoverrides'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
