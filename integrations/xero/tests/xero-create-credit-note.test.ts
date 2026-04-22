import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/create-credit-note.js';

describe('xero create-credit-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-credit-note',
        Model: 'ActionOutput_xero_createcreditnote'
    });

    beforeEach(() => {
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {
                tenant_id: '59712f8f-45a3-4d45-a705-5d0c9748317e'
            },
            metadata: {}
        });
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
