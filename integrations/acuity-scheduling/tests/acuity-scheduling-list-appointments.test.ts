import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-appointments.js';

describe('acuity-scheduling list-appointments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-appointments',
        Model: 'ActionOutput_acuity_scheduling_listappointments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
