import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-group-permissions.js';

describe('dynatrace-oauth set-group-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-group-permissions',
        Model: 'ActionOutput_dynatrace_oauth_setgrouppermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
