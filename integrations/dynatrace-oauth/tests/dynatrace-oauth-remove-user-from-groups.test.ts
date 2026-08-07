import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-user-from-groups.js';

describe('dynatrace-oauth remove-user-from-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-user-from-groups',
        Model: 'ActionOutput_dynatrace_oauth_removeuserfromgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
