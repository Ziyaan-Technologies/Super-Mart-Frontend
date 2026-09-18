export interface DashboardStatCardProps {
    title: string;
    value: string | number;
    icon: string;
    change?: string;
    currency?: string;
    comparisonLabel?: string;
    showInfoIcon?: boolean;
    progress?: number;
    progressLabel?: string;
}
