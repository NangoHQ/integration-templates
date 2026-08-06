import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-group-permissions.js';

describe('dynatrace-oauth assign-group-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-group-permissions',
        Model: 'ActionOutput_dynatrace_oauth_assigngrouppermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
