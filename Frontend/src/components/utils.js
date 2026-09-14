export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const frequencyMap = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'half-yearly': 'Half Yearly',
  yearly: 'Yearly'
};
