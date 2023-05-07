/* eslint-disable no-plusplus */
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

pool.connect();

app.get('/qa/questions', async (req, res) => {
  try {
    const product_id = req.query.product_id || 5;
    const page = req.query.page || 1;
    const count = req.query.count || 5;
    const offset = (page - 1) * count;
    let photosResult = null;

    await client.query('SET enable_seqscan = OFF');
    await client.query('SET enable_bitmapscan = ON');

    console.log(await client.query(`EXPLAIN ANALYZE SELECT product_id, id, body, date_written, asker_name,
    asker_email, reported, helpful
    FROM questions
    WHERE product_id = $1 AND reported = false
    LIMIT $2 OFFSET $3;`, [product_id, count, offset]));

    const questionsResult = await client.query(`SELECT product_id, id, body, date_written, asker_name, asker_email, reported, helpful
    FROM questions
    WHERE product_id = $1 AND reported = false
    LIMIT $2 OFFSET $3;`, [product_id, count, offset]);
    const results = [];

    console.log(await client.query(`EXPLAIN ANALYZE SELECT id, body, date_written, answerer_name, reported, helpful
    FROM answers
    WHERE question_id = 56 AND reported = false;`));

    for (let i = 0; i < questionsResult.rows.length; i++) {
      const question = questionsResult.rows[i];
      const question_id = question.id;

      const answersResult = await client.query(`SELECT id, body, date_written, answerer_name, reported, helpful
      FROM answers
      WHERE question_id = $1 AND reported = false;`, [question_id]);

      const answers = {};
      for (let j = 0; j < answersResult.rows.length; j++) {
        const answer = answersResult.rows[j];
        const answer_id = answer.id;
        photosResult = await client.query(`SELECT * FROM photos
        WHERE answer_id = $1;`, [answer_id]);

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
    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data from DB');
  }
});

app.get('/qa/questions/:question_id/answers', async (req, res) => {
  try {
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

    res.status(200).send(results);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data from DB');
  }
});

app.post('/qa/questions', async (req, res) => {
  const {
    body, name, email, product_id,
  } = req.body;
  pool.query(`INSERT INTO questions (id, product_id, body, date_written, asker_name, asker_email)
  VALUES ((SELECT max(id) + 1 FROM questions), ${product_id}, '${body}', CURRENT_TIMESTAMP, '${name}', '${email}')`)
    .then((data) => {
      console.log(data);
      res.status(201).send('Created');
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post('/qa/questions/:question_id/answers', (req, res) => {
  const { question_id } = req.params;
  const {
    body, name, email, photos,
  } = req.body;

  pool.query(
    `INSERT INTO answers (id, question_id, body, answerer_name, answerer_email)
    VALUES ((SELECT max(id) + 1 FROM answers), '${question_id}', '${body}', '${name}', '${email}')
    RETURNING id;`,
  )
    .then((result) => {
      const answerId = result.rows[0].id;

      if (photos && photos.length > 0) {
        const photoValues = photos.map((url, i) => `((SELECT max(id) + ${i + 1} FROM photos), ${answerId}, '${url}')`).join(', ');

        return pool.query(`INSERT INTO photos (id, answer_id, url) VALUES ${photoValues}`);
      }
    })
    .then(() => {
      res.status(201).send('Answer added successfully');
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error adding answer to question');
    });
});

app.put('/qa/questions/:question_id/helpful', async (req, res) => {
  try {
    const { question_id } = req.params;

    await client.query('UPDATE questions SET helpful = helpful + 1 WHERE id = $1;', [question_id]);

    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating data in DB');
  }
});

app.put('/qa/questions/:question_id/report', async (req, res) => {
  try {
    const { question_id } = req.params;

    await client.query('UPDATE questions SET reported = true WHERE id = $1;', [question_id]);

    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.put('/qa/answers/:answer_id/helpful', async (req, res) => {
  try {
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

module.exports = app;
