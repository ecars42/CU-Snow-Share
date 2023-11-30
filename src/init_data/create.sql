CREATE TABLE students(
    username VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(200) NOT NULL,
    password VARCHAR(60) NOT NULL
);

CREATE TABLE tags(
    username VARCHAR(50) PRIMARY KEY, -- foreign key from students table, need a foreign key
    ski_or_board VARCHAR(30) NOT NULL, 
    mtn_name VARCHAR(50) NOT NULL, 
    skill_level SMALLINT NOT NULL,

    CONSTRAINT fk_username 
    FOREIGN KEY (username) REFERENCES students(username)
    ON DELETE CASCADE
);