const express = require('express');
// const exphbs = require('express-handlebars');
// const db = require('./postgreSQL');

const app = express();

// Set up Handlebars as the view engine
// app.engine('handlebars', exphbs());
// app.set('view engine', 'handlebars');

// Define a route to render a list of records from the database
app.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM SDC_QA');
  const { rows } = result;
  res.render('list', { rows });
});

// Start the server
app.listen(3000, () => console.log('Server listening on port 3000'));
