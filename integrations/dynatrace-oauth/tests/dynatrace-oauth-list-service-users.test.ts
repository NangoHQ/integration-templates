import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-service-users.js';

describe('dynatrace-oauth list-service-users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-service-users',
        Model: 'ActionOutput_dynatrace_oauth_listserviceusers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
