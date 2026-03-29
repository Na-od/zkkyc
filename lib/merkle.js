/**
 * merkle.js — Poseidon-based Merkle tree matching the circuit.
 *
 * Depth 8 → up to 256 leaves.
 * Empty leaves are 0n.
 */
import { poseidon2 } from "./poseidon.js";

const DEFAULT_DEPTH = 8;

/**
 * Build a full Merkle tree from an array of leaf BigInts.
 * Pads to 2^depth with zero leaves.
 *
 * @param {BigInt[]} leaves - identity commitments
 * @param {number}   depth  - tree depth (default 8)
 * @returns {{ tree: BigInt[][], root: BigInt }}
 */
export function buildMerkleTree(leaves, depth = DEFAULT_DEPTH) {
  const size = 1 << depth;

  // Level 0 = leaves (padded)
  const level0 = new Array(size).fill(0n);
  for (let i = 0; i < Math.min(leaves.length, size); i++) {
    level0[i] = BigInt(leaves[i]);
  }

  const tree = [level0];
  let current = level0;

  for (let d = 0; d < depth; d++) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] ?? 0n;
      next.push(poseidon2(left, right));
    }
    tree.push(next);
    current = next;
  }

  return { tree, root: tree[depth][0] };
}

/**
 * Generate a Merkle inclusion proof for a leaf at `index`.
 *
 * @param {BigInt[][]} tree   - full tree from buildMerkleTree
 * @param {number}     index - leaf index
 * @param {number}     depth - tree depth
 * @returns {{ pathElements: BigInt[], pathIndices: number[] }}
 */
export function getMerkleProof(tree, index, depth = DEFAULT_DEPTH) {
  const pathElements = [];
  const pathIndices = [];
  let idx = index;

  for (let d = 0; d < depth; d++) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    pathElements.push(tree[d][siblingIdx] ?? 0n);
    pathIndices.push(idx % 2);
    idx = Math.floor(idx / 2);
  }

  return { pathElements, pathIndices };
}
