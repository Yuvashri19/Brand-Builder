# Brand Builder Studio

**Brand Builder Studio** is a full-stack web application designed to visualize product concepts with extreme design consistency across diverse advertising mediums—including billboards, newspapers, social media posts, and custom outdoor environments. Powered by Google's Gemini models, it crafts synchronized brand specifications and renders pristine, human-free product imagery using Nano-Banana (`gemini-2.5-flash-image`).

---

## Features

- **Product Anatomy Formulation:** Define detailed physical attributes, materials (e.g. brushed steel, matte ceramics), hex color palettes, and aesthetic tone, or choose from curated presets.
- **Consistent Brand Blueprints:** Generates a unified master visual specification and advertising tagline using `gemini-3.5-flash`.
- **Multi-Medium Ideation:**
  - **Billboard** (16:9 widescreen format)
  - **Newspaper** (4:3 editorial format)
  - **Social Post** (1:1 square format)
  - **Custom Scenarios** (e.g., bus shelters, magazine spreads, metro billboards with custom aspect ratios)
- **Strict Negative Human Filtration:** Prompts enforce pristine, isolated product scenes without hands, silhouettes, crowds, or human distraction.
- **Direct Image Rendering:** Generates production-grade visuals via `@google/genai` using `gemini-2.5-flash-image`.
- **Art Direction Controls:** Prompts and creative directions can be inspected and edited live prior to rendering.
- **Asset Export & Lightbox:** In-browser full-screen high-resolution preview modal with instant one-click PNG downloads.

---

## Tech Stack

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Backend:** [Node.js](https://nodejs.org/), [Express](https://expressjs.com/), [tsx](https://github.com/privatenumber/tsx), [esbuild](https://esbuild.github.io/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **AI SDK:** [@google/genai](https://www.npmjs.com/package/@google/genai)
  - `gemini-3.5-flash` (brand specification and tailored prompt synthesis)
  - `gemini-2.5-flash-image` (high-fidelity image generation)

---

## Project Structure

```text
├── assets/             # Project assets
├── src/
│   ├── App.tsx         # Main interactive Brand Builder workspace
│   ├── index.css       # Tailwind CSS imports & custom typography
│   └── main.tsx        # React DOM entry point
├── server.ts           # Express server & Gemini API proxy endpoints
├── index.html          # HTML entry point
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies and scripts
├── .env.example        # Environment variable template
└── .gitignore          # Git exclusion rules
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended) or [Bun](https://bun.sh/)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <YOUR-REPOSITORY-URL>
   cd <YOUR-REPOSITORY-NAME>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy the example environment file and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set:
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   ```

### Running Locally

- **Development Mode:**
  Starts the Express server with Vite middleware on port 3000:
  ```bash
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Production Build:**
  Compiles the client assets with Vite and bundles the server using esbuild:
  ```bash
  npm run build
  npm start
  ```

- **Type Check / Linting:**
  ```bash
  npm run lint
  ```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key used for brand specs and image rendering. |
| `APP_URL` | No | Base application URL (automatically provided in hosted environments). |
| `PORT` | No | Server port (defaults to `3000`). |

---

## License

This project is licensed under the MIT License.
