<div align="center">
  <img src="[public/banner.png](https://raw.githubusercontent.com/nguyenngocphung2000/nothing-teledrive/refs/heads/main/public/banner.svg)" alt="Teledrive Logo" width="120" />

  <h1>Nothing Teledrive</h1>
  <p><b>Transform your Telegram Saved Messages and Chats into an Infinite, High-Performance Cloud Drive.</b></p>
</div>

<br/>

**Nothing Teledrive** is a frontend-only React + Vite project that leverages Telegram's MTProto API (via GramJS) to turn any Telegram chat into a file storage system. Built with performance and elegance in mind.

## ✨ Key Features

- **Infinite Free Cloud Storage**: Utilize Telegram's unlimited server storage to store files up to 2GB each.
- **Progressive Blur-up Images**: Previews load instantly using an ultra-low resolution placeholder (Skeleton/Blurred) cached in IndexedDB, progressively transitioning to High-Resolution thumbnails to provide a buttery-smooth user experience.
- **Throttled Promise API Queue**: Robustly manages aggressive rate limits (15 requests/sec max) and intelligently implements Fault Tolerance by capturing `429 Too Many Requests` or `FLOOD_WAIT` events to pause API pipelines transparently.
- **Virtual Scrolling**: Optimized memory footprint. Efficiently destroys and rebuilds DOM bindings as thumbnails enter/leave the viewport. Prevents browser crashes specifically through automated Garbage Collection using strict `URL.revokeObjectURL()` lifecycles for Blob URLs.
- **Local Caching First**: Persists frequently accessed metadata and thumbnails intelligently into local browser chunks via `localforage` (IndexedDB).
- **Client-Side Heavy, Zero-Server Validation**: No centralized database intercepting data. All API calls traverse directly between your browser and Telegram Servers.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v20+ recommended)
- Your Telegram Account API credentials:
  1. Login to your Telegram core account: https://my.telegram.org.
  2. Navigate to **API development tools** and create a new application.
  3. Note down the **`App api_id`** and **`App api_hash`**.

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/nguyenngocphung2000/nothing-teledrive.git
cd nothing-teledrive
npm install
```

### 3. Environment Variables
Create a `.env` file at the root level and inject your keys:
```env
VITE_TELEGRAM_API_ID=your_api_id
VITE_TELEGRAM_API_HASH=your_api_hash
```

### 4. Running Locally
Spin up the Vite development server:
```bash
npm run dev
```

Visit the designated local port index (typically `http://localhost:5173`).

## 🛠️ Tech Stack & Architecture

- **Core**: React 19, TypeScript
- **Bundler**: Vite
- **Telegram Backend Integration**: [GramJS](https://gram.js.org/) (MTProto Implementation)
- **Styling**: Tailwind CSS, Vanilla CSS
- **Local Storage Manager**: localforage
- **Icons**: Lucide React

## ⚖️ License
[MIT License](LICENSE)
