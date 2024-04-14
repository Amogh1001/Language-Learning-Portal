const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Client } = require('pg');
const port = 3000;

const client = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "",
    database: "Language_Portal"
});

client.connect();

const app = express();
app.use(express.json());           
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/login.html");
});
app.get("/login", function (req, res) {
    res.sendFile(__dirname + "/login.html");
});
app.get("/signup", function (req, res) {
    res.sendFile(__dirname + "/signup.html");
});
app.get("/home", function (req, res) {
    const user = req.session.user;
    const pass = req.session.password;

    let student_id = 0;
    let courses = [];
    let points = [];

    client.query(`SELECT * FROM course`, (err, result) => {
        if (!err && result.rows.length !== 0) {
            // console.log(result.rows);
            result.rows.forEach(row => {
                courses.push(row.lang);
            });
            req.session.courses = courses;
        }
        client.query(`SELECT * FROM student WHERE username=$1 AND pwd=$2`, [user, pass], (err, result) => {
            if (!err && result.rows.length !== 0) {
                // console.log(result.rows);
                student_id = result.rows[0].student_id;
            }
            client.query(`SELECT * FROM progress WHERE progress_id=$1`, [student_id], (err, result) => {
                if (!err && result.rows.length !== 0) {
                    // console.log(result.rows);
                    courses.forEach(course => {
                        course = course + '_points';
                        points.push(result.rows[0][course]);
                    });
                    req.session.points = points;
                    res.sendFile(__dirname + "/home.html");
                }
            });
        });
    });
});
app.get("/questions", function (req, res) {
    let lesson_index = req.query.lesson;

    const user = req.session.user;
    const pass = req.session.password;
    const lang = req.session.lang;
    const module = req.session.module;

    let lessonColumn = lang + "_lesson";


    let student_id = 0;
    let module_id = 0;
    let lesson_id = 0;
    let questions = [];
    let answers = [];
    let infos = [];

    // console.log(req.session);


    client.query(`SELECT * FROM modules WHERE module_name=$1`, [module], (err, result) => {
        if (!err && result.rows.length !== 0) {
            // console.log(result.rows);
            module_id = result.rows[0].module_id;
        }
        client.query(`SELECT * FROM student WHERE username=$1 AND pwd=$2`, [user, pass], (err, result) => {
            if (!err && result.rows.length !== 0) {
                // console.log(result.rows);
                student_id = result.rows[0].student_id;
            } 

            let queryStr = `UPDATE progress SET ${lessonColumn} = '${lesson_index}' WHERE progress_id = ${student_id}`;
            client.query(queryStr, (err, result) => {
                if (!err) {
                    // console.log("succesful updation in progress table");
                }
                client.query(`SELECT * FROM lesson WHERE parent_module=$1 and lesson_index=$2`, [module_id,lesson_index], (err, result) => {
                    if (!err && result.rows.length !== 0) {
                        // console.log(result.rows);
                        lesson_id = result.rows[0].lesson_id;
                    }
                    client.query(`SELECT * FROM question WHERE parent_lesson=$1`, [lesson_id], (err, result) => {
                        if (!err && result.rows.length !== 0) {
                            // console.log(result.rows);
                            result.rows.forEach(row => {
                                questions.push(row.question_text);
                                let answer = [];
                                answer.push(row.wrong_answer_1);
                                answer.push(row.wrong_answer_2);
                                answer.push(row.wrong_answer_3);
                                answer.push(row.answer);
                                answers.push(answer);
                                infos.push(row.info);
                            });
                            req.session.questions = questions;
                            req.session.answers = answers;
                            req.session.infos = infos;
                            res.sendFile(__dirname + "/questions.html");
                        }
                    });
                });
            });
        });
    });
});
app.get("/lessons", function (req, res) {
    let module = req.query.module;
    req.session.module = module;

    const user = req.session.user;
    const pass = req.session.password;
    const lang = req.session.lang;

    let moduleColumn = lang + "_module";

    const column = lang + "_points"; 
    let score = 0;

    let student_id = 0;
    let module_id = 0;
    let lessons = [];

    // console.log(module);
    // console.log(req.session);
    // console.log(moduleColumn);

    
    client.query(`SELECT * FROM modules WHERE module_name=$1`, [module], (err, result) => {
        if (!err && result.rows.length !== 0) {
            // console.log(result.rows);
            module_id = result.rows[0].module_id;
        }
        client.query(`SELECT * FROM student WHERE username=$1 AND pwd=$2`, [user, pass], (err, result) => {
            if (!err && result.rows.length !== 0) {
                // console.log(result.rows);
                student_id = result.rows[0].student_id;
            } 
            // console.log(module);
            // console.log(moduleColumn);
            // console.log(student_id);

            client.query(`SELECT * FROM progress WHERE progress_id=$1`, [student_id], (err, result) => {
                if (!err && result.rows.length !== 0) {
                    // console.log(result.rows);
                    score = result.rows[0][column];
                    if(score===undefined || score===null){
                        score = 0
                    }
                } 
                
                let queryStr = `UPDATE progress SET ${moduleColumn} = '${module}' WHERE progress_id = ${student_id}`;
                client.query(queryStr, (err, result) => {
                    if (!err) {
                        // console.log("succesful updation in progress table");
                        client.query(`SELECT * FROM lesson WHERE parent_module=$1`, [module_id], (err, result) => {
                            if (!err && result.rows.length !== 0) {
                                // console.log(result.rows);
                                result.rows.forEach(row => {
                                    lessons.push(row.lesson_index);
                                });
                                req.session.lessons = lessons;
                                req.session.score = score;
                                
                                res.sendFile(__dirname + "/lessons.html");
                            }
                        });
                    } else {
                        console.log(err);
                    }
                });
            });
        });
    });
});
app.get("/modules", function (req, res) {
    let lang = req.query.lang;
    lang = lang.toLowerCase();
    req.session.lang = lang;

    // console.log(req.session);

    const user = req.session.user;
    const pass = req.session.password;

    const column = lang + "_points"; 
    let score = 0;

    let course_id = 0;
    let student_id = 0;
    let levels = [];

    // console.log("language = " + lang);

    client.query(`SELECT * FROM course WHERE lang=$1`, [lang], (err, result) => {
        if (!err && result.rows.length !== 0) {
            // console.log(result.rows);
            course_id = result.rows[0].course_id;
        }
        client.query(`SELECT * FROM student WHERE username=$1 AND pwd=$2`, [user, pass], (err, result) => {
            if (!err && result.rows.length !== 0) {
                // console.log(result.rows);
                student_id = result.rows[0].student_id;
            } 
            course_id = String(course_id);

            client.query(`SELECT * FROM progress WHERE progress_id=$1`, [student_id], (err, result) => {
                if (!err && result.rows.length !== 0) {
                    // console.log(result.rows);
                    score = result.rows[0][column];
                    if(score===undefined || score===null){
                        score = 0
                    }
                } 
            });

            client.query(`SELECT ${lang} FROM progress WHERE progress_id=$1`, [student_id], (err, result) => {
                if (!err && result.rows.length !== 0) {
                    // console.log(result.rows);
                    if (result.rows[0][lang] !== true) {
                        client.query(`UPDATE course SET num_students = num_students+1 WHERE course_id = ${course_id}`, (err, result) => {
                            if (!err) {
                                // console.log("succesful updation in number of students table");
                            }
                        });
                    }
                }
                else{
                    console.log(err);
                }
            });
            
            
            let queryStr = `UPDATE progress SET ${lang} = TRUE WHERE progress_id = ${student_id}`;
            client.query(queryStr, (err, result) => {
                if (!err) {
                    // console.log("succesful updated to true in progress table");
                    course_id = Number(course_id);
                    client.query(`SELECT * FROM modules WHERE parent_course=$1`, [course_id], (err, result) => {
                        if (!err && result.rows.length !== 0) {
                            // console.log(result.rows);
                            result.rows.forEach(row => {
                                levels.push(row.module_name);
                            });
                            req.session.levels = levels;
                            req.session.score = score;
                        
                            res.sendFile(__dirname + "/modules.html");
                        }
                    });
                }
            });
        });
    });
});
app.get('/userdata', function(req, res) {
    if (req.session && req.session.user && req.session.password && req.session.courses && req.session.points) {
        res.status(200).json({ username: req.session.user, password: req.session.password, courses: req.session.courses, points: req.session.points }); 
    } else {
        res.status(401).json({ error: 'User not authenticated' }); 
    }
});
app.get('/modulesdata', function(req, res) {
    if (req.session && req.session.user && req.session.levels && req.session.score) {
        res.status(200).json({ username: req.session.user, levels: req.session.levels, score: req.session.score }); 
    } else {
        res.status(401).json({ error: 'User not authenticated' }); 
    }
});
app.get('/lessonsdata', function(req, res) {    
    if (req.session && req.session.user && req.session.lessons && req.session.score) {
        res.status(200).json({ username: req.session.user, lessons: req.session.lessons, score: req.session.score  }); 
    } else {
        res.status(401).json({ error: 'User not authenticated' }); 
    }
});
app.get('/questionsdata', function(req, res) {
    if (req.session && req.session.user && req.session.questions && req.session.answers && req.session.infos ) {
        res.status(200).json({ username: req.session.user, questions: req.session.questions, answers: req.session.answers, infos: req.session.infos }); 
    } else {
        res.status(401).json({ error: 'User not authenticated' }); 
    }
});

app.post("/updatescore", function (req, res) {
    const score  = req.body.Score;
    const lang = req.session.lang;
    const column = lang + "_points"; 

    const user = req.session.user;
    const pass = req.session.password;

    let scoreValue = 0;
    let student_id = 0;
    let finalScore = 0;
  
    // console.log("score ",score);
    client.query(`SELECT * FROM student WHERE username=$1 AND pwd=$2`, [user, pass], (err, result) => {
        if (!err && result.rows.length !== 0) {
            // console.log(result.rows);
            student_id = result.rows[0].student_id;
        } 
        client.query(`SELECT * FROM progress WHERE progress_id=$1`, [student_id], (err, result) => {
            if (!err && result.rows.length !== 0) {
                // console.log(result.rows);
                scoreValue = result.rows[0][column];
                // console.log("scoreValue ",scoreValue);
                if(scoreValue===undefined || scoreValue===null){
                    scoreValue = 0
                }
            } 
            // console.log(score);
            // console.log(scoreValue);
            finalScore = score + scoreValue;
            client.query(`UPDATE progress SET ${column} = ${finalScore} WHERE progress_id = ${student_id}`, (err, result) => {
                if (!err) {
                    res.status(200).send('Score updated successfully.');
                } else {
                    console.error('Error updating score. ');
                    res.status(500).send('Error updating score.');
                }
            });
        });
    });
});
app.post("/login", function (req, res) {
    let user = req.body.username;
    let pass = req.body.password;

    client.query(`SELECT * FROM student WHERE username=$1 AND pwd=$2`, [user, pass], (err, result) => {
        if (!err && result.rows.length !== 0) {
            req.session.user = user; 
            req.session.password = result.rows[0].pwd;
            res.redirect("/home");
        } else {
            console.log(err ? err.message : "Invalid credentials"); 
            res.status(401).send("Invalid credentials"); 
        }
    });
});
app.post("/signup", function (req, res) {
    let user = req.body.username;
    let pass = req.body.password;
    let confPass = req.body.confirm_password;

    if (pass === confPass) {
        client.query(`insert into student (username,pwd) values ($1,$2)`, [user, pass], (err, result) => {
            if (!err) {
                req.session.user = user; 
                req.session.password = pass;
                res.redirect("/home");
            } else {
                console.log(err.message);
                res.redirect("/signup"); 
            }
        });
    } else {
        console.log("password and confirm password fields do not match");
        res.redirect("/signup"); 
    }

});

app.listen(port, function () {
    console.log("Server started at port " + port);
});