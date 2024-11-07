const express = require('express');
const multer = require('multer');
const path = require('path');
const mintBitcoinNFT = require('./mint-bitcoin-nft');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Define the /mint route for handling the minting form submission
app.post('/mint', upload.single('image'), async (req, res) => {
  console.log("Received mint request...");
  if (!req.file) {
    console.error("No file received.");
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  try {
    console.log("Starting NFT minting process...");
    const result = await mintBitcoinNFT(req.file.path);
    console.log("Minting completed:", result);
    res.json(result);
  } catch (error) {
    console.error("Error during NFT minting:", error.message);
    res.status(500).json({ success: false, error: "Minting process failed: " + error.message });
  }
});

app.get('/check-confirmation', async (req, res) => {
    try {
      const txId = req.query.txId;
      const response = await axios.get(`${BLOCKSTREAM_API}/tx/${txId}/status`);
      res.json({ confirmed: response.data.confirmed });
    } catch (error) {
      console.error("Error checking confirmation:", error.message);
      res.status(500).json({ error: "Failed to check confirmation status." });
    }
  });
  

// Start the server
app.listen(3000, () => console.log("Server running on port 3000"));


//end
