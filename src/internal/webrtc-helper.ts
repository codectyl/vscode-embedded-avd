import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStreamTrack,
  RTCPeerConnectionIceEvent,
} from '@roamhq/wrtc';

class WebRTCHelper {
  peerConnection: RTCPeerConnection;
  videoTrack;
  ffmpegProcess: any;
  isStreaming = false;

  constructor() {
    console.log('Client connected. Starting WebRTC session...');

    // Set up a new PeerConnection for the client
    this.peerConnection = new RTCPeerConnection();
    this.isStreaming = true;

    // Create a video track that will receive data from our source
    this.videoTrack = new MediaStreamTrack();
    this.peerConnection.addTrack(this.videoTrack);

    // Handle ICE candidates from the server and send to the client
    this.peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        // ws.send(
        //   JSON.stringify({
        //     type: 'candidate',
        //     candidate: event.candidate.toJSON(),
        //   }),
        // );
      }
    };
  }
}
