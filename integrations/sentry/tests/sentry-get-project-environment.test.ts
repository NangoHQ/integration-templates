import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-project-environment.js';

describe('sentry get-project-environment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-project-environment',
        Model: 'ActionOutput_sentry_getprojectenvironment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
