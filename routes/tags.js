const express = require('express');
const router = express.Router();

const database = require('../model/pool');

router.get('/', (req, res) => {
    const { id, value } = req.query;
    let query = `SELECT id, value FROM tags `;
    if (id && value)    res.status(400).json({ success: false, message: 'too many query'});
    else if (id)        query += `WHERE id='${id}'`;
    else if (value)     query += `WHERE value='${value}'`;

    database.query(query)
    .then(rows => res.status(200).json({ success: true, tags: rows }))
    .catch(err => res.status(400).json({ success: false, message: err }))
})

router.put('/', (req, res) => {
    const { value } = req.body;
    if (!value)
        return res.status(400).json({ success: false, message: 'body.value is required' })
    database.query(`INSERT INTO tags (value) VALUES ('${value}')`)
    .then(() => res.status(201).json({ success: true }))
    .catch(err => res.status(400).json({ success: false, message: err }))
})

router.delete('/', (req, res) => {
    const { id,value } = req.query;
    let query = `DELETE FROM tags `;
    if (id && value)    res.status(400).json({ success: false, message: 'too many query'});
    else if (id)        query += `WHERE id='${id}'`;
    else if (value)     query += `WHERE value='${value}'`;
    else                res.status(400).json({ success: false, message: 'not enough query'});
    database.query(query)
    .then(() => res.status(200).json({ success: true }))
    .catch(err => res.status(400).json({ success: false, message: err }))
})

module.exports = router;