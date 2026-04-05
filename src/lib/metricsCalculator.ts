import type { DashboardMetrics } from '@/lib/metricsService';
import { computeDashboardMetrics, type ComputeDashboardMetricsInput } from '@/lib/metricsService';

export function calculateMonthlyRevenue(metrics: DashboardMetrics) {
  return metrics.monthlyRevenue;
}

export function calculateOccupancyRate(metrics: DashboardMetrics) {
  return metrics.occupancyRate;
}

export function calculateAverageBookingValue(metrics: DashboardMetrics) {
  return metrics.averageBookingValue;
}

export function getActiveDogsCount(metrics: DashboardMetrics) {
  return metrics.activeDogs;
}

export function getNewDogsThisMonth(metrics: DashboardMetrics) {
  return metrics.newDogsThisMonth;
}

export function getTopDogsByBookings(metrics: DashboardMetrics) {
  return metrics.topDogs;
}

export function calculateMetrics(input: ComputeDashboardMetricsInput) {
  return computeDashboardMetrics(input);
}
