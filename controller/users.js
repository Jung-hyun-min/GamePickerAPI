const express = require('express');
const router = express.Router();
const db = require('../model/database');

router.get('/:user_id', (req, res) => {
    const { user_id } = req.params;
    const { success, fail } = require('./common')(res);

    const getUser = () => new Promise((resolve, reject) => {
        db.query(`SELECT name, email, birthday, introduce, gender, points FROM users WHERE id = ?`,[user_id])
        .then(rows => {
            if (rows.length === 0) {
                reject({
                    code: 404,
                    data: {
                        message: 'User not found'
                    }
                })
            } else {
                resolve({
                    code: 200,
                    data: {
                        user: rows[0]
                    }
                })
            }
        }).catch(reject)
    })

    getUser().then(success).catch(fail);
});

router.put('/:user_id', (req, res) => {
    const token = req.headers['x-access-token'];
    const u_id = req.params.user_id;
    const { introduce } = req.body;
    const { decodeToken, success, fail } = require('./common')(res);

    const updateUser = (user_id) => new Promise((resolve, reject) => {
        if (user_id!= u_id) {
            reject({
                code: 401,
                data: {
                    message: 'Authentication failed'
                }
            })
        } else {
            db.query(`UPDATE users SET introduce = ? WHERE user_id = ?`,[introduce, user_id])
            .then(rows => {
                if (rows.affectedRows === 0) {
                    reject({
                        code: 404,
                        data: {
                            message: "User not found"
                        }
                    })
                } else {
                    resolve({
                        code: 204
                    })
                }
            })
        }
    })

    decodeToken(token).then(updateUser).then(success).catch(fail);
})

router.get('/:user_id/posts', (req, res) => {
    const { user_id } = req.params;
    const { limit, offset } = req.query;
    const { success, fail } = require('./common')(res);
    const option = [user_id];
    let sql = 'SELECT id, title FROM posts WHERE user_id = ?';

    if (limit) {
        sql += ' LIMIT ?'
        option.push(Number(limit));
        if (offset) {
            sql += ' OFFSET ?';
            option.push(Number(offset));
        }
    }

    const getUserPosts = () => new Promise((resolve, reject) => {
        db.query(sql,option)
        .then(rows => {
            resolve({
                code: 200,
                data: {
                    posts: rows
                }
            })
        }).catch(reject)
    })

    getUserPosts().then(success).catch(fail);
})

router.get('/:user_id/posts/comments', (req, res) => {
    const { user_id } = req.params;
    const { limit, offset } = req.query;
    const { success, fail } = require('./common')(res);
    const option = [user_id];
    let sql = 'SELECT id, value FROM post_comments WHERE user_id = ?';

    if (limit) {
        sql += ' LIMIT ?'
        option.push(Number(limit));
        if (offset) {
            sql += ' OFFSET ?';
            option.push(Number(offset));
        }
    }

    const getUserComments = () => new Promise((resolve, reject) => {
        db.query(sql,option)
        .then(rows => {
            resolve({
                code: 200,
                data: {
                    comments: rows
                }
            })
        }).catch(reject)
    })
    
    getUserComments().then(success).catch(fail);
})

router.get('/:user_id/reviews', (req, res) => {
    const { user_id } = req.params;
    const { limit, offset, game_id } = req.query;
    const { success, fail } = require('./common')(res);
    const option = [user_id];
    let sql = 'SELECT id, value, score FROM game_reviews WHERE user_id = ?';
    if (game_id) {
        sql += ` AND game_id = ?`
        option.push(game_id)
    }

    if (limit) {
        sql += ' LIMIT ?'
        option.push(Number(limit));
        if (offset) {
            sql += ' OFFSET ?';
            option.push(Number(offset));
        }
    }

    const getUserReviews = () => new Promise((resolve, reject) => {
        db.query(sql,option)
        .then(rows => {
            resolve({
                code: 200,
                data: {
                    reviews: rows
                }
            })
        }).catch(reject)
    })

    getUserReviews().then(success).catch(fail);
})

router.get('/:user_id/games/rating', (req, res) => {
    const { user_id } = req.params;
    const { success, fail } = require('./common')(res);

    const getUserRating = () => new Promise((resolve, reject) => {
        const sql = `
        SELECT game_reviews.game_id, AVG(score) AS score, JSON_ARRAYAGG(tag_id) AS tags
        FROM game_reviews 
            LEFT JOIN game_tags ON game_tags.game_id = game_reviews.game_id
        WHERE game_reviews.user_id = ?
        GROUP BY game_reviews.game_id
        `
        db.query(sql,[user_id]).then(rows => {
            rows.map(row => {
                if (row.tags[0] === null) {
                    row.tags = [];
                }
            })
            resolve({
                code: 200,
                data: {
                    data: rows
                }
            })
        }).catch(reject)
    })
    getUserRating().then(success).catch(fail);
})

module.exports = router;