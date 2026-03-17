import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-company.js';

describe('hubspot get-company tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-company',
        Model: 'ActionOutput_hubspot_getcompany'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
