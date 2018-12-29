const express = require('express');
const router = express.Router();
const db = require('../model/database');
const jwt = require('../model/jwt');
const nodemailer = require('nodemailer');
const mail_config = require('../config/mail');
const pbkdf2Password = require('pbkdf2-password');
const hasher = pbkdf2Password(); 

router.post('/login', async (req, res) => {
    const { email, password, os_type, reg_id } = req.body;
    const { success, fail } = require('./common')(res);
    const { admin } = req.query;

    const getUser = (email) => new Promise((resolve, reject) => {
        db.query(`SELECT salt, id, active, password FROM users WHERE email = ?`,[email])
        .then(rows => {
            if (rows.length === 0) {
                reject({ code: 404, data: { message: "User not found" } })
            } else {
                resolve(rows[0])
            }
        }).catch(reject);
    })

    const checkPassword = (user) => new Promise((resolve, reject) => {
        hasher({ password: password, salt: user.salt }, (err, pass, salt, hash) => {
            if (hash !== user.password) {
                reject({code:400, data: { message: "Incorrect password"} })
            } else {
                resolve(hash);
            }
        })
    })

    const checkMailAuth = (user) => new Promise((resolve, reject) => {
        if (user.active) {
            resolve()
        } else {
            reject({ code: 400, data: { message: "Mail authentication required"} })
        }
    })

    const checkAdmin = (user) => new Promise((resolve, reject) => {        
        db.query(`SELECT user_id FROM admin WHERE user_id = ?`,[user.id])
        .then(rows => {
            if (rows.length === 0) {
                reject({ code: 404, data: { message: "Admin not found" } })
            } else {
                resolve();
            }
        }).catch(reject)
    })

    const login = (user) => new Promise((resolve ,reject) => {
        db.query(`UPDATE users SET os_type = ?, reg_id = ? WHERE id = ?`,[os_type, reg_id, user.id])
        resolve({
            code: 200,
            data: {
                user_id: user.id,
                token: jwt.encode({
                    email: email,
                    password: user.hash
                })
            }
        })
    })

    try {
        const user = await getUser(email);
        user.hash = await checkPassword(user);        
        await checkMailAuth(user);
        if (admin)
            await checkAdmin(user);        
        const json = await login(user);        
        success(json)
    } catch (err) {
        fail(err);
    }
})

//FIXME: transaction required
router.post('/register', (req, res) => {
    const { name, email, password, birthday, gender } = req.body;
    const { success, fail } = require('./common')(res);

    const createUser = () => new Promise((resolve, reject) => {
        hasher({password: password}, (err, pass, salt, hash) => {
            db.query('INSERT INTO users(name, email, password, birthday, gender, salt) VALUES (?, ?, ?, ?, ?, ?)', [name, email, hash, birthday, gender, salt])
            .then(rows => {
                const token = jwt.encode({
                    email: email,
                    password: hash
                })
                resolve(token);
            }).catch(reject)
        })
    })

    const sendMail = (token) => new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: mail_config.user,
                pass: mail_config.pass
            }
        })
        const mailOptions = {
            from: mail_config.user,
            to: email,
            subject: 'GamePicker 인증',
            html: `<p>Test</p><a href='http://api.gamepicker.co.kr/auth/activate?token=${token}'>인증하기</a>`
        }
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                reject({
                    code: 500,
                    data: {
                        message: "Failed to send authentication mail. Please contact the developer"
                    }
                })
            } else {
                resolve({
                    code: 204
                })
            }
            transporter.close();
        })
    })

    createUser().then(sendMail).then(success).catch(fail);
})

//FIXME: change redirect link
router.get('/activate', (req, res) => {
    const { token } = req.query;
    const { email, password } = jwt.decode(token);    
    db.query('UPDATE users SET active = 1 WHERE email = ? AND password = ?',[email, password])
    .then(rows => {
        if (rows.affectedRows === 0) {
            res.status(404).json({ message: 'user not found' });
        } else {
            res.status(301).redirect('http://www.gamepicker.co.kr')
        }
    }).catch(err => {
        res.status(500).json({ message: err.sqlMessage });
    })
})

module.exports = router;