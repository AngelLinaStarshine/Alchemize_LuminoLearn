import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

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

/** Mobile cameras often reject exact sizes; try relaxed constraints then fall back. */
async function attachUserFacingCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    },
    {
      audio: false,
      video: { facingMode: 'user' },
    },
    { audio: false, video: true },
  ];

  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export const useHandTracking = (
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement | null,
  options?: UseHandTrackingOptions
) => {
  const [handState, setHandState] = useState<HandState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const canvasDrawRef = useRef<HTMLCanvasElement | null>(null);
  const drawOptsRef = useRef({ enhanced: !!options?.enhancedHandDrawing });
  const acceptResultsRef = useRef(false);
  drawOptsRef.current = { enhanced: !!options?.enhancedHandDrawing };

  useEffect(() => {
    canvasDrawRef.current = canvasElement;
  }, [canvasElement]);

  const onResults = useCallback((results: Results) => {
    if (!acceptResultsRef.current) return;

    try {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

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

        setHandState((prev) => {
          if (
            prev &&
            Math.abs(prev.x - newX) < 0.003 &&
            Math.abs(prev.y - newY) < 0.003 &&
            prev.isPinching === newIsPinching &&
            prev.isGrabbing === newIsGrabbing
          ) {
            return prev;
          }
          return {
            x: newX,
            y: newY,
            isPinching: newIsPinching,
            isGrabbing: newIsGrabbing,
          };
        });
      } else {
        setHandState(null);
      }

      const canvasEl = canvasDrawRef.current;
      const canvasCtx = canvasEl?.getContext('2d');
      if (!canvasEl || !canvasCtx) return;

      const { enhanced } = drawOptsRef.current;
      const connectorStyle = enhanced
        ? { color: '#4ade80', lineWidth: 4 }
        : { color: '#00FF00', lineWidth: 2 };
      const landmarkStyle = enhanced
        ? { color: '#f87171', lineWidth: 2, radius: 5 }
        : { color: '#FF0000', lineWidth: 1, radius: 3 };

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      canvasCtx.translate(canvasEl.width, 0);
      canvasCtx.scale(-1, 1);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, connectorStyle);
        drawLandmarks(canvasCtx, landmarks, landmarkStyle);
      }
      canvasCtx.restore();
    } catch (e) {
      console.warn('Hand tracking: draw/state update failed', e);
    }
  }, []);

  useEffect(() => {
    if (!videoElement) return;

    acceptResultsRef.current = false;
    setIsReady(false);

    let cancelled = false;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let hands: Hands | null = null;

    const stopAll = () => {
      acceptResultsRef.current = false;
      cancelled = true;
      cancelAnimationFrame(rafId);
      rafId = 0;
      if (hands) {
        try {
          hands.close();
        } catch {
          /* already closed */
        }
        hands = null;
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      videoElement.srcObject = null;
      setHandState(null);
      setIsReady(false);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          console.error('Hand tracking: getUserMedia is not available');
          return;
        }

        stream = await attachUserFacingCamera(videoElement);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
          return;
        }

        videoElement.srcObject = stream;
        videoElement.setAttribute('playsinline', 'true');
        videoElement.playsInline = true;
        videoElement.muted = true;
        await videoElement.play();
        if (cancelled) return;

        hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        if (cancelled) {
          try {
            hands.close();
          } catch {
            /* ignore */
          }
          hands = null;
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
          return;
        }

        acceptResultsRef.current = true;
        setIsReady(true);

        const driveFrame = () => {
          if (cancelled || !hands) return;
          const done = () => {
            if (!cancelled && hands) rafId = requestAnimationFrame(driveFrame);
          };
          if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            hands.send({ image: videoElement }).then(done).catch(done);
          } else {
            done();
          }
        };
        rafId = requestAnimationFrame(driveFrame);
      } catch (e) {
        if (!cancelled) console.error('Hand tracking: camera / model failed', e);
        setIsReady(false);
      }
    })();

    return stopAll;
  }, [videoElement, onResults]);

  return { handState, isReady };
};
