export type HandlerMessage = {
  requestClass?: string;
  requestMethod?: string;
  responseData?: unknown;
};

export type MessageHandler<TMessage extends HandlerMessage = HandlerMessage> = (
  msg: TMessage,
) => void;

export type BattlegroundOptions = {
  showLeaderboard?: boolean;
  showBattleground?: boolean;
};

export type RewardData = {
  name?: string;
  amount?: number;
  source?: string;
  [key: string]: unknown;
};

export type RewardCallback = (reward: RewardData) => void;
