// Format string month to short month name
export const formatMonthAxisValue = (dateString: string) =>
  new Date(dateString).toLocaleString('default', { month: 'short' });
