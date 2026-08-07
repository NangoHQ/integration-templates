import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-service-user.js';

describe('dynatrace-oauth create-service-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-service-user',
        Model: 'ActionOutput_dynatrace_oauth_createserviceuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
