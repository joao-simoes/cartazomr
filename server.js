const path = require('path')
const express = require('express')
const app = express()
const cors = require('cors');
const morgan = require('morgan')
const request = require("request")
const fileUpload = require('express-fileupload')
const multer = require('multer');
const PORT = 80

app.use(cors());
app.use(express.json())
app.use(morgan('common'))
app.use(express.static('./public'))
app.use(fileUpload());









app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
})

app.get('/quiz', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/quiz.html'))
})

app.get('/submission', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/submission.html'))
})

app.get('/results', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/results.html'))
})

app.get('*', (req, res) => {
    res.redirect('/')
})











//UPLOAD ANSWER
app.post('/submit/answer', function(req, res) {
    let pic;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // The name of the input field (i.e. "pic") is used to retrieve the uploaded file
    pic = req.files.pic;
    console.log(pic);
    uploadPath = __dirname + '/uploads/' + req.body.sessionid + '.' + pic.mimetype.split('/')[1];

    // Use the mv() method to place the file somewhere on your server
    pic.mv(uploadPath, function(err) {
        if (err)
            return res.status(500).send(err);

        res.redirect('/results');
    });
});

//SUBMIT USERNAME
app.post('/submit/username', function(req, res) {
    const username = req.body.username


    request('https://opentdb.com/api.php?amount=3&category=9&difficulty=medium&type=multiple', function(error, response, body) {
        var data = JSON.parse(body)
        var questions = []

        for (let question of data.results) {
            var choices = question.incorrect_answers
            choices.push(question.correct_answer)

            questions.push({
                "question": question.question,
                "choices": choices
            })
        }

        return res.status(200).json({ valid: true, sessionid: "1", username: username, questions: questions })
    });

});


app.post('*', (req, res) => {
    res.status(404).send('Not found!')
})





app.listen(PORT, (req, res) => {
    console.log(`Server running on port ${PORT}`);
})