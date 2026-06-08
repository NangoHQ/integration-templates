import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-segments.js';

describe('shopify list-customer-segments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customer-segments',
        Model: 'ActionOutput_shopify_listcustomersegments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
