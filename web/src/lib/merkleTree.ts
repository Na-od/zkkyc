import { buildPoseidon } from 'circomlibjs';

/**
 * Poseidon Merkle Tree implementation for anonymity sets.
 * Depth 4 = 16 leaves (as per circuit specification).
 */
export class PoseidonMerkleTree {
  private poseidon: any;
  private F: any;          // the finite field
  private depth: number;
  private leaves: bigint[];
  private zeros: bigint[];
  private layers: bigint[][];

  constructor(depth: number = 4) {
    this.depth = depth;
    this.leaves = [];
    this.zeros = [];
    this.layers = [];
  }

  async init() {
    this.poseidon = await buildPoseidon();
    this.F = this.poseidon.F;

    // Compute zero values for each level
    this.zeros[0] = BigInt(0);
    for (let i = 1; i <= this.depth; i++) {
      const hash = this.poseidon([this.zeros[i - 1], this.zeros[i - 1]]);
      this.zeros[i] = this.F.toObject(hash);
    }
    
    this.rebuild();
  }

  insert(leaf: bigint): number {
    const index = this.leaves.length;
    if (index >= 2 ** this.depth) {
      throw new Error(`Tree full — max ${2 ** this.depth} leaves`);
    }
    this.leaves.push(leaf);
    this.rebuild();
    return index;
  }

  private rebuild() {
    this.layers = [this.leaves.slice()];

    for (let level = 0; level < this.depth; level++) {
      const prevLayer = this.layers[level];
      const nextLayer: bigint[] = [];
      const levelSize = 2 ** (this.depth - level);

      for (let i = 0; i < levelSize / 2; i++) {
        const left = prevLayer[2 * i] ?? this.zeros[level];
        const right = prevLayer[2 * i + 1] ?? this.zeros[level];
        const hash = this.poseidon([left, right]);
        nextLayer.push(this.F.toObject(hash));
      }
      this.layers.push(nextLayer);
    }
  }

  getRoot(): bigint {
    return this.layers[this.depth][0];
  }

  getProof(index: number) {
    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];

    let currentIndex = index;

    for (let level = 0; level < this.depth; level++) {
      const layer = this.layers[level];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      const sibling = layer[siblingIndex] ?? this.zeros[level];

      pathElements.push(sibling);
      pathIndices.push(isRight ? 1 : 0);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
  }

  static async fromIdentities(identities: string[], depth: number = 4): Promise<PoseidonMerkleTree> {
    const tree = new PoseidonMerkleTree(depth);
    await tree.init();
    for (const id of identities) {
      tree.insert(BigInt('0x' + id));
    }
    return tree;
  }
}

/**
 * Computes service ID as a field element.
 */
export async function computeServiceId(serviceName: string): Promise<bigint> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const encoded = BigInt('0x' + Buffer.from(serviceName, 'utf8').toString('hex'));
  const hash = poseidon([encoded]);
  return F.toObject(hash);
}

/**
 * Computes pseudonym commitment: Poseidon(Poseidon(sk, r), serviceId)
 */
export async function computePseudonymCommitment(sk: bigint, r: bigint, serviceId: bigint): Promise<bigint> {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const commitment = poseidon([sk, r, serviceId]);
  return F.toObject(commitment);
}
