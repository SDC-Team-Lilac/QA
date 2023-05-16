DROP DATABASE IF EXISTS sdc_qa;
CREATE DATABASE sdc_qa;
\c sdc_qa;

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    product_id INT,
    body VARCHAR(225) NOT NULL,
    date_written TIMESTAMP DEFAULT now(),
    asker_name VARCHAR(30) NOT NULL,
    asker_email VARCHAR(60) NOT NULL,
    reported BOOLEAN DEFAULT false,
    helpful INT NOT NULL DEFAULT 0
);

CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES questions(id),
    body VARCHAR(225) NOT NULL,
    date_written TIMESTAMP DEFAULT now(),
    answerer_name VARCHAR(30) NOT NULL,
    answerer_email VARCHAR(60) NOT NULL,
    reported BOOLEAN DEFAULT false,
    helpful INT NOT NULL DEFAULT 0
);

CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    answer_id INT REFERENCES answers(id),
    url VARCHAR(1000) NOT NULL
);

CREATE TEMP TABLE tmp_questions (
    id SERIAL PRIMARY KEY,
    product_id INT,
    body VARCHAR(225) NOT NULL,
    date_written TEXT,
    asker_name VARCHAR(30) NOT NULL,
    asker_email VARCHAR(60) NOT NULL,
    reported BOOLEAN DEFAULT false,
    helpful INT
);

CREATE TEMP TABLE tmp_answers (
    id SERIAL PRIMARY KEY,
    question_id INT,
    body VARCHAR(225) NOT NULL,
    date_written TEXT,
    answerer_name VARCHAR(30) NOT NULL,
    answerer_email VARCHAR(60) NOT NULL,
    reported BOOLEAN DEFAULT false,
    helpful INT
);

\copy tmp_questions(id, product_id, body, date_written, asker_name, asker_email, reported, helpful) FROM '/Users/georgehalterman/HackReactor/SDC/rpp2210-sdc-lilac-QA/server/questions.csv' WITH (FORMAT csv, DELIMITER ',', QUOTE '"', HEADER true, NULL 'NULL');

INSERT INTO questions (id, product_id, body, date_written, asker_name, asker_email, reported, helpful)
SELECT id, product_id, body, to_timestamp(date_written::bigint / 1000), asker_name, asker_email, reported, helpful
FROM tmp_questions;

\copy tmp_answers(id, question_id, body, date_written, answerer_name, answerer_email, reported, helpful) FROM '/Users/georgehalterman/HackReactor/SDC/rpp2210-sdc-lilac-QA/server/answers.csv' WITH (FORMAT csv, DELIMITER ',', QUOTE '"', HEADER true, NULL 'NULL');

INSERT INTO answers (id, question_id, body, date_written, answerer_name, answerer_email, reported, helpful)
SELECT id, question_id, body, to_timestamp(date_written::bigint / 1000), answerer_name, answerer_email, reported, helpful
FROM tmp_answers;

\copy photos(id, answer_id, url) FROM '/Users/georgehalterman/HackReactor/SDC/rpp2210-sdc-lilac-QA/server/answers_photos.csv' WITH (FORMAT csv, DELIMITER ',', QUOTE '"', HEADER true, NULL 'NULL');

CREATE INDEX questions_product_id_reported_idx
ON questions (product_id);

CREATE INDEX answers_question_id_reported_idx
ON answers (question_id);

CREATE INDEX photos_answers_idx
ON photos (answer_id);


SELECT setval ('questions_id_seq', (SELECT max(id) FROM questions));
SELECT setval ('answers_id_seq', (SELECT max(id) FROM answers));
SELECT setval ('photos_id_seq', (SELECT max(id) FROM photos));