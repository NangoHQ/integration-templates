import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-calendars.js';

describe('cal-com-v2 list-calendars tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-calendars',
        Model: 'ActionOutput_cal_com_v2_listcalendars'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
