import './polyfill';
import { generateMembershipProof, ZKProofInput } from '../lib/zkProof';

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;
  
  if (type === 'GENERATE_PROOF') {
    try {
      const input = payload as ZKProofInput;
      // The payload structure matches ZKProofInput
      // Uint8Arrays sent via postMessage must be reconstructed or they might just pass cleanly
      
      // Let's ensure sk and r are true Uint8Arrays (structured clone algorithm might pass them as Uint8Arrays correctly)
      const sanitizedInput: ZKProofInput = {
        ...input,
        sk: new Uint8Array(input.sk),
        r: new Uint8Array(input.r)
      };

      const result = await generateMembershipProof(sanitizedInput);
      self.postMessage({ type: 'PROOF_SUCCESS', payload: result });
    } catch (e: any) {
      console.error("[zkWorker] Error generating proof:", e);
      self.postMessage({ type: 'PROOF_ERROR', payload: e.message });
    }
  }
};
