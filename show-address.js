require('dotenv').config();
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const ECPairFactory = require('ecpair').default;

const ECPair = ECPairFactory(ecc);

try {
  // Load the WIF private key from the .env file
  const keyPair = ECPair.fromWIF(process.env.TESTNET_WIF, bitcoin.networks.testnet);

  // Derive the testnet address from the public key
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet });

  console.log("Bitcoin Testnet Address:", address);
} catch (error) {
  console.error("Error generating testnet address:", error.message);
  console.error("Please ensure that your TESTNET_WIF key is correctly formatted and corresponds to a testnet wallet.");
}
