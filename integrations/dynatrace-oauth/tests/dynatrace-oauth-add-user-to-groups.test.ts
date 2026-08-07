import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-user-to-groups.js';

describe('dynatrace-oauth add-user-to-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-user-to-groups',
        Model: 'ActionOutput_dynatrace_oauth_addusertogroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
