# ZOG Store Backend

Backend server for the ZOG Game Store application.

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
- `GET /dashboard/sales-chart?period=X` - Get sales data over time (daily, weekly, monthly)
- `GET /dashboard/top-games?limit=X` - Get top selling games

### Admin API (Admin Only)
- `POST /admin/games` - Add a new game
- `PUT /admin/games/:gameId` - Update game details
- `DELETE /admin/games/:gameId` - Delete a game
- `POST /admin/inventory` - Update game inventory
- `GET /admin/users` - Get all users
- `PUT /admin/users/:userId` - Update user role

## Role-Based Access
- Regular Users: Can browse games, add to cart, place orders, and view order history
- Admin Users: Can access dashboard, manage games, inventory, and user roles

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
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
4. Start the server: `npm start`
