import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-service-principal.js';

describe('microsoft update-service-principal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-service-principal',
        Model: 'ActionOutput_microsoft_updateserviceprincipal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
