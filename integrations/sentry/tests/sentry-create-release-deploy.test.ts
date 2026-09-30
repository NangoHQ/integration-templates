import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-release-deploy.js';

describe('sentry create-release-deploy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-release-deploy',
        Model: 'ActionOutput_sentry_createreleasedeploy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
