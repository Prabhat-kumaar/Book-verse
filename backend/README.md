# Book Reading System Backend

Express + MongoDB backend for the Book Reading System.

## Features

- Admin can add books with `title`, `author`, `category`, `pdf`, and `thumbnail`
- API to get all books
- API to get books by category
- API to track user reading progress
- JWT authentication for admin operations

## Setup

1. Install dependencies

```bash
cd backend
npm install
```

2. Create a `.env` file based on `.env.example`

3. Start the server

```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register admin user
- `POST /api/auth/login` - Login and get JWT token

### Books (Protected for admin: add, update, delete)

- `POST /api/books` - Add new book (admin only)
- `GET /api/books` - Fetch all books
- `GET /api/books?category=Fantasy` - Fetch books by category
- `GET /api/books/category/:category` - Fetch books by category
- `PUT /api/books/:id` - Update book (admin only)
- `DELETE /api/books/:id` - Delete book (admin only)

### Reading Progress

- `POST /api/progress` - Track/update user reading progress
- `GET /api/progress?userId=USER_ID` - Get progress for a user

## Authentication

Admin operations require JWT token in header: `Authorization: Bearer <token>`

## MVC Structure

- `models/` - Mongoose schemas
- `controllers/` - Request handlers
- `routes/` - Express routing
- `middleware/` - Auth middleware
- `config/` - Database connection

## Notes

- Uses MongoDB for persistence.
- `MONGO_URI` must be configured in your environment before starting the server.

## Notes

- Uses MongoDB for persistence.
- `MONGO_URI` must be configured in your environment before starting the server.
