/* eslint-disable radix */
/* eslint-disable camelcase */
/* eslint-disable no-plusplus */
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  user: georgehalterman,
  host: localhost,
  database: sdc_qa,
  password: 2352,
  port: 5432,
});
// const pool = new Pool({
//   user: process.env.PGUSER,
//   host: process.env.PGHOST,
//   database: process.env.PGDATABASE,
//   password: process.env.PGPASSWORD,
//   port: process.env.PGPORT,
// });

pool.connect();

app.get('/qa/questions', async (req, res) => {
  try {
    const product_id = req.query.product_id || 1;
    const page = req.query.page || 1;
    const count = req.query.count || 5;
    const offset = (page - 1) * count;

    await pool.query(`SET enable_seqscan = OFF;
      SET enable_bitmapscan = ON;`);

    const questionsResult = await pool.query(
      `SELECT product_id, id, body, date_written, asker_name, asker_email, reported, helpful
        FROM questions
        WHERE product_id = $1 AND reported = false
        LIMIT $2 OFFSET $3;`,
      [product_id, count, offset],
    );

    const results = [];

    const getAnswersPromises = questionsResult.rows.map(async (question) => {
      const question_id = question.id;
      const answersResult = await pool.query(
        `SELECT id, body, date_written, answerer_name, reported, helpful
        FROM answers
        WHERE question_id = $1 AND reported = false;`,
        [question_id],
      );

      const answers = {};
      const photoPromises = answersResult.rows.map(async (answer) => {
        const answer_id = answer.id;
        const photosResult = await pool.query(
          `SELECT url FROM photos
          WHERE answer_id = $1;`,
          [answer_id],
        );

        const photos = photosResult.rows.map((photo) => photo.url);
        answers[answer_id] = {
          id: answer.id,
          body: answer.body,
          date: answer.date_written,
          answerer_name: answer.answerer_name,
          helpfulness: answer.helpful,
          photos,
        };
      });

      await Promise.all(photoPromises);
      return answers;
    });

    const answers = await Promise.all(getAnswersPromises);

    for (let i = 0; i < questionsResult.rows.length; i++) {
      const question = questionsResult.rows[i];
      const questionObject = {
        question_id: question.id,
        question_body: question.body,
        question_date: question.date_written,
        asker_name: question.asker_name,
        question_helpfulness: question.helpful,
        reported: question.reported,
        answers: answers[i],
      };
      results.push(questionObject);
    }

    const response = { product_id, results };
    res.status(200).send(response);
  } catch (error) {
    console.error('Error fetching data from DB:', error);
    res.status(500).send('Error fetching data from DB');
  }
});

app.get('/qa/questions/:question_id/answers', (req, res) => {
  const { question_id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const count = parseInt(req.query.count) || 5;

  pool
    .query(`SELECT * FROM answers
    WHERE question_id = $1 AND reported = false
    ORDER BY id
    LIMIT $2
    OFFSET $3;`, [question_id, count, (page - 1) * count])
    .then((answersResult) => {
      const results = {};
      results.question = question_id;
      results.page = page;
      results.count = count;

      const getPhotosPromises = answersResult.rows.map((answer) => {
        const answer_id = answer.id;
        return pool.query('SELECT * FROM photos WHERE answer_id = $1;', [answer_id])
          .then((photosResult) => {
            const photos = photosResult.rows.map((photo) => photo.url);
            return {
              id: answer.id,
              body: answer.body,
              date: answer.date_written,
              answerer_name: answer.answerer_name,
              helpfulness: answer.helpful,
              photos,
            };
          })
          .catch(() => {
            res.status(500).send('Error fetching data from DB');
          });
      });

      return Promise.all(getPhotosPromises).then((answers) => {
        results.results = answers;
        return results;
      });
    })
    .then((results) => {
      res.status(200).send(results);
    })
    .catch(() => {
      res.status(500).send('Error fetching data from DB');
    });
});

app.post('/qa/questions', (req, res) => {
  const {
    body, name, email, product_id,
  } = req.body;
  pool
    .query(`INSERT INTO questions (id, product_id, body, date_written, asker_name, asker_email)
    VALUES ((SELECT max(id) + 1 FROM questions), ${product_id}, '${body}', CURRENT_TIMESTAMP, '${name}', '${email}')`)
    .then(() => {
      res.status(201).send('Created');
    })
    .catch(() => {
      res.status(500).send('Error adding question');
    });
});

app.post('/qa/questions/:question_id/answers', (req, res) => {
  const { question_id } = req.params;
  const {
    body, name, email, photos,
  } = req.body;

  pool
    .query(`INSERT INTO answers (id, question_id, body, answerer_name, answerer_email)
    VALUES ((SELECT max(id) + 1 FROM answers), $1, $2, $3, $4)
    RETURNING id;`, [question_id, body, name, email])
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
    .catch(() => {
      res.status(500).send('Error adding answer to question');
    });
});

app.put('/qa/questions/:question_id/helpful', (req, res) => {
  const { question_id } = req.params;

  pool
    .query('UPDATE questions SET helpful = helpful + 1 WHERE id = $1;', [question_id])
    .then(() => {
      res.sendStatus(204);
    })
    .catch(() => {
      res.status(500).send('Error updating data in DB');
    });
});

app.put('/qa/questions/:question_id/report', (req, res) => {
  const { question_id } = req.params;

  pool
    .query('UPDATE questions SET reported = true WHERE id = $1;', [question_id])
    .then(() => {
      res.sendStatus(204);
    })
    .catch(() => {
      res.sendStatus(500);
    });
});

app.put('/qa/answers/:answer_id/helpful', (req, res) => {
  const { answer_id } = req.params;
  pool
    .query('UPDATE answers SET helpful = helpful + 1 WHERE id = $1', [answer_id])
    .then(() => {
      res.sendStatus(204);
    })
    .catch(() => {
      res.sendStatus(500);
    });
});

app.put('/qa/answers/:answer_id/report', (req, res) => {
  const { answer_id } = req.params;
  pool
    .query('UPDATE answers SET reported = true WHERE id = $1', [answer_id])
    .then(() => {
      res.sendStatus(204);
    })
    .catch(() => {
      res.sendStatus(500);
    });
});

app.listen(3001, () => {
  console.log('Server is listening on port 3001');
});

module.exports = app;
