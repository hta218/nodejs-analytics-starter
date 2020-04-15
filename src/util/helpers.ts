import { parseISO, differenceInDays, addDays, format } from "date-fns";
export function generateAnalyticsDates(startDate: string, endDate: string) {
  const first = parseISO(startDate);
  const last = parseISO(endDate);

  const diff = differenceInDays(last, first);

  const dates = [];

  for (let i = 0; i < diff + 1; i++) {
    const generatedDay = format(addDays(first, i), "yyyy-MM-dd");
    dates.push(generatedDay);
  }

  return dates;
}
export function fillAnalyticsData(analytics: any[], startDate: string, endDate: string) {
  const fullDates = generateAnalyticsDates(startDate, endDate);
  const { length } = fullDates;

  let result = [];

  result = analytics.map(data => {
    const { dates } = data;

    const newData = {
      ...data,
      dates: fullDates,
      avgSessionDuration: new Array(length).fill(0),
      bounceRate: new Array(length).fill(0),
      visitors: new Array(length).fill(0),
      addToCart: new Array(length).fill(0),
      productViews: new Array(length).fill(0),
      revenue: new Array(length).fill(0),
    };

    ;["avgSessionDuration", "bounceRate", "visitors", "addToCart", "productViews"].forEach(metric => {
      fullDates.forEach((date, index) => {
        if (dates.includes(date)) {
          const oldIndex = dates.indexOf(date);
          newData[metric][index] = data[metric][oldIndex];
        }
      });
    });

    return newData;
  });

  return result;
}