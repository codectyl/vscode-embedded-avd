import {
  RTCPeerConnection,
  MediaStreamTrack,
  nonstandard,
  RTCPeerConnectionIceEvent,
  RTCDataChannel,
} from '@roamhq/wrtc';

import {
  ExtensionToWebviewPayload,
  FrameInfoDataChannelPayload,
  WebRTCMessage,
} from '../../interfaces/payload';
import { Size } from '../../utils/models';
import { RTCVideoFrame } from '@roamhq/wrtc/types/nonstandard';
import { DisplayConfiguration } from '../../generated/emulator_controller';

class WebRTCHelper {
  peerConnection: RTCPeerConnection;
  videoTrack: MediaStreamTrack;
  videoSource: nonstandard.RTCVideoSource;
  isStreaming = false;

  frameInfoChannel: RTCDataChannel;

  constructor(public postMessage: (msg: ExtensionToWebviewPayload) => void) {
    this.peerConnection = new RTCPeerConnection();
    this.isStreaming = true;

    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) return;
      postMessage({
        type: 'webrtcIceCandidate',
        candidate: event.candidate.toJSON(),
      });
    };

    this.videoSource = new nonstandard.RTCVideoSource();
    this.videoTrack = this.videoSource.createTrack();
    this.peerConnection.addTrack(this.videoTrack);
    this.frameInfoChannel = this.peerConnection.createDataChannel('frameInfo');

    this.postMessage({ type: 'readyForWebRTC' });
    console.log('Server ready for WebRTC connections');
  }

  async sendOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.postMessage({
      type: 'webrtcOffer',
      sdp: offer,
    });
  }

  convertFrameToI420(frameData: Uint8Array, size: Size): RTCVideoFrame {
    const buff = new Uint8Array(size.width * size.height * 1.5);
    nonstandard.rgbaToI420(
      {
        data: frameData,
        width: size.width,
        height: size.height,
      },
      {
        data: buff,
        width: size.width,
        height: size.height,
      },
    );
    return {
      data: buff,
      width: size.width,
      height: size.height,
    };
  }

  async putFrame(
    frameData: Uint8Array,
    size: Size,
    displayConfig: DisplayConfiguration,
  ) {
    if (!this.isStreaming) {
      console.warn('Not streaming. Ignoring frame.');
      return;
    }
    // Byte length mismatch because frameData is actually NodeJS Buffer. so converting to Uint8Array
    this.videoSource.onFrame(
      this.convertFrameToI420(new Uint8Array(frameData), size),
    );
    // Send frame size and display config through data channel
    // Should it be throttled ?
    if (this.frameInfoChannel.readyState === 'open') {
      this.frameInfoChannel.send(
        JSON.stringify({
          frameSize: size,
          displayConfig,
        } satisfies FrameInfoDataChannelPayload),
      );
    }
  }

  async handleWebRTCMessage(message: WebRTCMessage) {
    if (message.type === 'requestWebRTCConnection') {
      await this.sendOffer();
      return;
    }
    if (message.type === 'webrtcAnswer') {
      await this.peerConnection.setRemoteDescription({
        type: message.sdp['type'],
        sdp: message.sdp['sdp'],
      });
      return;
    }
    if (message.type === 'webrtcOffer') {
      await this.peerConnection.setRemoteDescription({
        type: message.sdp['type'],
        sdp: message.sdp['sdp'],
      });

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.postMessage({
        type: 'webrtcAnswer',
        sdp: answer,
      });
    } else if (message.type === 'webrtcIceCandidate') {
      await this.peerConnection.addIceCandidate(message.candidate);
    }
  }

  close() {
    this.peerConnection.close();
    this.isStreaming = false;
    this.videoTrack.stop();
  }
}

export default WebRTCHelper;
