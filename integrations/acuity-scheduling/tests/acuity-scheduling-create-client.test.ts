import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-client.js';

describe('acuity-scheduling create-client tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-client',
        Model: 'ActionOutput_acuity_scheduling_createclient'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
