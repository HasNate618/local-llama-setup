const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname)));
app.get('/health', (req,res)=> res.send('ok'));
app.listen(PORT, ()=> console.log(`Galaga clone running at http://localhost:${PORT}`));
