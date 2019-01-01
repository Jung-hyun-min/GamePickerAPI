# Get all notice

**Method** : `GET`

**URL** : `/admin/notices`

**Auth required** : `False`

**Data constraints** 
```
Query {
    limit : Limit the number of data,
    offset : Set start index, required 'limit',
    sort: {
        random: Loads the game in random order
    }
}
```

## Success Response

**Code** : `200 OK`

**Content example**
```
{
    notices: [
        {
            id: 1,
            title: "First notice",
            value: "My first notice",
            created_at: "2018-10-04T12:39:39.000Z"
        },
        ...
    ]
}
```

## Error Response
```
NULL
```