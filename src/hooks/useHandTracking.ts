import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera } from '@mediapipe/camera_utils';

export interface HandState {
  x: number;
  y: number;
  isPinching: boolean;
  isGrabbing: boolean;
}

export interface UseHandTrackingOptions {
  /** Thicker skeleton + higher contrast for small screens / touch */
  enhancedHandDrawing?: boolean;
}

export const useHandTracking = (
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement | null,
  options?: UseHandTrackingOptions
) => {
  const [handState, setHandState] = useState<HandState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const handsRef = useRef<Hands | null>(null);
  const drawOptsRef = useRef({ enhanced: !!options?.enhancedHandDrawing });
  drawOptsRef.current = { enhanced: !!options?.enhancedHandDrawing };

  const onResults = useCallback((results: Results) => {
    if (!canvasElement) return;
    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    const { enhanced } = drawOptsRef.current;
    const connectorStyle = enhanced
      ? { color: '#4ade80', lineWidth: 4 }
      : { color: '#00FF00', lineWidth: 2 };
    const landmarkStyle = enhanced
      ? { color: '#f87171', lineWidth: 2, radius: 5 }
      : { color: '#FF0000', lineWidth: 1, radius: 3 };

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Mirror the canvas
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, connectorStyle);
      drawLandmarks(canvasCtx, landmarks, landmarkStyle);

      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];

      const distancePinch = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2)
      );

      const distanceGrab = Math.sqrt(
        Math.pow(thumbTip.x - middleTip.x, 2) + 
        Math.pow(thumbTip.y - middleTip.y, 2)
      );

      const newX = 1 - indexTip.x;
      const newY = indexTip.y;
      const newIsPinching = distancePinch < 0.14;
      const newIsGrabbing = distanceGrab < 0.1;

      setHandState(prev => {
        if (prev && 
            Math.abs(prev.x - newX) < 0.003 && 
            Math.abs(prev.y - newY) < 0.003 && 
            prev.isPinching === newIsPinching && 
            prev.isGrabbing === newIsGrabbing) {
          return prev;
        }
        return {
          x: newX,
          y: newY,
          isPinching: newIsPinching,
          isGrabbing: newIsGrabbing
        };
      });
    } else {
      setHandState(prev => prev === null ? null : null);
    }
    canvasCtx.restore();
  }, [canvasElement]);

  useEffect(() => {
    if (!videoElement) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });

    camera.start().then(() => setIsReady(true));

    return () => {
      camera.stop();
      hands.close();
    };
  }, [videoElement, onResults]);

  return { handState, isReady };
};
