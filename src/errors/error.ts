export class GRPCClientNotConnectedError extends Error {
  constructor(message: string = 'gRPC client is not connected.') {
    super(message);
    this.name = 'GRPCClientNotConnectedError';
    Object.setPrototypeOf(this, GRPCClientNotConnectedError.prototype);
  }
}
