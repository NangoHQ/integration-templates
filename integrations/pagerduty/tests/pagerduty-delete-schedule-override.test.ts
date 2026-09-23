import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-schedule-override.js';

describe('pagerduty delete-schedule-override tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-schedule-override',
        Model: 'ActionOutput_pagerduty_deletescheduleoverride'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
