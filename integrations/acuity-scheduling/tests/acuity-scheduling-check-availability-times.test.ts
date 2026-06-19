import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-availability-times.js';

describe('acuity-scheduling check-availability-times tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-availability-times',
        Model: 'ActionOutput_acuity_scheduling_checkavailabilitytimes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
