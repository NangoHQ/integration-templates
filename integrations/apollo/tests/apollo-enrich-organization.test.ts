import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/enrich-organization.js';

describe('apollo enrich-organization tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'enrich-organization',
        Model: 'ActionOutput_apollo_oauth_enrichorganization'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
