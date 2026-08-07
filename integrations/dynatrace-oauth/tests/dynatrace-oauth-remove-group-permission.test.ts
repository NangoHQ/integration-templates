import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-group-permission.js';

describe('dynatrace-oauth remove-group-permission tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-group-permission',
        Model: 'ActionOutput_dynatrace_oauth_removegrouppermission'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
