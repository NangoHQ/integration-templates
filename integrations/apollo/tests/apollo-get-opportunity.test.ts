import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-opportunity.js';

describe('apollo get-opportunity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-opportunity',
        Model: 'ActionOutput_apollo_oauth_getopportunity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
