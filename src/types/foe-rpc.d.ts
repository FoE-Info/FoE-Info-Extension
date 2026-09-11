export interface InnoRpcEnvelope<T = unknown> {
  requestClass: string;
  requestMethod: string;
  responseData: T;
  requestId?: number;
}

export interface InnoRpcMessage<T = unknown> {
  class: string;
  method: string;
  data: T;
}
