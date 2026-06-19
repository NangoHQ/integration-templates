import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-appointment.js';

describe('acuity-scheduling cancel-appointment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-appointment',
        Model: 'ActionOutput_acuity_scheduling_cancelappointment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
