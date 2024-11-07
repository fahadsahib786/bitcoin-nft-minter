require('dotenv').config();
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const ECPairFactory = require('ecpair').default;
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const ECPair = ECPairFactory(ecc);
const BLOCKSTREAM_API = 'https://blockstream.info/testnet/api';

async function uploadImageToIPFS(imagePath) {
  const data = new FormData();
  data.append('file', fs.createReadStream(imagePath));

  try {
    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
      headers: {
        ...data.getHeaders(),
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_API_SECRET
      }
    });
    return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
  } catch (error) {
    throw new Error("Failed to upload to IPFS: " + error.message);
  }
}

async function getRawTransaction(txid) {
  try {
    const response = await axios.get(`${BLOCKSTREAM_API}/tx/${txid}/hex`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch raw transaction for txid ${txid}: ${error.message}`);
  }
}

async function waitForConfirmation(txId) {
  for (let i = 0; i < 10; i++) {
    try {
      const response = await axios.get(`${BLOCKSTREAM_API}/tx/${txId}/status`);
      if (response.data.confirmed) {
        console.log("Transaction confirmed!");
        return true;
      }
      console.log(`Transaction not yet confirmed. Retrying in 10 seconds... (${i + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // wait for 10 seconds
    } catch (error) {
      console.error("Error checking transaction confirmation:", error.message);
    }
  }
  console.warn("Transaction confirmation timeout. It may confirm later.");
  return false;
}

async function mintBitcoinNFT(imagePath) {
  try {
    const metadataUri = await uploadImageToIPFS(imagePath);
    console.log("Metadata URI:", metadataUri);

    const keyPair = ECPair.fromWIF(process.env.TESTNET_WIF, bitcoin.networks.testnet);
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: bitcoin.networks.testnet });

    const utxosResponse = await axios.get(`${BLOCKSTREAM_API}/address/${address}/utxo`);
    const utxos = utxosResponse.data;
    if (utxos.length === 0) throw new Error("No UTXOs found. Fund the wallet with testnet BTC.");

    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
    let totalInputValue = BigInt(0);

    for (const utxo of utxos) {
      const rawTx = await getRawTransaction(utxo.txid);
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(rawTx, 'hex'),
      });
      totalInputValue += BigInt(utxo.value);
      console.log(`Added input: txid=${utxo.txid}, vout=${utxo.vout}, value=${BigInt(utxo.value)}`);
    }

    const fee = BigInt(1000);
    const changeValue = totalInputValue - fee;
    if (changeValue <= 0) throw new Error("Insufficient funds after fee.");

    const embed = bitcoin.payments.embed({ data: [Buffer.from(metadataUri)] });
    psbt.addOutput({
      script: embed.output,
      value: BigInt(0), // BigInt for zero-value OP_RETURN output
    });
    console.log("Added OP_RETURN output with metadata URI");

    psbt.addOutput({
      address: address,
      value: changeValue,
    });
    console.log(`Added change output to address ${address} with value ${changeValue}`);

    utxos.forEach((_, index) => {
      psbt.signInput(index, keyPair);
    });

    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    const broadcastResponse = await axios.post(`${BLOCKSTREAM_API}/tx`, txHex);
    const txId = broadcastResponse.data;
    console.log("Transaction ID:", txId);

    // Wait for transaction confirmation
    const isConfirmed = await waitForConfirmation(txId);

    return {
      success: true,
      txId: txId,
      txUrl: `https://blockstream.info/testnet/tx/${txId}`,
      metadataUrl: metadataUri,
      confirmed: isConfirmed
    };
  } catch (error) {
    console.error("Error during NFT minting:", error.message);
    throw new Error("Minting process failed: " + error.message);
  }
}

module.exports = mintBitcoinNFT;
