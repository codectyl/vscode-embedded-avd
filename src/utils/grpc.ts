import {
  CallOptions,
  ClientUnaryCall,
  Metadata,
  ServiceError,
} from '@grpc/grpc-js';

type GRPCCallback<ResponseType> = (
  error: ServiceError | null,
  response: ResponseType,
) => void;

export type GRPCMethod<RequestType, ResponseType> =
  | ((
      request: RequestType,
      callback: GRPCCallback<ResponseType>,
    ) => ClientUnaryCall)
  | ((
      request: RequestType,
      metadata: Metadata,
      callback: GRPCCallback<ResponseType>,
    ) => ClientUnaryCall)
  | ((
      request: RequestType,
      metadata: Metadata,
      options: Partial<CallOptions>,
      callback: GRPCCallback<ResponseType>,
    ) => ClientUnaryCall);

export function grpcAsync<RequestType, ResponseType>(
  fn: (
    request: RequestType,
    callback: GRPCCallback<ResponseType>,
  ) => ClientUnaryCall,
  args: RequestType,
): Promise<ResponseType>;

export function grpcAsync<RequestType, ResponseType>(
  fn: (
    request: RequestType,
    metadata: Metadata,
    callback: GRPCCallback<ResponseType>,
  ) => ClientUnaryCall,
  args: RequestType,
  metadata: Metadata,
): Promise<ResponseType>;

export function grpcAsync<RequestType, ResponseType>(
  fn: (
    request: RequestType,
    metadata: Metadata,
    options: Partial<CallOptions>,
    callback: GRPCCallback<ResponseType>,
  ) => ClientUnaryCall,
  args: RequestType,
  metadata: Metadata,
  options: Partial<CallOptions>,
): Promise<ResponseType>;

export function grpcAsync<RequestType, ResponseType>(
  fn: any,
  args: RequestType,
  metadata?: Metadata,
  options?: Partial<CallOptions>,
): Promise<ResponseType> {
  return new Promise((resolve, reject) => {
    const callback = (error: ServiceError | null, response: ResponseType) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    };

    if (metadata && options) {
      fn(args, metadata, options, callback);
    } else if (metadata) {
      fn(args, metadata, callback);
    } else {
      fn(args, callback);
    }
  });
}
