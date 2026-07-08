import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/link-credit-note-to-customer-invoice.js';

describe('pennylane link-credit-note-to-customer-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'link-credit-note-to-customer-invoice',
        Model: 'ActionOutput_pennylane_linkcreditnotetocustomerinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
