import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-project-environment.js';

describe('sentry update-project-environment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-project-environment',
        Model: 'ActionOutput_sentry_updateprojectenvironment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
