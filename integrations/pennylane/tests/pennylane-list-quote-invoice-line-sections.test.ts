import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-quote-invoice-line-sections.js';

describe('pennylane list-quote-invoice-line-sections tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-quote-invoice-line-sections',
        Model: 'ActionOutput_pennylane_listquoteinvoicelinesections'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
