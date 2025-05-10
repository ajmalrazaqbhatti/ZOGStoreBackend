# ZOG Store Backend

Backend server for the ZOG Game Store application - a full-featured e-commerce platform for video games.

## Features

- User authentication and authorization with role-based access control
- Game catalog with search, filtering, and detailed game information
- Shopping cart functionality with stock quantity validation
- Order processing and history
- Admin dashboard with sales analytics
- User, product, and order management for administrators

## Project Structure

```
ZOGStoreBackend/
├── routes/              # API routes
│   ├── admin.js         # Admin routes for store management
│   ├── auth.js          # Authentication routes
│   ├── cart.js          # Shopping cart routes
│   ├── dashboard.js     # Dashboard and analytics routes
│   ├── games.js         # Game catalog routes
│   └── orders.js        # Order processing routes
├── middleware/          # Express middleware functions
│   └── auth.js          # Authentication middleware
├── database/            # Database documentation
│   └── readme.md        # Database schema documentation
├── .env                 # Environment variables (not in repository)
├── db.js                # Database connection configuration
├── server.js            # Main application entry point
└── README.md            # Project documentation
```

## Documentation

### Authentication Flow

1. **Registration**: Users register with username, email, and password
   - Passwords are hashed with bcrypt before storage
   - Default role is "user"

2. **Login**: Users authenticate with email/username and password
   - On successful login, a session is created
   - Session contains user ID and role

3. **Authorization**: Routes are protected based on user role
   - `isAuthenticated` middleware verifies valid session
   - `isAdmin` middleware checks for admin role

### Database Schema

The application uses a relational database with the following main tables:

- **users**: Store user account information
- **games**: Game catalog with details and pricing
- **inventory**: Track stock quantities for each game
- **cart**: Users' shopping cart items
- **orders**: Order header information
- **order_items**: Individual items in each order
- **payments**: Payment information for orders

### Error Handling

The application implements centralized error handling with:
- Appropriate HTTP status codes
- Consistent error response format
- Detailed logging for troubleshooting

## API Endpoints

### Games API (Public Access with Authentication)
- `GET /games` - Get all games
- `GET /games/filter?genre=X` - Filter games by genre
- `GET /games/genres` - Get all genres
- `GET /games/search?title=X` - Search games by title
- `GET /games/:gameId` - Get specific game details

### Auth API
- `POST /auth/signup` - Register a new user
- `POST /auth/login` - Login user
- `GET /auth/logout` - Logout user
- `GET /auth/status` - Check authentication status

### Cart API (Regular Users Only)
- `GET /cart` - Get cart items
- `GET /cart/count` - Get cart item count
- `POST /cart/add` - Add item to cart
- `POST /cart/update` - Update cart item quantity
- `POST /cart/remove` - Remove cart item
- `DELETE /cart` - Clear cart

### Orders API (Regular Users Only)
- `POST /orders/create` - Create a new order
- `GET /orders` - Get user orders

### Dashboard API (Admin Only)
- `GET /dashboard/stats` - Get overall statistics (users, games, orders, sales)
- `GET /dashboard/top-games?limit=X` - Get top selling games

### Admin API (Admin Only)
- Game Management
  - `POST /admin/games/insert` - Add a new game
  - `PUT /admin/games/update/:gameId` - Update game details
  - `DELETE /admin/games/delete/:gameId` - Delete a game

- Inventory Management
  - `GET /admin/inventory` - Get all inventory
  - `PUT /admin/inventory/:gameId` - Update game inventory

- Order Management
  - `GET /admin/orders` - Get all orders with details
  - `PUT /admin/orders/:orderId/status` - Update order status
  - `DELETE /admin/orders/:orderId` - Delete an order

- User Management
  - `GET /admin/users` - Get all users
  - `GET /admin/users/search?query=X` - Search users by username or email
  - `PUT /admin/users/:userId` - Update user information
  - `PUT /admin/users/:userId/password` - Update user password
  - `DELETE /admin/users/:userId` - Delete a user

## Role-Based Access
- Regular Users: Can browse games, add to cart, place orders, and view order history
- Admin Users: Can access dashboard, manage games, inventory, orders, and user roles

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=gamestore
   KEY=your_session_secret_key
   ```
4. Start the server:
   ```
   npm start
   ```
   For development with auto-reload:
   ```
   npm run dev
   ```

## Technologies Used
- Node.js
- Express.js
- MySQL
- bcrypt for password hashing
- express-session for authentication
