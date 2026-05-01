import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-page-property.js';

describe('confluence delete-page-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-page-property',
        Model: 'ActionOutput_confluence_deletepageproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
