import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-roles.js';

describe('ramp list-roles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-roles',
        Model: 'ActionOutput_ramp_listroles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
