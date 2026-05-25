import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/enrich-person.js';

describe('apollo enrich-person tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'enrich-person',
        Model: 'ActionOutput_apollo_oauth_enrichperson'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
