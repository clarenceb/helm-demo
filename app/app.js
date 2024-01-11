const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

let fetch;

app.get('/', async (req, res) => {
    res.render('index', { 
        namespace: process.env.MY_POD_NAMESPACE,
        jokeCategory: process.env.JOKE_CATEGORY,
        bgColor: process.env.BG_COLOR
    });
});

app.get('/joke', async (req, res) => {
    if (!fetch) {
        fetch = (await import('node-fetch')).default;
    }
    const response = await fetch(`https://api.chucknorris.io/jokes/random?category=${process.env.JOKE_CATEGORY || 'dev'}`);
    const joke = await response.json();
    res.send(joke.value);
});

app.listen(3000, () => console.log('Server running on port 3000'));
