import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-api-key.js';

describe('algolia delete-api-key tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-api-key',
        Model: 'ActionOutput_algolia_deleteapikey'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
