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
  // schedule id -> category id, inferred from the latest categorized
  // transaction linked to the schedule (schedules carry no category
  // themselves unless their rule has an explicit set-category action)
  scheduleCategories: Record<string, string>;
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
        scheduleCategories: {},
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

    // infer each schedule's category from its schedule-linked transactions
    // (newest categorized one wins); look back 6 months
    const scheduleCategories: Record<string, string> = {};
    try {
      const linked = await aqlQuery(
        q('transactions')
          .filter({
            $and: [
              { schedule: { $ne: null } },
              {
                date: {
                  $transform: '$month',
                  $gte: monthUtils.subMonths(month, 6),
                },
              },
            ],
          })
          .select([
            { schedule: { $id: '$schedule.id' } },
            { category: { $id: '$category.id' } },
            'date',
          ])
          .orderBy({ date: 'desc' }),
      );
      for (const row of linked.data) {
        if (row.schedule && row.category && !scheduleCategories[row.schedule]) {
          scheduleCategories[row.schedule] = row.category;
        }
      }
    } catch (error) {
      console.error('Error executing schedule-category query:', error);
    }

    setData({
      rows: data.data,
      scheduleCategories,
      start: monthUtils.firstDayOfMonth(month),
      end: monthUtils.currentDay(),
    });
  };
}
