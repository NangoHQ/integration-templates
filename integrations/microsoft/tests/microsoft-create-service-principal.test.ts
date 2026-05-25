import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-service-principal.js';

describe('microsoft create-service-principal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-service-principal',
        Model: 'ActionOutput_microsoft_createserviceprincipal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
