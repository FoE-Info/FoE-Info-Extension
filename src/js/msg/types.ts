export type HandlerMessage = {
  requestClass?: string;
  requestMethod?: string;
  responseData?: unknown;
};

export type RewardData = {
  name?: string;
  amount?: number;
  source?: string;
  [key: string]: unknown;
};

export type RewardCallback = (reward: RewardData) => void;
