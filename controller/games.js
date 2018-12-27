const express = require('express');
const router = express.Router();
const db = require('../model/database');

router.get('/', (req, res) => {
    const { limit, offset } = req.query;
    const { success, fail } = require('./common')(res);
    const { sort } = req.query;
    
    const getAllGames = () => new Promise((resolve, reject) => {
        let sql = `
        SELECT 
            games.id, 
            title, 
            developer, 
            publisher, 
            updated_at, 
            GROUP_CONCAT(DISTINCT game_images.link) AS images, 
            GROUP_CONCAT(DISTINCT game_videos.link) AS videos, 
            GROUP_CONCAT(DISTINCT game_tags.tag_id) AS tags, 
            GROUP_CONCAT(DISTINCT platforms.value) AS platforms,
            AVG(game_reviews.score) AS score,
            COUNT(game_reviews.score) AS rate_count
        FROM 
            games
            LEFT JOIN game_images
            ON games.id = game_images.game_id
            LEFT JOIN game_videos
            ON games.id = game_videos.game_id
            LEFT JOIN game_tags
            ON games.id = game_tags.game_id
            LEFT JOIN game_platforms
            ON games.id = game_platforms.game_id
            LEFT JOIN platforms
            ON game_platforms.platform_id = platforms.id
            LEFT JOIN game_reviews
            ON game_reviews.game_id = games.id
        GROUP BY games.id
            `
        const option = [];
        if (limit) {
            sql += ` LIMIT ?`
            option.push(Number(limit))
            if (offset) {
                sql += ` OFFSET ?`
                option.push(Number(offset))
            }
        }
        switch (sort) {
            case "random":
                sql += ` ORDER BY RAND()`
                break;
        
            default:
                break;
        }
        db.query(sql,option)
        .then(rows => {
            rows.map(row => {
                row.images = row.images===null?[]:row.images.split(',');
                row.videos = row.videos===null?[]:row.videos.split(',');
                row.tags = row.tags===null?[]:row.tags.split(',');
                row.platforms = row.platforms===null?[]:row.platforms.split(',');
            })
            resolve({
                code: 200,
                data: {
                    games: rows
                }
            })
        }).catch(reject)
    })

    getAllGames().then(success).catch(fail);
});

router.get('/:game_id', (req, res) => {
    const { game_id } = req.params;
    const { success, fail } = require('./common')(res);
    
    const getGame = () => new Promise((resolve, reject) => {
        let sql = `
        SELECT 
            games.id, 
            title, 
            developer, 
            publisher, 
            summary,
            age_rate,
            updated_at, 
            GROUP_CONCAT(DISTINCT game_images.link) AS images, 
            GROUP_CONCAT(DISTINCT game_videos.link) AS videos, 
            GROUP_CONCAT(DISTINCT game_tags.tag_id) AS tags, 
            GROUP_CONCAT(DISTINCT platforms.value) AS platforms,
            AVG(game_reviews.score) AS score,
            COUNT(game_reviews.score) AS rate_count
        FROM 
            games
            LEFT JOIN game_images
            ON games.id = game_images.game_id
            LEFT JOIN game_videos
            ON games.id = game_videos.game_id
            LEFT JOIN game_tags
            ON games.id = game_tags.game_id
            LEFT JOIN game_platforms
            ON games.id = game_platforms.game_id
            LEFT JOIN platforms
            ON game_platforms.platform_id = platforms.id
            LEFT JOIN game_reviews
            ON game_reviews.game_id = games.id
        WHERE games.id = ?
        GROUP BY games.id`
        const option = [game_id];
        db.query(sql,option)
        .then(rows => {
            if (rows.length === 0) {
                reject({
                    code: 404,
                    data: {
                        message: 'Game not found'
                    }
                })
            } else {
                rows.map(row => {
                    row.images = row.images===null?[]:row.images.split(',');
                    row.videos = row.videos===null?[]:row.videos.split(',');
                    row.tags = row.tags===null?[]:row.tags.split(',');
                    row.platforms = row.platforms===null?[]:row.platforms.split(',');
                })
                resolve({
                    code: 200,
                    data: {
                        game: rows[0]
                    }
                })
            }
        }).catch(reject)
    })

    getGame().then(success).catch(fail);
})

//FIXME: transaction required
router.post('/', (req, res) => {
    const { id } = req.params;
    const token = req.headers['x-access-token'];
    const { title, developer, publisher, summary, age_rate } = req.body;
    const { adminAuth, decodeToken, success, fail } = require('./common')(res);
    const { images, videos, tags, platforms } = req.body;

    const createGame = () => new Promise((resolve, reject) => {
        ['title', 'developer', 'publisher', 'summary', 'age_rate'].forEach(key => {
            if (req.body[key] === undefined) {
                reject({
                    code: 400,
                    data: {
                        message: `${key} is required`
                    }
                })
            }
        })

        ['images', 'videos', 'tags', 'platforms'].forEach(key => {
            if (req.body[key] === []) {
                reject({
                    code: 400,
                    data: {
                        message: `At least one ${key} is required`
                    }
                })
            }
        })
        db.query(`INSERT INTO games (title, developer, publisher, summary, age_rate) VALUES (?, ?, ?, ?, ?)`[title, developer, publisher, summary, age_rate])
        .then(rows => {
            resolve(rows.insertId)
        }).catch(reject)
    })

    const insertImages = (game_id) => new Promise((resolve, reject) => {
        let sql = "INSERT INTO game_images (game_id, link) VALUES ";
        const option = [];
        images.forEach(image => {
            sql += `(?, ?),`
            option.push(game_id, image);
        })
        sql = sql.substring(0, sql.length-1);
        db.query(sql, option)
        .then(rows => {
            resolve(game_id)
        }).catch(reject)
    })

    const insertVideos = (game_id) => new Promise((resolve, reject) => {
        let sql = "INSERT INTO game_videos (game_id, link) VALUES ";
        const option = [];
        videos.forEach(video => {
            sql += `(?, ?),`
            option.push(game_id, video);
        })
        sql = sql.substring(0, sql.length-1);
        db.query(sql, option)
        .then(rows => {
            resolve(game_id)
        }).catch(reject)
    })

    const insertTags = (game_id) => new Promise((resolve, reject) => {
        let sql = `INSERT INTO game_tags (game_id, tag_id) VALUES `
        const option = [];
        tags.forEach(tag => {
            sql +=`(?, (SELECT id FROM tags WHERE value = ?))`
            option.push(game_id, tag)
        })
        sql = sql.substring(0, sql.length-1);
        db.query(sql, option)
        .then(rows => {
            resolve(game_id)
        }).catch(reject)
    })

    const insertPlatforms = (game_id) => new Promise((resolve, reject) => {
        let sql = `INSERT INTO game_platforms (game_id, tag_id) VALUES `
        const option = [];
        platforms.forEach(platform => {
            sql +=`(?, (SELECT id FROM platforms WHERE value = ?))`
            option.push(game_id, platform)
        })
        sql = sql.substring(0, sql.length-1);
        db.query(sql, option)
        .then(rows => {
            resolve(game_id)
        }).catch(reject)
    })

    decodeToken(token).then(adminAuth)
    .then(createGame)
    .then(insertImages)
    .then(insertVideos)
    .then(insertTags)
    .then(insertPlatforms)
    .then(success).catch(fail);
})

router.put('/:game_id', (req, res) => {

})

router.delete('/:game_id', (req, res) => {
    const token = req.headers['x-access-token'];
    const { game_id } = req.params;
    const { decodeToken ,adminAuth, success, fail } = require('./common')(res);

    const deleteGame = () => new Promise((resolve, reject) => {
        db.query(`DELETE FROM games WHERE id = ?`,[game_id])
        .then(rows => {
            if (rows.affectedRows === 0) {
                reject({
                    code: 404,
                    data: {
                        message: 'Game not found'
                    }
                })
            } else {
                resolve({
                    code: 204
                })
            }
        }).catch(reject)
    })

    decodeToken(token).then(adminAuth).then(deleteGame).then(success).catch(fail);
})

router.post('/:game_id/reviews', (req, res) => {
    const { decodeToken, success, fail } = require('./common')(res);
    const { game_id } = req.params;
    const { value, score } = req.body;
    const token = req.headers['x-access-token'];

    const createReview = (user_id) => new Promise((resolve, reject) => {
        let sql = `
        INSERT INTO game_reviews (game_id, value, score)
        SELECT ?, ?, ? FROM DUAL
        WHERE NOT EXISTS (SELECT * FROM game_reviews WHERE user_id = ?)
        `
        const option = [game_id, value, score, user_id];
        db.query(sql, option)
        .then(rows => {
            if (rows.affectedRows === 0) {
                reject({
                    code: 400,
                    data: {
                        message: "Already write review this game"
                    }
                })
            } else {
                resolve({
                    code: 204
                })
            }
        }).catch(reject)
    })

    decodeToken(token).then(createReview).then(success).catch(fail);
})

router.get('/:game_id/reviews', (req, res) => {
    const { game_id } = req.params;
    const { success, fail } = require('./common')(res);
    const { limit, offset } = req.query;

    const readReviews = () => new Promise((resolve, reject) => {
        let sql = `
        SELECT game_reviews.id, name, value, score
        FROM
            game_reviews
            LEFT JOIN users ON game_reviews.user_id = users.id
        WHERE game_id = ?
        `
        const option = [game_id]
        if (limit) {
            sql += ` LIMIT ?`;
            option.push(Number(limit));
            if (offset) {
                sql += ` OFFSET ?`;
                option.push(Number(offset));
            }
        }
        db.query(sql, option)
        .then(rows => {
            resolve({
                code: 200,
                data: {
                    reviews: rows
                }
            })
        }).catch(reject)
    })

    readReviews().then(success).catch(fail);
})

router.put('/:game_id/reviews/:review_id', (req, res) => {
    const { game_id, review_id } = req.params;
    const token = req.headers['x-access-token'];
    const { decodeToken, success, fail } = require('./common')(res);

    const updateReview = (user_id) => new Promise((resolve, reject) => {
        let sql = `
        UPDATE FROM game_reviews SET ~~~ WHERE id = ? AND game_id = ?`
        const option = [];
        let set_string = "";
        ["value", "score"].forEach(key => {
            const item = req.body[key];
            if (item) {
                set_string += `${key} = ?,`
                option.push(item)
            }
        })
        option.push(review_id, game_id, user_id);
        set_string = set_string.substring(0, set_string.length-1);

        db.query(`UPDATE FROM game_reviews SET ${set_string} WHERE id = ? AND game_id = ?, user_id = ?`, option)
        .then(rows => {
            if (rows.affectedRows === 0) {
                reject({
                    code: 404,
                    data: {
                        message: 'Review not found'
                    }
                })
            } else {
                resolve({
                    code: 204
                })
            }
        }).catch(reject)
    })

    decodeToken(token).then(updateReview).then(success).catch(fail);
})

router.delete('/:game_id/reviews/:review_id', (req, res) => {
    const { game_id, review_id } = req.params;
    const { decodeToken, success, fail } = require('./common')(res);

    const deleteReview = (user_id) => new Promise((resolve, reject) => {
        db.query(`DELETE FROM game_reviews WHERE user_id = ? AND game_id = ? AND id = ?`,[user_id, game_id, review_id])
        .then(rows => {
            if (rows.affectedRows === 0) {
                reject({
                    code: 404,
                    data: {
                        message: "Review not found"
                    }
                })
            } else {
                resolve({
                    code: 204
                })
            }
        }).catch(fail);
    })
})

router.post('/:game_id/favor', (req, res) => {
    const token = req.headers['x-access-token'];
    const { decodeToken, success, fail } = require('./common')(res);
    const { game_id } = req.params;

    const enrollFavor = (user_id) => new Promise((resolve, reject) => {
        db.query(`INSERT INTO favor (user_id, game_id) 
        SELECT ?, ? FROM dual 
        WHERE NOT EXISTS (
            SELECT * FROM favor WHERE user_id = ? AND game_id = ?
        )`,[user_id, game_id, user_id, game_id])
        .then(rows => {
            if (rows.affectedRows === 0) {
                reject({
                    code: 400,
                    data: {
                        message: 'Already favorite this game'
                    }
                })
            } else {
                resolve({
                    code: 204
                })
            }
        }).catch(reject)
    })

    decodeToken(token).then(enrollFavor).then(success).catch(fail)
})

module.exports = router;