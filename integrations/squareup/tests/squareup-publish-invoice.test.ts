import { expect, it, describe } from 'vitest';

import createAction from '../actions/publish-invoice.js';

describe('squareup publish-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'publish-invoice',
        Model: 'ActionOutput_squareup_publishinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
