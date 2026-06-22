import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-item-families.js';

describe('chargebee list-item-families tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-item-families',
        Model: 'ActionOutput_chargebee_listitemfamilies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
