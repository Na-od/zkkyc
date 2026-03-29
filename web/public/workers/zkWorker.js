// Web Worker for ZK Proof Generation
importScripts('https://cdn.jsdelivr.net/npm/snarkjs@0.7.3/build/snarkjs.min.js');

self.onmessage = async function(event) {
  const { type, payload } = event.data;

  if (type === 'GENERATE_PROOF') {
    try {
      self.postMessage({ type: 'STATUS', message: 'Loading circuit...' });

      const wasmResponse = await fetch('/circuits/membership_js/membership.wasm');
      const wasmBuffer = await wasmResponse.arrayBuffer();

      self.postMessage({ type: 'STATUS', message: 'Fetching proving key...' });
      const zkeyResponse = await fetch(payload.zkeyUrl);
      const zkeyBuffer = await zkeyResponse.arrayBuffer();

      self.postMessage({ type: 'STATUS', message: 'Generating proof...' });
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        payload.circuitInputs,
        new Uint8Array(wasmBuffer),
        new Uint8Array(zkeyBuffer)
      );

      self.postMessage({ type: 'PROOF_COMPLETE', proof, publicSignals });
    } catch (error) {
      self.postMessage({ type: 'PROOF_ERROR', error: error.message });
    }
  }
};
