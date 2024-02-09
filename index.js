const express = require('express');
const bodyParser = require('body-parser');
const say = require('say');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// GET endpoint to retrieve list of available voices
app.get('/api/voices', async (req, res) => {
    try {
        // Get list of installed voices
        say.getInstalledVoices((err, voices) => {
            if (err) {
                console.error('Error fetching installed voices:', err);
                return res.status(500).json({ error: 'An error occurred while fetching installed voices' });
            }

            res.json({ status: true, voiceName: voices });
        });
    } catch (error) {
        console.error('Error fetching installed voices:', error);
        res.status(500).json({ error: 'An error occurred while fetching installed voices', error });
    }
});

// POST endpoint to convert text to speech
app.post('/api/convert', async (req, res) => {
    const { text, voiceName, speed } = req.body;

    let defaultVoiceName = 'Alex'; // Default voice if not specified
    let defaultSpeed = 1.5; // Default speed if not specified

    // Check if voiceName and speed are provided in the request body, otherwise use defaults
    const selectedVoiceName = voiceName || defaultVoiceName;
    const selectedSpeed = speed || defaultSpeed;

    try {
        // Convert text to speech and save it as an MP3 file
        const exportPath = path.join(__dirname, 'export');
        if (!fs.existsSync(exportPath)) {
            fs.mkdirSync(exportPath);
        }
        const fileName = `text2speech_${Date.now()}.mp3`;
        const filePath = path.join(exportPath, fileName);

        say.export(text, selectedVoiceName, selectedSpeed, filePath, (err) => {
            if (err) {
                console.error('Error exporting text to speech:', err);
                return res.status(500).json({ error: 'An error occurred while exporting text to speech' });
            }

            const fileUrl = `https://${process.env.GCLOUD_PROJECT}.web.app/api/download/${fileName}`;
            res.status(200).json({ message: 'Text converted to speech and saved as MP3', fileUrl });
        });
    } catch (error) {
        console.error('Error converting text to speech:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});

// GET endpoint to download files
app.get('/api/download/:fileName', async (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(__dirname, 'export', fileName);
    const exportPath = path.join(__dirname, 'export');

    try {
        if (fs.existsSync(filePath)) {
            // Get a list of all files in the export directory
            const files = fs.readdirSync(exportPath);
            
            // Delete all other files in the export directory except the current file being downloaded
            files.forEach(file => {
                if (file !== fileName) {
                    const otherFilePath = path.join(exportPath, file);
                    fs.unlinkSync(otherFilePath);
                }
            });

            res.download(filePath);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'An error occurred while downloading the file' });
    }
});

// DELETE endpoint to delete all files in the export directory
app.delete('/api/delete', async (req, res) => {
    const exportPath = path.join(__dirname, 'export');

    try {
        // Check if the export directory exists
        if (!fs.existsSync(exportPath)) {
            return res.status(404).json({ error: 'Export directory not found' });
        }

        // Get a list of all files in the export directory
        const files = fs.readdirSync(exportPath);

        // Delete each file in the export directory
        files.forEach(file => {
            const filePath = path.join(exportPath, file);
            fs.unlinkSync(filePath);
        });

        res.json({ message: 'All files in export directory deleted successfully' });
    } catch (error) {
        console.error('Error deleting files:', error);
        res.status(500).json({ error: 'An error occurred while deleting files' });
    }
});

// Handle undefined routes
app.get('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});