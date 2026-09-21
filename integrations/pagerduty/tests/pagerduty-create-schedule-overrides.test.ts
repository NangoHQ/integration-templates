import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-schedule-overrides.js';

describe('pagerduty create-schedule-overrides tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-schedule-overrides',
        Model: 'ActionOutput_pagerduty_createscheduleoverrides'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
