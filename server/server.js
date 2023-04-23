/* eslint-disable no-plusplus */
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

app.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    const product_id = req.query.product_id || 1;
    let photosResult = null;

    const questionsResult = await client.query(`SELECT * FROM questions WHERE product_id = $1
      AND reported = false LIMIT 100;`, [product_id]);
    const results = [];

    for (let i = 0; i < questionsResult.rows.length; i++) {
      const question = questionsResult.rows[i];
      const question_id = question.id;
      const answersResult = await client.query(`SELECT * FROM answers WHERE question_id = $1
        AND reported = false LIMIT 100;`, [question_id]);

      const answers = {};
      for (let j = 0; j < answersResult.rows.length; j++) {
        const answer = answersResult.rows[j];
        const answer_id = answer.id;
        photosResult = await client.query('SELECT * FROM photos WHERE answer_id = $1 LIMIT 100;', [answer_id]);

        const photos = photosResult.rows.map((photo) => photo.url);
        answers[answer_id] = {
          id: answer.id,
          body: answer.body,
          date: answer.date_written,
          answerer_name: answer.answerer_name,
          helpfulness: answer.helpful,
          photos,
        };
      }

      const questionObject = {
        question_id: question.id,
        question_body: question.body,
        question_date: question.date_written,
        asker_name: question.asker_name,
        question_helpfulness: question.helpful,
        reported: question.reported,
        answers,
      };
      results.push(questionObject);
    }

    const response = {
      product_id,
      results,
    };

    console.log(response);
    console.log(response.results[0].answers);
    res.send(response);
    client.release();
  } catch (error) {
    console.error(error);
    res.send('Error fetching data from DB');
  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
