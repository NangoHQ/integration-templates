import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upsert-sobject-collection.js';

describe('salesforce upsert-sobject-collection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upsert-sobject-collection',
        Model: 'ActionOutput_salesforce_upsertsobjectcollection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
