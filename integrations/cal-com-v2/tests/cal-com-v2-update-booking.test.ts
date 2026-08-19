import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-booking.js';

describe('cal-com-v2 update-booking tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-booking',
        Model: 'ActionOutput_cal_com_v2_updatebooking'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
