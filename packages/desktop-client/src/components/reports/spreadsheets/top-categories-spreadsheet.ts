import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import type { useSpreadsheet } from '#hooks/useSpreadsheet';
import { aqlQuery } from '#queries/aqlQuery';

export type TopCategoriesRow = {
  category: string | null;
  amount: number;
};

export type TopCategoriesData = {
  rows: TopCategoriesRow[];
  start: string;
  end: string;
};

export function topCategoriesSpreadsheet(pastMonths: number = 0) {
  const currentMonth = monthUtils.currentMonth();
  const startMonth = monthUtils.subMonths(currentMonth, pastMonths);

  return async (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (data: TopCategoriesData) => void,
  ) => {
    let filters: unknown[] = [];
    try {
      const response = await send('make-filters-from-conditions', {
        conditions: [{ field: 'transfer', op: 'is', value: false }],
      });
      filters = response.filters;
    } catch (error) {
      console.error('Error fetching filters:', error);
    }

    let data;
    try {
      data = await aqlQuery(
        q('transactions')
          .filter({ $and: filters })
          .filter({
            $and: [
              { date: { $transform: '$month', $gte: startMonth } },
              { date: { $transform: '$month', $lte: currentMonth } },
              { amount: { $lt: 0 } },
              { 'account.offbudget': false },
            ],
          })
          .groupBy([{ $id: '$category' }])
          .select([
            { category: { $id: '$category.id' } },
            { amount: { $sum: '$amount' } },
          ]),
      );
    } catch (error) {
      console.error('Error executing top-categories query:', error);
      return;
    }

    setData({
      rows: data.data,
      start: monthUtils.firstDayOfMonth(startMonth),
      end: monthUtils.currentDay(),
    });
  };
}
