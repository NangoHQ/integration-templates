import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-catalog-request.js';

describe('servicenow get-catalog-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-catalog-request',
        Model: 'ActionOutput_servicenow_getcatalogrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
