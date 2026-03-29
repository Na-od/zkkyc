import { StrKey } from '@stellar/stellar-sdk';

const contractId = "CA3V5XP2JJEMFXOOEADKFCVRGZBMCQQFHC2OIGOULMHMIXACGXWVREEY";
const decoded = StrKey.decodeContract(contractId);
console.log("Contract ID:", contractId);
console.log("Decoded Hex:", Buffer.from(decoded).toString('hex'));

const eventBytes = Buffer.from([55, 94, 221, 250, 74, 72, 194, 221, 206, 32, 6, 162, 138, 177, 54, 66, 193, 66, 5, 56, 180, 228, 25, 212, 91, 14, 196, 92, 2, 53, 237, 88]);
console.log("Event Contract Hex:", eventBytes.toString('hex'));

if (Buffer.from(decoded).equals(eventBytes)) {
    console.log("MATCH! The contract ID is correct.");
} else {
    console.log("NO MATCH! The contract ID might be different.");
}
