# VSCode Embedded AVD

## Prerequisites

- Android Emulator installed and available in your PATH
- Node.js, pnpm, and VS Code

## Setup

1. Install dependencies:
   ```sh
   pnpm install
   ```
2. Install gRPC and codegen tools:
   ```sh
   pnpm add -D ts-proto grpc-tools
   ```
3. Generate TypeScript types from proto:
   ```sh
    protoc \
    --plugin=./node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_out=./src/generated \
    --ts_proto_opt=esModuleInterop=true,outputServices=grpc-js \
    -I ./src/proto \
    ./src/proto/emulator_controller.proto
   ```
   This will create typed gRPC client code in `src/generated`.
4. Configure the extension:
   - Open Command Palette and run `Android Emulator: Configure`
   - Enter the path to your emulator binary (e.g. `/Users/yourname/Library/Android/sdk/emulator/emulator`)
   - Enter your AVD name (run `emulator -list-avds` to see available names)
5. Run the extension in VS Code Extension Development Host.
6. Command Palette -> "Android Emulator: Open" to launch the embedded emulator panel.

## Features

- Uses Android Emulator gRPC API for near-native performance
- Streams framebuffer to VS Code panel
- Forwards touch, multi-touch, and keyboard events
- Type-safe gRPC client using ts-proto

## Notes & caveats

- Make sure your emulator is running and accessible on the configured gRPC port (default: 8554)
- If you update your proto file, re-run `sh ts-proto-gen.sh` to regenerate types
- For advanced screenshot options, update your proto and emulator if supported
- For troubleshooting, check logs in the VS Code output and terminal

### TODO

[] - Config to detect or update AVD path
[] - Option to list and select active emulators
[] - Performance optimization for the stream
[] - Silently run and sync AVD process with plugin
[] - Multiple AVDs ??
