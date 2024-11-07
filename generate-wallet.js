const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const ECPairFactory = require('ecpair').default;

const ECPair = ECPairFactory(ecc);

function generateTestnetWallet() {
  // Generate a random key pair for the testnet
  const keyPair = ECPair.makeRandom({ network: bitcoin.networks.testnet });

  // Force a P2PKH address format
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet });

  // Export the private key in WIF format for storage
  const wif = keyPair.toWIF();

  console.log("Bitcoin Testnet Address:", address);
  console.log("Private Key (WIF):", wif);
}

// Run the function to display the testnet address and private key
generateTestnetWallet();
