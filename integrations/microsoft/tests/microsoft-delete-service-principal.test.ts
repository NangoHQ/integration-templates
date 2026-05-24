import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-service-principal.js';

describe('microsoft delete-service-principal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-service-principal',
        Model: 'ActionOutput_microsoft_deleteserviceprincipal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
