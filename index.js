import express from 'express';
import axios from 'axios';
import canvasRoutes from './routes/canvasRoutes.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static documentation/playground assets
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/canvas', canvasRoutes);

app.listen(PORT, function () {
    console.log("Listening on PORT: ", PORT);
    if (PORT == 3000) { 
      console.log('Running on local: http://localhost:3000');
    }
});