# Introduction to REST APIs and HTTP Methods

A REST (Representational State Transfer) API is an architectural style for building web services that communicate over HTTP. Each resource is identified by a URI (for example, `/api/courses` or `/api/quizzes`), and clients interact with resources using standard HTTP methods.

## Core HTTP Methods

- **GET**: Retrieves a representation of a resource without modifying server state. GET requests are safe and idempotent.
- **POST**: Creates a new resource on the server, such as registering a student or generating a new quiz draft.
- **PUT / PATCH**: Updates an existing resource. PUT typically replaces the entire resource, whereas PATCH applies partial updates.
- **DELETE**: Removes a specific resource identified by its URI.

## HTTP Status Codes

- **200 OK / 201 Created**: The request succeeded, or a new resource was successfully created.
- **400 Bad Request**: The client sent invalid input or malformed JSON.
- **401 Unauthorized / 403 Forbidden**: Authentication is missing or the user role lacks permission.
- **404 Not Found**: The requested resource does not exist.
- **500 Internal Server Error**: An unexpected failure occurred on the server.

