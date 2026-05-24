import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-enrich-people.js';

describe('apollo bulk-enrich-people tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-enrich-people',
        Model: 'ActionOutput_apollo_oauth_bulkenrichpeople'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
