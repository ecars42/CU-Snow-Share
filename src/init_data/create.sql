CREATE TABLE students(
    username VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(200) NOT NULL,
    password VARCHAR(60) NOT NULL
);

CREATE TABLE tags(
    ski_or_board VARCHAR(30) SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL, -- foreign key from students table
    mtn_name VARCHAR(50) NOT NULL,
    skill_level SMALLINT NOT NULL, 
);