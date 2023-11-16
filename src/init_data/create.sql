CREATE TABLE students(
    username VARCHAR(50) PRIMARY KEY,
    password VARCHAR(60) NOT NULL
    name VARCHAR(50) NOT NULL,
    email VARCHAR(200) NOT NULL
);

CREATE TABLE tags(
    resort_id SERIAL PRIMARY KEY,
    skill_level SMALLINT NOT NULL,
    mountain VARCHAR(50) NOT NULL,
    mode_trans VARCHAR(30) NOT NULL,
    ski_or_board VARCHAR(30) NOT NULL
);