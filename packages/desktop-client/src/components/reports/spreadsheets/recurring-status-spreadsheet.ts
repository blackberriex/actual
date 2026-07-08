import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

export type RecurringSpentRow = {
  category: string;
  amount: number;
};

export type RecurringSpentData = {
  rows: RecurringSpentRow[];
  start: string;
  end: string;
};

export function recurringSpentSpreadsheet(categoryIds: string[]) {
  const month = monthUtils.currentMonth();

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: RecurringSpentData) => void,
  ) => {
    if (!categoryIds.length) {
      setData({
        rows: [],
        start: monthUtils.firstDayOfMonth(month),
        end: monthUtils.currentDay(),
      });
      return;
    }

    let data;
    try {
      data = await aqlQuery(
        q('transactions')
          .filter({
            $and: [
              { date: { $transform: '$month', $gte: month } },
              { date: { $transform: '$month', $lte: month } },
              { amount: { $lt: 0 } },
              { category: { $oneof: categoryIds } },
            ],
          })
          .groupBy([{ $id: '$category' }])
          .select([
            { category: { $id: '$category.id' } },
            { amount: { $sum: '$amount' } },
          ]),
      );
    } catch (error) {
      console.error('Error executing recurring-spent query:', error);
      return;
    }

    setData({
      rows: data.data,
      start: monthUtils.firstDayOfMonth(month),
      end: monthUtils.currentDay(),
    });
  };
}
