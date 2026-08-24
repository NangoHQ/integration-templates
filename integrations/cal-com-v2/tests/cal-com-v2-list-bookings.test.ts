import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-bookings.js';

describe('cal-com-v2 list-bookings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-bookings',
        Model: 'ActionOutput_cal_com_v2_listbookings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
