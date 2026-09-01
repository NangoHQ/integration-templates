import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-availability-schedule.js';

describe('cal-com-v2 update-availability-schedule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-availability-schedule',
        Model: 'ActionOutput_cal_com_v2_updateavailabilityschedule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
