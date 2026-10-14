import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-location.js';

describe('ramp update-location tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-location',
        Model: 'ActionOutput_ramp_updatelocation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
