import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-platform-token.js';

describe('dynatrace-oauth create-platform-token tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-platform-token',
        Model: 'ActionOutput_dynatrace_oauth_createplatformtoken'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should use the explicit environmentId and skip the environment lookup', async () => {
        const explicitEnvMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'create-platform-token-explicit-environment',
            Model: 'ActionOutput_dynatrace_oauth_createplatformtoken'
        });
        const getSpy = vi.spyOn(explicitEnvMock, 'get');

        const input = await explicitEnvMock.getInput();
        const response = await createAction.exec(explicitEnvMock, input);
        const output = await explicitEnvMock.getOutput();

        expect(response).toEqual(output);
        expect(getSpy).not.toHaveBeenCalled();
    });
});
