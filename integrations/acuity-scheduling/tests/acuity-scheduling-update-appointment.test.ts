import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-appointment.js';

describe('acuity-scheduling update-appointment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-appointment',
        Model: 'ActionOutput_acuity_scheduling_updateappointment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
