import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-service-user.js';

describe('dynatrace-oauth update-service-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-service-user',
        Model: 'ActionOutput_dynatrace_oauth_updateserviceuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
