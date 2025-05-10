# ZOG Store Backend

Backend server for the ZOG Game Store application - a full-featured e-commerce platform for video games.

## Features

- User authentication and authorization with role-based access control
- Game catalog with search, filtering, and detailed game information
- Shopping cart functionality with stock quantity validation
- Order processing and history
- Admin dashboard with sales analytics
- User, product, and order management for administrators

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
