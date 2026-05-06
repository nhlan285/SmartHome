export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export const formatTemp = (value: number): string => `${value.toFixed(1)} C`;

export const formatGas = (value: number): string => `${Math.round(value)} ppm`;

export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleString();
};
