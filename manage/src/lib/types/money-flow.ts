export enum MoneyFlowType {
  IN = "IN",
  OUT = "OUT",
}

export interface MoneyFlowDTO {
  id: number;
  description: string;
  type: MoneyFlowType;
  amount: number;
  remainingBalance: number;
  createdAt: string;
}

export interface MoneyFlowAggregationDTO {
  period: string;
  totalInflow: number;
  totalOutflow: number;
  netBalance: number;
  transactions?: MoneyFlowDTO[];
}

export interface MoneyFlowResponseDTO {
  startDate: string;
  endDate: string;
  granularity: string;
  aggregations: MoneyFlowAggregationDTO[];
}

export interface CreateMoneyFlowDTO {
  description: string;
  type: MoneyFlowType;
  amount: number;
}

export interface MoneyFlowBalanceDTO {
  balance: number;
}
