import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-availability-schedule.js';

describe('cal-com-v2 create-availability-schedule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-availability-schedule',
        Model: 'ActionOutput_cal_com_v2_createavailabilityschedule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
