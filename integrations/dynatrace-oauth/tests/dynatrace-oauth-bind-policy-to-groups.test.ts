import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bind-policy-to-groups.js';

describe('dynatrace-oauth bind-policy-to-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bind-policy-to-groups',
        Model: 'ActionOutput_dynatrace_oauth_bindpolicytogroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
