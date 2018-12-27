# View post

**Method** : `GET`

**URL** : `/posts/:post_id`

**Auth required** : `False`

**Data constraints** 
```
NULL
```

## Success Response

**Code** : `200 OK`

**Content example**
```
{
    post : {
        "id": 1,
        "title": "post sample",
        "name": "user_a",
        "views": 0,
        "updated_at": "2018-12-20T23:35:26.000Z"
    }
}
```

## Error Response

**Condition** : There is no matching post with 'post_id'

**Code** : `404 Not Found`

**Content**

```
{
    message: "Post not found"
}
```