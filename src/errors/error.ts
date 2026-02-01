export class GRPCClientNotConnectedError extends Error {
  constructor(message = 'gRPC client is not connected.') {
    super(message);
    this.name = 'GRPCClientNotConnectedError';
    Object.setPrototypeOf(this, GRPCClientNotConnectedError.prototype);
  }
}
