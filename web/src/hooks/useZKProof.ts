import { useState, useRef, useCallback } from 'react';
import { ZKProofInput, ZKProofOutput } from '../lib/zkProof';

export type ProofStatus = 'idle' | 'generating' | 'complete' | 'error';

export function useZKProof() {
  const [status, setStatus] = useState<ProofStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const generateProof = useCallback((input: ZKProofInput): Promise<ZKProofOutput> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('../workers/zkWorker', import.meta.url));
      }

      const worker = workerRef.current;
      setStatus('generating');
      setError(null);

      worker.onmessage = (event) => {
        const { type, payload } = event.data;

        if (type === 'PROOF_SUCCESS') {
          setStatus('complete');
          resolve(payload);
        }

        if (type === 'PROOF_ERROR') {
          setStatus('error');
          setError(payload);
          reject(new Error(payload));
        }
      };

      worker.postMessage({
        type: 'GENERATE_PROOF',
        payload: input
      });
    });
  }, []);

  return { generateProof, status, error };
}
