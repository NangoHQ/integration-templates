import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-order-note.js';

describe('woocommerce create-order-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-order-note',
        Model: 'ActionOutput_woocommerce_createordernote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
