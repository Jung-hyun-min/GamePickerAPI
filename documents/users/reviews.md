# Login

**Method** : `GET`

**URL** : `/users/:user_id/reviews`

**Auth required** : `False`

**Data constraints** 
```
Query {
    limit : Limit the number of data,
    offset : Set start index, required 'limit'
}
```

## Success Response

**Code** : `200 OK`

**Content example**
```
[
    {
        id : 1,
        value : "This is the best game I've ever played.",
        grade : 5.0
    },
    {
        id : 2,
        title : "This game is the worst.",
        grade : 0.5
    },
    ...
]
```

## Error Response