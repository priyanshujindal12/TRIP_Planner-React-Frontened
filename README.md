## 🚀 Getting Started: Run This Project on Your Laptop

Follow these steps to set up and run the React frontend locally:

### 1. Prerequisites
- **Node.js & npm**: Download from https://nodejs.org/
- **Git**: (optional) https://git-scm.com/

### 2. Clone or Download the Project
- If using Git:
  ```bash
  git clone <your-repo-url>
  cd Project/react-frontened
  ```
- Or, download ZIP and open a terminal inside `Project/react-frontened`.

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables (for EmailJS and API)
- Create a `.env` file inside `react-frontened`.
- Add (replace with your keys from https://dashboard.emailjs.com/):
  ```env
  EMAILJS_PUBLIC_KEY=your_emailjs_public_key
  EMAILJS_SERVICE_ID=your_emailjs_service_id
  EMAILJS_TEMPLATE_ID=your_emailjs_template_id
  ```

### 5. Start the App
```bash
npm run dev
```
- Open the local URL (like http://localhost:5173) in your browser.

### 6. For Backend/API
- If you have a server, run it as per backend instructions.
- Adjust API URLs in frontend source if needed.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
