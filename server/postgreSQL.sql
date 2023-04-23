DROP DATABASE IF EXISTS sdc_qa;
CREATE DATABASE sdc_qa;
\c sdc_qa;

CREATE TABLE questions (
    id INT PRIMARY KEY,
    product_id INT,
    body VARCHAR(225) NOT NULL,
    date_written TIMESTAMP DEFAULT now() NOT NULL,
    asker_name VARCHAR(30) NOT NULL,
    asker_email VARCHAR(60) NOT NULL,
    reported BOOLEAN DEFAULT false,
    helpful INT
);

CREATE TABLE answers (
    id INT PRIMARY KEY,
    question_id INT REFERENCES questions(id),
    body VARCHAR(225) NOT NULL,
    date_written TIMESTAMP DEFAULT now() NOT NULL,
    answerer_name VARCHAR(30) NOT NULL,
    answerer_email VARCHAR(60) NOT NULL,
    reported BOOLEAN DEFAULT false,
    helpful INT
);

CREATE TABLE photos (
    id INT PRIMARY KEY,
    answer_id INT REFERENCES answers(id),
    url VARCHAR(1000) NOT NULL
);

CREATE TEMP TABLE tmp_questions (
    id INT,
    product_id INT,
    body VARCHAR(225) NOT NULL,
    date_written TEXT,
    asker_name VARCHAR(30) NOT NULL,
    asker_email VARCHAR(60) NOT NULL,
    reported BOOLEAN DEFAULT false,
    helpful INT
);

CREATE TEMP TABLE tmp_answers (
    id INT,
    question_id INT,
    body VARCHAR(225) NOT NULL,
    date_written TEXT,
    answerer_name VARCHAR(30) NOT NULL,
    answerer_email VARCHAR(60) NOT NULL,
    reported BOOLEAN DEFAULT false,
    helpful INT
);

\copy tmp_questions(id, product_id, body, date_written, asker_name, asker_email, reported, helpful) FROM './questions.csv' WITH (FORMAT csv, DELIMITER ',', QUOTE '"', HEADER true, NULL 'NULL');

INSERT INTO questions (id, product_id, body, date_written, asker_name, asker_email, reported, helpful)
SELECT id, product_id, body, to_timestamp(date_written::bigint / 1000), asker_name, asker_email, reported, helpful
FROM tmp_questions;

\copy tmp_answers(id, question_id, body, date_written, answerer_name, answerer_email, reported, helpful) FROM './answers.csv' WITH (FORMAT csv, DELIMITER ',', QUOTE '"', HEADER true, NULL 'NULL');

INSERT INTO answers (id, question_id, body, date_written, answerer_name, answerer_email, reported, helpful)
SELECT id, question_id, body, to_timestamp(date_written::bigint / 1000), answerer_name, answerer_email, reported, helpful
FROM tmp_answers;

\copy photos(id, answer_id, url) FROM './answers_photos.csv' WITH (FORMAT csv, DELIMITER ',', QUOTE '"', HEADER true, NULL 'NULL');
