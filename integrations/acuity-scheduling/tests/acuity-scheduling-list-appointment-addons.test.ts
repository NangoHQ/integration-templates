import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-appointment-addons.js';

describe('acuity-scheduling list-appointment-addons tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-appointment-addons',
        Model: 'ActionOutput_acuity_scheduling_listappointmentaddons'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
