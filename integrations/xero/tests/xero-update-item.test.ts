import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/update-item.js';

describe('xero update-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-item',
        Model: 'ActionOutput_xero_updateitem'
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
