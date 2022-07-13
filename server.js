const path = require('path')
const express = require('express')
const app = express()
const cors = require('cors');
const morgan = require('morgan')
const request = require("request")
const fileUpload = require('express-fileupload')
const { PythonShell } = require('python-shell');
const { spawn } = require('child_process');
const { resolve } = require('path');
const PORT = 3000
const fetch = require('node-fetch')

app.set('trust proxy', true)
app.use(cors());
app.use(express.json())
app.use(morgan('common'))
app.use(express.static('./public'))
app.use(fileUpload());

var binds = {}







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
app.post('/submit/answer', async (req, res) => {
	let pic;
	let uploadPath;

	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send('No files were uploaded.');
	}

	// The name of the input field (i.e. "pic") is used to retrieve the uploaded file
	pic = req.files.pic;
	filename = req.body.sessionid + '.' + pic.mimetype.split('/')[1];
	uploadPath = __dirname + '/sessions/' + filename
	console.log(uploadPath);

	// Use the mv() method to place the file somewhere on your server
	pic.mv(uploadPath, async (err) => {
		if (err)
			return res.status(500).send(err);

		//res.redirect('/results');
	});


	var answers = await getAnswers(filename)
	console.log(answers)
	if (answers.status == 'OK') {

		var results = []

		for (let i = 0; i < 3; i++) {
			const uaid = answers[i]
			const q = binds[req.body.sessionid].questions[i].question
			const uadesc = binds[req.body.sessionid].questions[i].choices[answers[i]]
			const caid = binds[req.body.sessionid].questions[i].caid
			const cadesc = binds[req.body.sessionid].questions[i].choices[binds[req.body.sessionid].questions[i].caid]

			var obj = { q: "q", "uaid": uaid, "uadesc": uadesc, "caid": caid, "cadesc": cadesc }
			results.push(obj)
		}

		binds[req.body.sessionid].results = results

		//TODO inserir na bd
		res.redirect('/results')
	}

	else if (answers.status == 'KO')
		res.status(400).send("An error ocurred, please submit a new picture!")




	async function getAnswers(filename) {
		return new Promise(resolve => {

			let options = {
				pythonPath: '/usr/bin/python',
				args: [`-i ${filename}`]
			};

			let pyshell = new PythonShell(__dirname + '/ans.py', { args: [`-i ${filename}`] });
			pyshell.on('message', function (message) {
				console.log(message)
				resolve({ status: "OK", message: message })
			})

			pyshell.end(function (err, code, signal) {
				if (err) {
					resolve({ status: "KO", message: err })
				}
			})


		})

	}


})




//SUBMIT USERNAME
app.post('/submit/username', async function (req, res) {

	const username = req.body.username
	console.log(username)

	const response = await fetch('https://the-trivia-api.com/api/questions?limit=3&region=PT&difficulty=easy');
	const data = await response.json();
	console.log(data)

	var questions = []
	for (let question of data) {
		var choices = question.incorrectAnswers
		choices.push(question.correctAnswer)
		console.log(question)
		questions.push({
			"question": question.question,
			"choices": choices
		})
	}

	function shuffle(array) {
		let currentIndex = array.length, randomIndex;

		// While there remain elements to shuffle.
		while (currentIndex != 0) {

			// Pick a remaining element.
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			// And swap it with the current element.
			[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];

		}

		return array;
	}

	for (let i = 0; i < 3; i++) {
		shuffle(questions[i].choices)
		questions[i].caid = questions[i].choices.indexOf(data[i].correctAnswer)
	}

	function gensid() {

		var generated = Math.random().toString(36).slice(2);

		while (generated in binds) {
			generated = Math.random().toString(36).slice(2);
		}

		return generated
	}

	const sessionid = gensid()
	binds[sessionid] = { "sessionid": sessionid, "username": username, "questions": questions }
	console.log(binds)
	return res.status(200).json({ valid: true, sessionid: sessionid, username: username, questions: questions })
});



app.post("/session/results", (req, res) => {
	console.log(binds[req.body.sessionid].results)
	console.log(req.body.sessionid)
	res.json(binds[req.body.sessionid].results)
})




app.post('*', (req, res) => {
	res.status(404).send('Not found!')
})





app.listen(PORT, (req, res) => {
	console.log(`Server running on port ${PORT}`);
})
