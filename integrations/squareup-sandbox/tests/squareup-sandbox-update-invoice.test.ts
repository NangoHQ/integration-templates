import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-invoice.js';

describe('squareup-sandbox update-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-invoice',
        Model: 'ActionOutput_squareup_sandbox_updateinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
