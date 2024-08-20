const express = require('express');
const multer = require('multer');
const { create } = require('ipfs-http-client');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const ipfs = create({ url: 'http://localhost:5001/uploads' }); 

// Endpoint to upload image and metadata
router.post('/upload', upload.fields([{ name: 'image' }, { name: 'metadata' }]), async (req, res) => {
  try {
    const { image, metadata } = req.files;
    const nftName = req.body.nftName;

    if (!nftName || !image) {
      return res.status(400).send('NFT name and image are required');
    }

    // Create a folder for the NFT
    const folderPath = path.join(__dirname, 'uploads', nftName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // Move image to the folder
    const imagePath = path.join(folderPath, image[0].originalname);
    fs.renameSync(image[0].path, imagePath);

    // Upload image to IPFS
    const imageFile = fs.readFileSync(imagePath);
    const imageResult = await ipfs.add({ path: image[0].originalname, content: imageFile });

    let metadataResult;
    if (metadata) {
      // Move metadata to the folder
      const metadataPath = path.join(folderPath, metadata[0].originalname);
      fs.renameSync(metadata[0].path, metadataPath);
      // Upload metadata to IPFS
      const metadataFile = fs.readFileSync(metadataPath);
      metadataResult = await ipfs.add({ path: metadata[0].originalname, content: metadataFile });
    }
    // Create a folder on IPFS and add the image and metadata
    const folderResult = await ipfs.add([
      { path: `${nftName}/${image[0].originalname}`, content: imageFile },
      metadata ? { path: `${nftName}/${metadata[0].originalname}`, content: metadataFile } : null,
    ].filter(Boolean), { wrapWithDirectory: true });
    
    const folderCID = folderResult.cid.toString();

    res.json({
      message: 'Upload successful',
      imageUrl: `ipfs://${folderCID}/${image[0].originalname}`,
      metadataUrl: metadata ? `ipfs://${folderCID}/${metadata[0].originalname}` : null,
    });   
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;