import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-location.js';

describe('ramp create-location tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-location',
        Model: 'ActionOutput_ramp_createlocation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
