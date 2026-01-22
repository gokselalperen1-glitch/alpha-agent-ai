interface PortfolioSummaryProps {
  balance: number;
  portfolioValue: number;
  positionsCount: number;
  pendingOrdersCount: number;
}

export const PortfolioSummary = ({
  balance,
  portfolioValue,
  positionsCount,
  pendingOrdersCount
}: PortfolioSummaryProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground">Cash Balance</p>
        <p className="text-lg font-bold font-mono">${balance.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Portfolio Value</p>
        <p className="text-lg font-bold font-mono">${portfolioValue.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Open Positions</p>
        <p className="text-lg font-bold">{positionsCount}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Pending Orders</p>
        <p className="text-lg font-bold text-primary">{pendingOrdersCount}</p>
      </div>
    </div>
  );
};
