import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-sobject-collection.js';

describe('salesforce delete-sobject-collection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-sobject-collection',
        Model: 'ActionOutput_salesforce_deletesobjectcollection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
