CREATE TABLE students(
    name VARCHAR(50) NOT NULL,
    email VARCHAR(200) NOT NULL
);

CREATE TABLE tags(
    level SMALLINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    location VARCHAR(50) NOT NULL,
    ski_or_board VARCHAR(30) NOT NULL
    
);

CREATE TABLE users(
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL
);