import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-block.js';

describe('acuity-scheduling create-block tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-block',
        Model: 'ActionOutput_acuity_scheduling_createblock'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
