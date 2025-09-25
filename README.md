# VSCode Embedded AVD

This extension tries to embed android emulator within the editor in a webview similar to Android Studio's implementation.

# Usage

Android Emulator installed and available in your PATH ie. `emulator` should be accesible by the terminal or you can update `embeddedAvd.emulatorPath` to point to the binary

- Open Command Palette and run `Embedded AVD: Start`
- Select one of the emulators

## Prerequisites

- Node.js, pnpm, and VS Code

## Setup

1. Install dependencies:
   ```sh
   pnpm install
   brew install protobuf
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
   - Open Command Palette and run `Embedded AVD: Start`
   - Select one of the emulators
5. Run the extension in VS Code Extension Development Host.

## Features

- Uses Android Emulator gRPC APIs for near-native performance
- Forwards touch, multi-touch, and keyboard events

## Disclaimer

- This is WIP and may not work at all as it is not tested on multiple platforms.

### TODO

[] - Multiple AVDs
