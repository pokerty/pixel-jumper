# Pixel Jumper

A retro-themed endless runner game built with React and TypeScript. Jump across procedurally generated platforms, collect coins, avoid falling, and unlock cool skins!
![pixel-jumper](https://github.com/user-attachments/assets/d8d33f77-73e3-4ad4-b39c-3b524fe1e699)

## Features

*   **Endless Runner:** Classic side-scrolling gameplay where the goal is to survive as long as possible.
*   **Procedural Generation:** Platforms, coins, and power-ups are generated on the fly, making each run unique.
*   **Character Skins:** Unlock and select different character skins using in-game currency.
*   **Daily Challenges:** Complete daily objectives for coin rewards.
*   **In-Game Shop:** Purchase items like extra lives (revives) with collected coins.
*   **Power-ups:** Collect temporary boosts like higher jumps, slow motion, and shields.
*   **Combo System:** Earn bonus points for landing perfectly on platforms.
*   **Retro Aesthetics:** Pixelated graphics and classic sound effects combined with modern mechanics.
*   **Persistent Progress:** High scores, total coins, unlocked skins, and revives are saved locally.

## Gameplay

*   **Objective:** Run as far as possible by jumping from platform to platform without falling off the screen.
*   **Controls:**
    *   Press `SPACE` key to jump.
    *   Tap the screen on mobile devices to jump.
*   **Double Jump:** You can jump a second time while in mid-air.
*   **Perfect Landings:** Landing smoothly on a platform initiates and increases a combo multiplier for extra points.
*   **Coins:** Collect golden coins scattered throughout the level. Use them in the Shop and to unlock Skins.
*   **Power-ups:** Grab icons for temporary advantages (Jump Boost, Slow Motion, Shield).
*   **Special Platforms:** Watch out for moving and disappearing platforms!

## Getting Started

This project was bootstrapped with Vite.

### Prerequisites

*   Node.js (v16 or later recommended)
*   npm or yarn

### Installation & Running

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <your-repository-url>
    cd pixel-jumper
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will usually start the game on `http://localhost:5173` (or another port if 5173 is busy). Open this URL in your web browser.

### Building for Production

```bash
npm run build
# or
yarn build
```
This command builds the app for production to the `dist` folder.

## Technology Stack

*   **React:** JavaScript library for building user interfaces.
*   **TypeScript:** Typed superset of JavaScript.
*   **Vite:** Fast front-end build tool and development server.
*   **Tailwind CSS (Implicit):** Based on the class names used (e.g., `bg-gray-900`, `flex`, `rounded-lg`), it seems Tailwind CSS is used for styling. _(Add `tailwindcss` to `package.json` if not already present)_

## Future Improvements (Suggestions)

*   Add more power-up types (e.g., Coin Magnet, Invincibility).
*   Introduce enemy obstacles.
*   Expand the Shop with more items or cosmetic upgrades.
*   Implement different background themes.
*   Add more complex platform generation patterns.
*   Leaderboards (requires a backend).

## Contributing
Pokerty

## License
None
