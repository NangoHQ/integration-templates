import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-appointment.js';

describe('acuity-scheduling get-appointment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-appointment',
        Model: 'ActionOutput_acuity_scheduling_getappointment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
