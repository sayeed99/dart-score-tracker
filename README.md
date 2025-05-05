# Dart Score Tracker

A comprehensive dart score management platform that allows users to track their dart game scores, maintain game history, and analyze performance over time.

## Features

- **User Authentication**: Secure login and registration system
- **Game Score Tracking**: Real-time score tracking during games
- **Game History**: View past games and performance metrics
- **Multiple Game Modes**: Support for various game rules (501, 301, etc.)
- **User Profiles**: Personalized user profiles with statistics
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MySQL with Drizzle ORM
- **Authentication**: NextAuth.js
- **Styling**: TailwindCSS with dark theme
- **Deployment**: Ready for Netlify deployment

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Bun (v1.0 or higher)
- MySQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dart-score-tracker.git
   cd dart-score-tracker
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   # Database Configuration
   DATABASE_HOST=localhost
   DATABASE_USER=root
   DATABASE_PASSWORD=yourpassword
   DATABASE_NAME=dart_score_tracker

   # NextAuth Configuration
   NEXTAUTH_SECRET=yoursecretkey
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Create the database schema:
   ```bash
   bun db:push
   ```

5. Start the development server:
   ```bash
   bun run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Registration/Login**: Create an account or log in to your existing account
2. **Dashboard**: View your game statistics and recent games
3. **New Game**: Start a new game with customizable rules
4. **Game History**: View your past games and detailed statistics
5. **Profile**: Update your profile and account settings

## Database Schema

The application uses the following database schema:

- **users**: User accounts and authentication
- **games**: Game records and settings
- **players_games**: Join table for players in each game
- **rounds**: Round information for each game
- **scores**: Score records for each round

## API Endpoints

The application provides the following API endpoints:

- **Auth API**:
  - `POST /api/auth/register`: Register a new user
  - `GET/POST /api/auth/[...nextauth]`: NextAuth.js authentication

- **User API**:
  - `PUT /api/user/profile`: Update user profile
  - `PUT /api/user/password`: Update user password

- **Game API** (to be implemented):
  - `POST /api/games`: Create a new game
  - `GET /api/games`: Get user's games
  - `GET /api/games/:id`: Get game details

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deployment

The application is configured for easy deployment to Netlify. Simply connect your GitHub repository to Netlify, and it will automatically deploy your application.

## License

MIT

## Contact

For any questions or suggestions, please open an issue in the GitHub repository.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
