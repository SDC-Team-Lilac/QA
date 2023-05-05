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

app.get('/qa/questions', async (req, res) => {
  try {
    const client = await pool.connect();
    const product_id = req.query.product_id || 1;
    const page = req.query.page || 1;
    const count = req.query.count || 5;
    const offset = (page - 1) * count;
    let photosResult = null;

    // console.log(await client.query(`EXPLAIN ANALYZE SELECT id, *
    // FROM questions
    // WHERE product_id = $1 AND reported = false
    // ORDER BY id
    // LIMIT 100;`, [product_id]));

    const questionsResult = await client.query(`SELECT id, *
    FROM questions
    WHERE product_id = $1 AND reported = false
    ORDER BY id
    LIMIT $2 OFFSET $3;`, [product_id, count, offset]);
    const results = [];

    for (let i = 0; i < questionsResult.rows.length; i++) {
      const question = questionsResult.rows[i];
      const question_id = question.id;
      const answersResult = await client.query(`SELECT * FROM answers
        WHERE question_id = $1 AND reported = false LIMIT 100;`, [question_id]);

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

    // console.log(response);
    // console.log(response.results[0].answers);
    res.send(response);
  } catch (error) {
    console.error(error);
    res.send('Error fetching data from DB');
  }
});

app.get('/qa/questions/:question_id/answers', async (req, res) => {
  try {
    const client = await pool.connect();
    const { question_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const count = parseInt(req.query.count) || 5;

    const answersResult = await client.query(`SELECT * FROM answers
      WHERE question_id = $1 AND reported = false
      ORDER BY id
      LIMIT $2
      OFFSET $3;`, [question_id, count, (page - 1) * count]);

    const results = {};
    results.question = question_id;
    results.page = page;
    results.count = count;

    const answers = {};
    for (let i = 0; i < answersResult.rows.length; i++) {
      const answer = answersResult.rows[i];
      const answer_id = answer.id;
      const photosResult = await client.query('SELECT * FROM photos WHERE answer_id = $1 LIMIT 100;', [answer_id]);

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

    results.results = answers;

    res.send(results);
  } catch (error) {
    console.error(error);
    res.send('Error fetching data from DB');
  }
});

app.post('/qa/questions', async (req, res) => {
  try {
    const client = await pool.connect();
    const {
      body, name, email, product_id,
    } = req.body;
    const date = new Date();

    const result = await client.query('INSERT INTO questions (product_id, body, date_written, asker_name, asker_email) VALUES ($1, $2, $3, $4, $5) RETURNING id', [product_id, body, date, name, email]);

    const response = {
      id: result.rows[0].id,
      body,
      date_written: date,
      asker_name: name,
      asker_email: email,
      product_id,
    };

    res.status(201).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding question to DB');
  }
});

app.post('/qa/questions/:question_id/answers', async (req, res) => {
  try {
    const client = await pool.connect();
    const { question_id } = req.params;
    const {
      body, name, email, photos,
    } = req.body;

    const answerResult = await client.query(`
      INSERT INTO answers (question_id, body, answerer_name, answerer_email)
      VALUES ($1, $2, $3, $4)
      RETURNING id, question_id, body, date_written, answerer_name, helpful;
    `, [question_id, body, name, email]);

    const answer_id = answerResult.rows[0].id;

    if (photos && photos.length > 0) {
      const insertValues = photos.map((url) => `(${answer_id}, '${url}')`).join(', ');
      await client.query(`INSERT INTO photos (answer_id, url) VALUES ${insertValues};`);
    }

    const answer = {
      id: answer_id,
      body,
      date: answerResult.rows[0].date_written,
      answerer_name: name,
      helpfulness: answerResult.rows[0].helpful,
      photos,
    };

    res.status(201).send(answer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding answer to question');
  }
});

app.put('/qa/questions/:question_id/helpful', async (req, res) => {
  try {
    const client = await pool.connect();
    const { question_id } = req.params;

    await client.query('UPDATE questions SET helpful = helpful + 1 WHERE id = $1;', [question_id]);

    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.send('Error updating data in DB');
  }
});

app.put('/qa/questions/:question_id/report', async (req, res) => {
  try {
    const client = await pool.connect();
    const { question_id } = req.params;

    await client.query('UPDATE questions SET reported = true WHERE id = $1;', [question_id]);

    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.send('Error updating data in DB');
  }
});

app.put('/qa/answers/:answer_id/helpful', async (req, res) => {
  try {
    const client = await pool.connect();
    const { answer_id } = req.params;
    await client.query('UPDATE answers SET helpful = helpful + 1 WHERE id = $1', [answer_id]);
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.put('/qa/answers/:answer_id/report', async (req, res) => {
  try {
    const client = await pool.connect();
    const { answer_id } = req.params;
    await client.query('UPDATE answers SET reported = true WHERE id = $1', [answer_id]);
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});
