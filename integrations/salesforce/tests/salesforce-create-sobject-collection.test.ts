import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-sobject-collection.js';

describe('salesforce create-sobject-collection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-sobject-collection',
        Model: 'ActionOutput_salesforce_createsobjectcollection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
