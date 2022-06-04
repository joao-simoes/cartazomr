const express = require('express')
const app = express()
const morgan = require('morgan')
const path = require('path')
const PORT = 3500

app.use(morgan('common'))

app.use(express.static('./public'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
})



app.post('/submit', (req, res) => {
    res.status(200).send("Hello World!")
})

app.get('*', (req, res) => {
    res.status(404).send("Not found!")
})



app.listen(PORT, (req, res) => {
    console.log(`Server running on port ${PORT}`);
})