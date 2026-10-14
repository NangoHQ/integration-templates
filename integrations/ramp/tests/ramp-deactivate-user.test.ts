import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-user.js';

describe('ramp deactivate-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-user',
        Model: 'ActionOutput_ramp_deactivateuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
