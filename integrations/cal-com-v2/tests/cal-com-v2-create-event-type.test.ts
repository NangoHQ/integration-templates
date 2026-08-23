import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-event-type.js';

describe('cal-com-v2 create-event-type tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-event-type',
        Model: 'ActionOutput_cal_com_v2_createeventtype'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
