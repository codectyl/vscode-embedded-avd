import { Client, ClientUnaryCall, ServiceError } from '@grpc/grpc-js';

type GRPCCallback<ResponseType> = (
  error: ServiceError | null,
  response: ResponseType,
) => void;

type GRPCMethod<RequestType, ResponseType> = (
  request: RequestType,
  callback: GRPCCallback<ResponseType>,
) => ClientUnaryCall;

function grpcAsync<RequestType, ResponseType>(
  fn: (
    request: RequestType,
    callback: GRPCCallback<ResponseType>,
  ) => ClientUnaryCall,
  args: RequestType,
): Promise<ResponseType> {
  return new Promise((resolve, reject) => {
    const callback = (error: ServiceError | null, response: ResponseType) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    };

    fn(args, callback);
  });
}

export const GRPCAsync = (client: Client) => ({
  run: <RequestType, ResponseType>(
    fn: GRPCMethod<RequestType, ResponseType>,
    args: RequestType,
  ): Promise<ResponseType> => {
    fn = fn.bind(client);
    return grpcAsync(fn, args);
  },
});

export function waitForClientReady(
  client: Client,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.waitForReady(Date.now() + timeoutMs, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
