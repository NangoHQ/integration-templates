import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-base-schema.js';

describe('airtable get-base-schema tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-base-schema',
        Model: 'ActionOutput_airtable_getbaseschema'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
