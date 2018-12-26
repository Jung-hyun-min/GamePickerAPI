const express = require('express');
const router = express.Router();
const db = require('../model/database');

router.get('/', (req, res) => {
    res.render('../views/index.html')
})

router.get('/login', (req, res) => {
    res.render('../views/login.html')
})

router.get('/games', (req, res) => {
    res.render('../views/games.html')
})

router.get('/games/:id', (req, res) => {
    res.render('../views/gameDetail.html');
})

router.get('/push', (req, res) => {
    res.render('../views/push.html')
})

router.get('/working', (req, res) => {
    res.render('../views/working.html')
})

router.post('/questions', (req, res) => {
    const { title, email, value } = req.body;
    const { success, fail } = require('./common')(res);
    const createQuestion = () => new Promise((resolve, reject) => {
        db.query(`INSERT INTO questions (title, email, value) VALUES (?, ?, ?)`,[title, email, value])
        .then(rows => {
            resolve({
                code: 204
            })
        }).catch(reject)
    })  
    createQuestion().then(success).catch(fail);
})

router.get('/questions', (req, res) => {
    const { success, fail } = require('./common')(res);
    const getQuestions = () => new Promise((resolve, reject) => {
        db.query(`SELECT id, title, email, value FROM questions`)
        .then(rows => {
            resolve({
                code: 200,
                data: {
                    questions: rows
                }
            })
        }).catch(reject)
    })
    getQuestions().then(success).catch(fail)
})

router.post('/answer/:question_id', (req, res) => {
    const { question_id } = req.params;
    const { decodeToken, adminAuth, success, fail } = require('./common')(res);
    const { answer } = req.body;
    const token = req.headers['x-access-token'];

    const task = () => new Promise((resolve, reject) => {
        db.query(`UPDATE questions SET answer = ? WHERE id = ?`,[answer, question_id])
        .then(rows => {
            if (rows.affectedRows === 0) {
                reject({
                    code: 404,
                    data: {
                        message: 'Question not found'
                    }
                })
            } else {
                resolve({
                    code: 204
                })
            }
        }).catch(reject)
    })

    decodeToken(token).then(adminAuth).then(task).then(success).catch(fail);
})

module.exports = router;