import { vi, expect, it, describe } from "vitest";
import type { NangoSync } from "../models.js";

import fetchData from "../syncs/tickets.js";

describe("salesforce tickets tests", () => {
  const nangoMock = new global.vitest.NangoSyncMock({ 
      dirname: __dirname,
      name: "tickets",
      Model: "Ticket"
  });

  const batchSaveSpy = vi.spyOn(nangoMock, 'batchSave');

  it("should get, map correctly the data and batchSave the result", async () => {
    await fetchData(nangoMock);

    const batchSaveData = await nangoMock.getBatchSaveData();

    const totalCalls = batchSaveSpy.mock.calls.length;

    if (totalCalls > 1) {
        const splitSize = Math.ceil(batchSaveData.length / totalCalls);

        const splitBatchSaveData = [];
        for (let i = 0; i < totalCalls; i++) {
          const chunk = batchSaveData.slice(i * splitSize, (i + 1) * splitSize);
          splitBatchSaveData.push(chunk);
        }

        splitBatchSaveData.forEach((data, index) => {
          expect(batchSaveSpy?.mock.calls[index][0]).toEqual(data);
        });

    } else {
        expect(nangoMock.batchSave).toHaveBeenCalledWith(batchSaveData, "Ticket");
    }
  });

  it('should get, map correctly the data and batchDelete the result', async () => {
      await fetchData(nangoMock);

      const batchDeleteData = await nangoMock.getBatchDeleteData();
      if (batchDeleteData && batchDeleteData.length > 0) {
          expect(nangoMock.batchDelete).toHaveBeenCalledWith(batchDeleteData, "Ticket");
      }
  });
});
