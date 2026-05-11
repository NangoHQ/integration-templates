import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-sobject-collection.js';

describe('salesforce update-sobject-collection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-sobject-collection',
        Model: 'ActionOutput_salesforce_updatesobjectcollection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
